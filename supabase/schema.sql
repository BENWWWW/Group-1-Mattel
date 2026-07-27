-- ============================================================
-- MAINTAIN.AI - PM Verification System
-- Supabase SQL Schema (Updated v2)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'vendor')),
  employee_id TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  avatar_url  TEXT,
  department  TEXT,
  company     TEXT,
  facility    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code   TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'MECHANICAL', -- e.g. MECHANICAL, ELECTRICAL, FACILITIES
  location     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'operational'
                CHECK (status IN ('operational', 'maintenance', 'decommissioned')),
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PM TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.pm_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'MECHANICAL', -- e.g. HVAC SYSTEMS, ELECTRICAL
  description     TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]',
  created_by      UUID REFERENCES public.profiles(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PM TASKS TABLE
CREATE TABLE IF NOT EXISTS public.pm_tasks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code               TEXT NOT NULL UNIQUE,
  template_id             UUID REFERENCES public.pm_templates(id) ON DELETE SET NULL,
  asset_id                UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assigned_vendor_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_supervisor_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'pending'
                           CHECK (LOWER(status) IN ('pending','in_progress','submitted','approved','rejected')),
  priority                TEXT NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low','medium','high','critical')),
  due_date                DATE NOT NULL,
  scheduled_date          DATE,
  notes                   TEXT,
  description             TEXT,
  checklist               JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PM REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.pm_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  submitted_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checklist_results   JSONB NOT NULL DEFAULT '[]',
  findings            TEXT,
  recommendations     TEXT,
  photos_urls         TEXT[],
  ai_confidence_score INTEGER,   -- 0-100
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'submitted'
                       CHECK (LOWER(status) IN ('submitted','approved','rejected')),
  reviewed_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER pm_templates_updated_at
  BEFORE UPDATE ON public.pm_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER pm_tasks_updated_at
  BEFORE UPDATE ON public.pm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, employee_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendor'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'UNKNOWN-ID')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- AUTO-DELETE AUTH USER ON PROFILE DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_reports   ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ASSETS
CREATE POLICY "Authenticated can read assets"
  ON public.assets FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage assets"
  ON public.assets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PM TEMPLATES
CREATE POLICY "Authenticated can read templates"
  ON public.pm_templates FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert templates"
  ON public.pm_templates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update templates"
  ON public.pm_templates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete templates"
  ON public.pm_templates FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PM TASKS
CREATE POLICY "Admin can manage all tasks"
  ON public.pm_tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Supervisor can read assigned tasks"
  ON public.pm_tasks FOR SELECT USING (assigned_supervisor_id = auth.uid());

CREATE POLICY "Supervisor can update task status"
  ON public.pm_tasks FOR UPDATE USING (assigned_supervisor_id = auth.uid());

CREATE POLICY "Vendor can read assigned tasks"
  ON public.pm_tasks FOR SELECT USING (assigned_vendor_id = auth.uid());

CREATE POLICY "Vendor can update assigned tasks"
  ON public.pm_tasks FOR UPDATE USING (assigned_vendor_id = auth.uid());

-- PM REPORTS
CREATE POLICY "Vendor can insert own reports"
  ON public.pm_reports FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Vendor can read own reports"
  ON public.pm_reports FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Vendor can update own reports"
  ON public.pm_reports FOR UPDATE USING (submitted_by = auth.uid());

CREATE POLICY "Supervisor can read related reports"
  ON public.pm_reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pm_tasks t
      WHERE t.id = task_id AND t.assigned_supervisor_id = auth.uid()
    )
  );

CREATE POLICY "Supervisor can update report status"
  ON public.pm_reports FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pm_tasks t
      WHERE t.id = task_id AND t.assigned_supervisor_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all reports"
  ON public.pm_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Replace the UUID with your actual Supabase Auth user ID
-- INSERT INTO public.profiles (id, role, employee_id, full_name, email, department)
-- VALUES 
--   ('36693a9f-ba2f-4f83-a94f-50b263103140', 'admin', 'ADM-001-Z', 'Admin Mattel', 'admin@mattel.com', 'Engineering')
-- ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 6. SUPABASE STORAGE BUCKETS & RLS POLICIES
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('pm_evidence', 'pm_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Public Access for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Uploads for avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Updates for avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Deletes for avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- RLS policies for pm_evidence bucket
CREATE POLICY "Public Access for pm_evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pm_evidence');

CREATE POLICY "Public Uploads for pm_evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pm_evidence');

CREATE POLICY "Authenticated Uploads for pm_evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pm_evidence' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Updates for pm_evidence"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pm_evidence');

CREATE POLICY "Authenticated Deletes for pm_evidence"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pm_evidence');


-- ============================================================
-- 15. ADMIN PASSWORD MANAGEMENT FUNCTION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Security check: Ensure the caller is an active administrator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only active administrators can change passwords.';
  END IF;

  -- Validation check
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;

  -- Update auth.users password using bcrypt
  UPDATE auth.users
  SET
    encrypted_password = crypt(new_password, gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = target_user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in authentication system.';
  END IF;
END;
$$;

-- 16. CHAT MESSAGES TABLE & REALTIME PUBLICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES public.pm_tasks(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can read their own messages" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can insert their own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can mark received messages as read" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() = receiver_id
  ) WITH CHECK (
    auth.uid() = receiver_id
  );

-- Enable Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 17. NOTIFICATIONS TABLE, TRIGGERS & REALTIME
-- ============================================================
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




