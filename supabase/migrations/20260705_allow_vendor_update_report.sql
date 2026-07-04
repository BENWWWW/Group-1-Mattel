-- ============================================================
-- MIGRATION: Allow Vendors to Update Own Reports (For Signatures)
-- Date: 2026-07-05
-- Description: Menambahkan policy RLS agar vendor dapat melakukan UPDATE
--              pada baris laporan pm_reports miliknya sendiri.
--              Hal ini dibutuhkan agar tanda tangan digital (canvas base64)
--              yang digambar di halaman verifikasi dapat disimpan ke database.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE POLICY "Vendor can update own reports"
  ON public.pm_reports FOR UPDATE USING (submitted_by = auth.uid());
