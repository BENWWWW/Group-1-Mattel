-- ============================================================
-- MIGRATION: Add Digital Signatures Support
-- Date: 2026-07-04
-- Description: Tabel untuk menyimpan tanda tangan digital vendor & supervisor
--              sehingga mereka tidak perlu tanda tangan manual lagi.
--              Tanda tangan disimpan sebagai base64 data URL (PNG canvas export).
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 7. SIGNATURES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label           TEXT NOT NULL DEFAULT 'Default',         -- e.g. "Default", "Formal", "Initials"
  signature_data  TEXT NOT NULL,                           -- base64 data URL (image/png) dari canvas draw
  is_default      BOOLEAN NOT NULL DEFAULT false,          -- tanda tangan aktif/utama user
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Satu user hanya boleh punya 1 default signature aktif
  -- (di-handle via trigger di bawah)
  CONSTRAINT signature_data_not_empty CHECK (char_length(signature_data) > 0)
);

-- Index untuk query cepat per user
CREATE INDEX IF NOT EXISTS idx_signatures_user_id    ON public.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_is_default ON public.signatures(user_id, is_default);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER untuk signatures
-- ============================================================
CREATE OR REPLACE TRIGGER signatures_updated_at
  BEFORE UPDATE ON public.signatures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: Pastikan hanya 1 signature yang is_default = true per user
-- Saat user set signature baru sebagai default, otomatis unset yang lain
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_signature_default()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika signature yang di-insert/update adalah default
  IF NEW.is_default = true THEN
    -- Reset semua signature lain milik user ini jadi false
    UPDATE public.signatures
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_signature_default_set
  AFTER INSERT OR UPDATE OF is_default ON public.signatures
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.handle_signature_default();

-- ============================================================
-- ROW LEVEL SECURITY untuk signatures
-- ============================================================
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- User hanya bisa lihat signature milik sendiri
CREATE POLICY "Users can read own signatures"
  ON public.signatures FOR SELECT
  USING (auth.uid() = user_id);

-- User hanya bisa insert signature untuk diri sendiri
CREATE POLICY "Users can insert own signatures"
  ON public.signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User hanya bisa update signature milik sendiri
CREATE POLICY "Users can update own signatures"
  ON public.signatures FOR UPDATE
  USING (auth.uid() = user_id);

-- User hanya bisa delete signature milik sendiri
CREATE POLICY "Users can delete own signatures"
  ON public.signatures FOR DELETE
  USING (auth.uid() = user_id);

-- Admin bisa melihat semua signature (untuk keperluan audit)
CREATE POLICY "Admin can read all signatures"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin bisa hapus signature (misal akun dinonaktifkan)
CREATE POLICY "Admin can delete signatures"
  ON public.signatures FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Supervisor bisa baca signature vendor yang ada di task yang mereka awasi
-- (untuk menampilkan tanda tangan di laporan)
CREATE POLICY "Supervisor can read vendor signatures for assigned tasks"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_tasks t
      WHERE t.assigned_vendor_id = user_id
        AND t.assigned_supervisor_id = auth.uid()
    )
  );

-- Vendor bisa baca signature supervisor yang ada di task yang mereka kerjakan
-- (untuk menampilkan tanda tangan di laporan)
CREATE POLICY "Vendor can read supervisor signatures for assigned tasks"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_tasks t
      WHERE t.assigned_supervisor_id = user_id
        AND t.assigned_vendor_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET untuk signature images (opsional, jika mau pakai storage)
-- Alternatif dari menyimpan base64 langsung di DB
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)   -- private bucket, akses via signed URL
ON CONFLICT (id) DO NOTHING;

-- Hanya pemilik yang bisa upload signature mereka sendiri
CREATE POLICY "Users can upload own signature"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Hanya pemilik yang bisa baca signature mereka sendiri
CREATE POLICY "Users can read own signature files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Hanya pemilik yang bisa update/replace signature mereka
CREATE POLICY "Users can update own signature files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Hanya pemilik yang bisa hapus signature mereka
CREATE POLICY "Users can delete own signature files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin bisa baca semua file signature
CREATE POLICY "Admin can read all signature files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signatures'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
