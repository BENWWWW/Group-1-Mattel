-- ============================================================
-- MIGRATION: Fix Admin Template Deletion & Vendor Report Update RLS
-- Date: 2026-07-05
-- Description: 
--   1. Re-create pm_templates RLS policies with explicit SELECT/INSERT/UPDATE/DELETE.
--      Ini memperbaiki masalah di mana Admin tidak dapat menghapus (delete) template PM.
--   2. Re-create Vendor update policy dengan DROP IF EXISTS untuk mencegah error duplikasi.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Perbaikan Policy PM Templates (Hapus & Buat Ulang Secara Eksplisit)
DROP POLICY IF EXISTS "Admin can manage templates" ON public.pm_templates;
DROP POLICY IF EXISTS "Authenticated can read templates" ON public.pm_templates;
DROP POLICY IF EXISTS "Admin can insert templates" ON public.pm_templates;
DROP POLICY IF EXISTS "Admin can update templates" ON public.pm_templates;
DROP POLICY IF EXISTS "Admin can delete templates" ON public.pm_templates;

-- Policy Membaca Template (Semua user yang login)
CREATE POLICY "Authenticated can read templates"
  ON public.pm_templates FOR SELECT USING (auth.role() = 'authenticated');

-- Policy Insert Template (Admin saja)
CREATE POLICY "Admin can insert templates"
  ON public.pm_templates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy Update Template (Admin saja)
CREATE POLICY "Admin can update templates"
  ON public.pm_templates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy Delete Template (Admin saja)
CREATE POLICY "Admin can delete templates"
  ON public.pm_templates FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 2. Perbaikan Policy Vendor Update Laporan (Tanda Tangan)
DROP POLICY IF EXISTS "Vendor can update own reports" ON public.pm_reports;

CREATE POLICY "Vendor can update own reports"
  ON public.pm_reports FOR UPDATE USING (submitted_by = auth.uid());
