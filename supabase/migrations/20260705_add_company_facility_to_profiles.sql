-- ============================================================
-- MIGRATION: Add Company and Facility columns to Profiles table
-- Date: 2026-07-05
-- Description: Menambahkan kolom company dan facility pada tabel profiles
--              untuk menampung informasi nama perusahaan dan lokasi fasilitas vendor.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS facility TEXT;
