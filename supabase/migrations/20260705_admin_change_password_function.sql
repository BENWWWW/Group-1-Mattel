-- Migration: Create SQL function for Admin password management of other users
-- Path: supabase/migrations/20260705_admin_change_password_function.sql

-- Ensure pgcrypto is enabled (usually in extensions schema)
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
