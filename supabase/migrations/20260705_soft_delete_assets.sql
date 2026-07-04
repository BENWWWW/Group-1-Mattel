-- ============================================================
-- MIGRATION: Soft Delete for Assets
-- Date: 2026-07-05
-- Description: Menambahkan kolom is_deleted pada tabel assets agar
--              aset bisa "dihapus" tanpa melanggar foreign key constraint
--              pada pm_tasks. Semua histori task & report tetap utuh.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Tambahkan kolom is_deleted ke tabel assets
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Index opsional untuk performa filter
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON public.assets (is_deleted);
