-- Add NGO assignment support to existing public_reports data.
-- Run this once in Supabase SQL Editor if your database already exists.

ALTER TABLE public_reports
  ADD COLUMN IF NOT EXISTS assigned_ngo_id uuid REFERENCES profiles(id);

-- Refresh Supabase/PostgREST schema cache so the API can use the new column immediately.
NOTIFY pgrst, 'reload schema';

DROP POLICY IF EXISTS "NGO: read assigned public_reports" ON public_reports;

CREATE POLICY "NGO: read assigned public_reports"
  ON public_reports FOR SELECT
  USING (get_my_role() = 'ngo' AND assigned_ngo_id = auth.uid());
