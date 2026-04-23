-- ============================================================
-- HopeConnect Phase 1 — Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Helper: get the current user's role from profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE POLICY "Admin: full access on profiles"
  ON profiles FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Users: read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- ============================================================
-- children
-- ============================================================
CREATE POLICY "Admin: full access on children"
  ON children FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Social Worker: read/update own children"
  ON children FOR SELECT
  USING (get_my_role() = 'social_worker' AND created_by = auth.uid());

CREATE POLICY "Social Worker: insert children"
  ON children FOR INSERT
  WITH CHECK (get_my_role() = 'social_worker' AND created_by = auth.uid());

CREATE POLICY "Social Worker: update own children"
  ON children FOR UPDATE
  USING (get_my_role() = 'social_worker' AND created_by = auth.uid());

CREATE POLICY "NGO: read assigned children"
  ON children FOR SELECT
  USING (
    get_my_role() = 'ngo'
    AND id IN (
      SELECT child_id FROM cases WHERE assigned_ngo_id = auth.uid()
    )
  );

-- ============================================================
-- cases
-- ============================================================
CREATE POLICY "Admin: full access on cases"
  ON cases FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Social Worker: read/update own cases"
  ON cases FOR SELECT
  USING (get_my_role() = 'social_worker' AND reported_by = auth.uid());

CREATE POLICY "Social Worker: insert cases"
  ON cases FOR INSERT
  WITH CHECK (get_my_role() = 'social_worker' AND reported_by = auth.uid());

CREATE POLICY "Social Worker: update own cases"
  ON cases FOR UPDATE
  USING (get_my_role() = 'social_worker' AND reported_by = auth.uid());

CREATE POLICY "NGO: read assigned cases"
  ON cases FOR SELECT
  USING (get_my_role() = 'ngo' AND assigned_ngo_id = auth.uid());

-- ============================================================
-- documents
-- ============================================================
CREATE POLICY "Admin: full access on documents"
  ON documents FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Social Worker: read/insert own documents"
  ON documents FOR SELECT
  USING (
    get_my_role() = 'social_worker'
    AND case_id IN (SELECT id FROM cases WHERE reported_by = auth.uid())
  );

CREATE POLICY "Social Worker: insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    get_my_role() = 'social_worker'
    AND uploaded_by = auth.uid()
    AND case_id IN (SELECT id FROM cases WHERE reported_by = auth.uid())
  );

CREATE POLICY "NGO: read assigned documents"
  ON documents FOR SELECT
  USING (
    get_my_role() = 'ngo'
    AND case_id IN (SELECT id FROM cases WHERE assigned_ngo_id = auth.uid())
  );

-- ============================================================
-- case_updates
-- ============================================================
CREATE POLICY "Admin: full access on case_updates"
  ON case_updates FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "NGO: read own case_updates"
  ON case_updates FOR SELECT
  USING (get_my_role() = 'ngo' AND ngo_id = auth.uid());

CREATE POLICY "NGO: insert case_updates for assigned cases"
  ON case_updates FOR INSERT
  WITH CHECK (
    get_my_role() = 'ngo'
    AND ngo_id = auth.uid()
    AND case_id IN (SELECT id FROM cases WHERE assigned_ngo_id = auth.uid())
  );

CREATE POLICY "NGO: update own case_updates"
  ON case_updates FOR UPDATE
  USING (get_my_role() = 'ngo' AND ngo_id = auth.uid());
