create or replace function public.accept_pending_workspace_invitation_for_current_user()
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
  where lower(email) = current_email
    and accepted_at is null
    and expires_at >= now()
  order by created_at desc
  limit 1;

  if invite.id is null then
    return null;
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
    jsonb_build_object('entity', 'invitation', 'accepted', true, 'source', 'pending_email_match')
  );

  return invite.workspace_id;
end;
$$;

revoke execute on function public.accept_pending_workspace_invitation_for_current_user() from public;
grant execute on function public.accept_pending_workspace_invitation_for_current_user() to authenticated;
