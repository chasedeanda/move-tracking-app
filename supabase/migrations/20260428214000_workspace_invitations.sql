create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0),
  role public.member_role not null default 'member' check (role = 'member'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index workspace_invitations_workspace_created_idx
  on public.workspace_invitations (workspace_id, created_at desc);

create index workspace_invitations_email_idx
  on public.workspace_invitations (lower(email));

create index workspace_invitations_token_idx
  on public.workspace_invitations (token);

alter table public.workspace_invitations enable row level security;

create policy "Owners can read workspace invitations"
  on public.workspace_invitations for select
  to authenticated
  using (public.is_workspace_owner(workspace_id));

create policy "Owners can create workspace invitations"
  on public.workspace_invitations for insert
  to authenticated
  with check (
    public.is_workspace_owner(workspace_id)
    and invited_by = auth.uid()
  );

create policy "Owners can delete workspace invitations"
  on public.workspace_invitations for delete
  to authenticated
  using (public.is_workspace_owner(workspace_id));

create or replace function public.create_workspace_invitation(
  p_workspace_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_email));
  existing_user_id uuid;
  invitation_token uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'only workspace owners can invite members';
  end if;

  if normalized_email = '' then
    raise exception 'email is required';
  end if;

  select profiles.id
    into existing_user_id
  from public.profiles
  where lower(profiles.email) = normalized_email
  limit 1;

  if existing_user_id is not null
    and public.is_workspace_member(p_workspace_id)
    and exists (
      select 1
      from public.workspace_members
      where workspace_id = p_workspace_id
        and user_id = existing_user_id
    ) then
    raise exception 'That user is already a workspace member.';
  end if;

  insert into public.workspace_invitations (
    workspace_id,
    email,
    role,
    invited_by,
    accepted_at,
    expires_at
  )
  values (
    p_workspace_id,
    normalized_email,
    'member',
    auth.uid(),
    null,
    now() + interval '14 days'
  )
  on conflict (workspace_id, email) do update
    set token = gen_random_uuid(),
        invited_by = auth.uid(),
        accepted_at = null,
        expires_at = now() + interval '14 days',
        created_at = now()
  returning token into invitation_token;

  insert into public.activity_log (workspace_id, actor_id, action, metadata)
  values (
    p_workspace_id,
    auth.uid(),
    'updated',
    jsonb_build_object('entity', 'invitation', 'email', normalized_email)
  );

  return invitation_token;
end;
$$;

create or replace function public.accept_workspace_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invite record;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select lower(profiles.email)
    into current_email
  from public.profiles
  where profiles.id = current_user_id;

  if current_email is null then
    raise exception 'profile not found for current user';
  end if;

  select *
    into invite
  from public.workspace_invitations
  where token = p_token
    and accepted_at is null
  limit 1;

  if invite.id is null then
    raise exception 'invitation not found or already accepted';
  end if;

  if invite.expires_at < now() then
    raise exception 'invitation has expired';
  end if;

  if lower(invite.email) <> current_email then
    raise exception 'this invitation was sent to a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, current_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
    set accepted_at = now()
  where id = invite.id;

  insert into public.activity_log (workspace_id, actor_id, action, metadata)
  values (
    invite.workspace_id,
    current_user_id,
    'updated',
    jsonb_build_object('entity', 'invitation', 'accepted', true)
  );

  return invite.workspace_id;
end;
$$;

revoke execute on function public.create_workspace_invitation(uuid, text) from public;
grant execute on function public.create_workspace_invitation(uuid, text) to authenticated;

revoke execute on function public.accept_workspace_invitation(uuid) from public;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;
