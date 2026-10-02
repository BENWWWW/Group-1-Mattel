-- Recurring PM tasks: a task can repeat every N months or years.
-- When a recurring task is approved, the next occurrence is created automatically
-- with due/scheduled dates shifted by the interval (from the old due date, so the schedule doesn't drift
-- with late approvals). Admin can change or stop the recurrence on any open task.
--
-- Rollback:
--   drop trigger if exists pm_tasks_spawn_next on public.pm_tasks;
--   drop function if exists public.spawn_next_recurring_task();
--   alter table public.pm_tasks drop column if exists recurrence, drop column if exists recurrence_interval;

alter table public.pm_tasks
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'monthly', 'yearly')),
  add column if not exists recurrence_interval integer not null default 1
    check (recurrence_interval between 1 and 120);

create or replace function public.spawn_next_recurring_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  step interval;
  code text;
begin
  step := case new.recurrence
            when 'monthly' then make_interval(months => new.recurrence_interval)
            else make_interval(years => new.recurrence_interval)
          end;

  -- ponytail: random 4-digit code like the admin form; retry on collision. Widen if >9000 tasks/year.
  loop
    code := 'TASK-' || extract(year from new.due_date + step)::int || '-' || (1000 + floor(random() * 9000))::int;
    exit when not exists (select 1 from pm_tasks where task_code = code);
  end loop;

  insert into pm_tasks (task_code, template_id, asset_id, assigned_vendor_id, assigned_supervisor_id, created_by,
                        status, priority, due_date, scheduled_date, notes, description, recurrence, recurrence_interval)
  values (code, new.template_id, new.asset_id, new.assigned_vendor_id, new.assigned_supervisor_id, new.created_by,
          'pending', new.priority, (new.due_date + step)::date, (new.scheduled_date + step)::date,
          new.notes, new.description, new.recurrence, new.recurrence_interval);
  return new;
end;
$$;

drop trigger if exists pm_tasks_spawn_next on public.pm_tasks;
create trigger pm_tasks_spawn_next
  after update of status on public.pm_tasks
  for each row
  when (lower(new.status) = 'approved' and lower(old.status) <> 'approved' and new.recurrence <> 'none')
  execute function public.spawn_next_recurring_task();
