-- ============================================================
-- Migration: Add image_url and description to assets table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Fix RLS: Add explicit WITH CHECK so admin INSERT is allowed
DROP POLICY IF EXISTS "Admin can manage assets" ON public.assets;
CREATE POLICY "Admin can manage assets"
  ON public.assets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
