-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle task notifications automatically
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_name TEXT;
  v_supervisor_name TEXT;
  v_asset_name TEXT;
  admin_rec RECORD;
BEGIN
  -- Get names for nice messages
  SELECT full_name INTO v_vendor_name FROM public.profiles WHERE id = NEW.assigned_vendor_id;
  SELECT full_name INTO v_supervisor_name FROM public.profiles WHERE id = NEW.assigned_supervisor_id;
  SELECT name INTO v_asset_name FROM public.assets WHERE id = NEW.asset_id;

  -- 1. Status transitions to 'submitted' -> Notify Supervisor
  IF (NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'submitted')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_supervisor_id,
      'Task Report Submitted',
      COALESCE(v_vendor_name, 'Vendor') || ' has submitted the report for task ' || NEW.task_code || '.',
      'report_submitted',
      '/supervisor/tasks'
    );
  END IF;

  -- 2. Status transitions to 'approved' -> Notify Vendor & Notify all Admins
  IF (NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'approved')) THEN
    -- Notify Vendor
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_vendor_id,
      'Task Report Approved',
      'Task report ' || NEW.task_code || ' has been approved.',
      'report_approved',
      '/vendor/tasks'
    );

    -- Notify all Admins
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND is_active = true LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_rec.id,
        'Task Completed & Approved',
        'Task ' || NEW.task_code || ' has been approved by ' || COALESCE(v_supervisor_name, 'Supervisor') || '.',
        'task_completed',
        '/admin/reports'
      );
    END LOOP;
  END IF;

  -- 3. Status transitions to 'rejected' -> Notify Vendor
  IF (NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'rejected')) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_vendor_id,
      'Task Report Rejected',
      'Task report ' || NEW.task_code || ' has been rejected by Supervisor. Please review the rejection notes.',
      'report_rejected',
      '/vendor/tasks'
    );
  END IF;

  -- 4. New Task Assignment (Created)
  IF (TG_OP = 'INSERT') THEN
    -- Notify Vendor
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_vendor_id,
      'New Task Assigned',
      'New task ' || NEW.task_code || ' (' || COALESCE(v_asset_name, 'Asset') || ') has been assigned to you.',
      'task_assigned',
      '/vendor/tasks'
    );

    -- Notify Supervisor
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_supervisor_id,
      'New Task Assigned',
      'New task ' || NEW.task_code || ' (' || COALESCE(v_asset_name, 'Asset') || ') has been assigned under your supervision.',
      'task_assigned',
      '/supervisor/tasks'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on pm_tasks
CREATE OR REPLACE TRIGGER on_pm_task_status_change
  AFTER INSERT OR UPDATE ON public.pm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_notification();

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
