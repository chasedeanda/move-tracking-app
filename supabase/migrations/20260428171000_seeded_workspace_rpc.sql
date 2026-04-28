create or replace function public.create_workspace_with_seed(
  p_name text,
  p_move_date date,
  p_current_address text,
  p_new_address text,
  p_timezone text,
  p_seed_template boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  new_workspace_id := public.create_workspace_with_owner(
    p_name,
    p_move_date,
    p_current_address,
    p_new_address,
    p_timezone
  );

  if p_seed_template then
    with room_seed(name, sort_order) as (
      values
        ('Entry / Front Area', 10),
        ('Living Room', 20),
        ('Kitchen', 30),
        ('Dining Area', 40),
        ('Primary Bedroom', 50),
        ('Kids Room', 60),
        ('Bathroom', 70),
        ('Garage / Storage', 80),
        ('Yard / Outdoor', 90),
        ('Utilities / Admin', 100),
        ('Move Day', 110),
        ('Post-Move', 120)
    )
    insert into public.rooms (workspace_id, name, sort_order)
    select new_workspace_id, room_seed.name, room_seed.sort_order
    from room_seed;

    with task_seed(room_name, title, category, priority, effort, sort_order) as (
      values
        ('Living Room', 'Pack non-essential decor', 'packing'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 10),
        ('Garage / Storage', 'Label boxes by room', 'packing'::public.task_category, 'high'::public.task_priority, 'quick'::public.task_effort, 20),
        ('Primary Bedroom', 'Pack seasonal clothes', 'packing'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 30),
        ('Kitchen', 'Pack pantry overflow', 'packing'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 40),
        ('Entry / Front Area', 'Set aside essentials box', 'packing'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 50),
        ('Living Room', 'Wipe baseboards', 'cleaning'::public.task_category, 'low'::public.task_priority, 'medium'::public.task_effort, 60),
        ('Entry / Front Area', 'Vacuum and mop floors', 'cleaning'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 70),
        ('Kitchen', 'Clean kitchen appliances', 'cleaning'::public.task_category, 'high'::public.task_priority, 'big'::public.task_effort, 80),
        ('Bathroom', 'Clean bathroom surfaces', 'cleaning'::public.task_category, 'high'::public.task_priority, 'medium'::public.task_effort, 90),
        ('Living Room', 'Patch wall holes if needed', 'repairs'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 100),
        ('Utilities / Admin', 'Transfer internet', 'utilities'::public.task_category, 'critical'::public.task_priority, 'medium'::public.task_effort, 110),
        ('Utilities / Admin', 'Update mailing address', 'admin'::public.task_category, 'high'::public.task_priority, 'quick'::public.task_effort, 120),
        ('Utilities / Admin', 'Confirm utility transfer dates', 'utilities'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 130),
        ('Utilities / Admin', 'Update subscriptions and billing address', 'admin'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 140),
        ('Move Day', 'Confirm move-day vehicle or truck', 'move_day'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 150),
        ('Primary Bedroom', 'Donate unused clothes', 'donation'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 160),
        ('Garage / Storage', 'Throw away broken items', 'donation'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 170),
        ('Kids Room', 'Sort kids toys', 'donation'::public.task_category, 'medium'::public.task_priority, 'medium'::public.task_effort, 180),
        ('Garage / Storage', 'Set aside items to sell', 'donation'::public.task_category, 'low'::public.task_priority, 'medium'::public.task_effort, 190),
        ('Move Day', 'Load essentials last', 'move_day'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 200),
        ('Move Day', 'Final room walkthrough', 'move_day'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 210),
        ('Move Day', 'Take final photos if needed', 'move_day'::public.task_category, 'medium'::public.task_priority, 'quick'::public.task_effort, 220),
        ('Move Day', 'Check closets and cabinets', 'move_day'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 230),
        ('Move Day', 'Confirm keys and lockup', 'move_day'::public.task_category, 'critical'::public.task_priority, 'quick'::public.task_effort, 240),
        ('Post-Move', 'Unpack essentials first', 'post_move'::public.task_category, 'critical'::public.task_priority, 'medium'::public.task_effort, 250),
        ('Post-Move', 'Set up kids sleeping area', 'post_move'::public.task_category, 'critical'::public.task_priority, 'medium'::public.task_effort, 260),
        ('Post-Move', 'Check utilities working at new home', 'post_move'::public.task_category, 'high'::public.task_priority, 'quick'::public.task_effort, 270),
        ('Post-Move', 'Assemble key furniture', 'post_move'::public.task_category, 'medium'::public.task_priority, 'big'::public.task_effort, 280),
        ('Post-Move', 'Update any missed addresses', 'post_move'::public.task_category, 'medium'::public.task_priority, 'quick'::public.task_effort, 290)
    )
    insert into public.tasks (
      workspace_id,
      room_id,
      title,
      status,
      priority,
      category,
      estimated_effort,
      sort_order,
      created_by,
      updated_by
    )
    select
      new_workspace_id,
      rooms.id,
      task_seed.title,
      'todo',
      task_seed.priority,
      task_seed.category,
      task_seed.effort,
      task_seed.sort_order,
      current_user_id,
      current_user_id
    from task_seed
    join public.rooms
      on rooms.workspace_id = new_workspace_id
      and rooms.name = task_seed.room_name;

    insert into public.activity_log (workspace_id, actor_id, action, metadata)
    values (
      new_workspace_id,
      current_user_id,
      'seeded',
      jsonb_build_object('rooms', 12, 'tasks', 29)
    );
  end if;

  return new_workspace_id;
end;
$$;

revoke execute on function public.create_workspace_with_seed(text, date, text, text, text, boolean) from public;
grant execute on function public.create_workspace_with_seed(text, date, text, text, text, boolean) to authenticated;
