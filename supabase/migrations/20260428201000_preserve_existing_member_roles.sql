create or replace function public.add_workspace_member_by_email(
  p_workspace_id uuid,
  p_email text,
  p_role public.member_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  new_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'only workspace owners can add members';
  end if;

  if p_role <> 'member' then
    raise exception 'new collaborators must be added as members';
  end if;

  select profiles.id
    into target_user_id
  from public.profiles
  where lower(profiles.email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No signed-in user found for that email address.';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, target_user_id, p_role)
  on conflict (workspace_id, user_id) do nothing
  returning id into new_member_id;

  if new_member_id is null then
    select workspace_members.id
      into new_member_id
    from public.workspace_members
    where workspace_members.workspace_id = p_workspace_id
      and workspace_members.user_id = target_user_id;
  end if;

  insert into public.activity_log (workspace_id, actor_id, action, metadata)
  values (
    p_workspace_id,
    auth.uid(),
    'updated',
    jsonb_build_object('entity', 'member', 'member_user_id', target_user_id)
  );

  return new_member_id;
end;
$$;

revoke execute on function public.add_workspace_member_by_email(uuid, text, public.member_role) from public;
grant execute on function public.add_workspace_member_by_email(uuid, text, public.member_role) to authenticated;
