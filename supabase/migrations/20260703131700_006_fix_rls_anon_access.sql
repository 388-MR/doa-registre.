-- Fix RLS policies: app uses custom auth (matricule+PIN), not Supabase Auth JWT.
-- The Supabase client uses the anon key, so policies must allow the anon role.
-- This matches the agents table pattern which already uses (anon, authenticated).

-- ─── plantations ───
DROP POLICY IF EXISTS pl_select ON plantations;
DROP POLICY IF EXISTS pl_insert ON plantations;
DROP POLICY IF EXISTS pl_update ON plantations;
DROP POLICY IF EXISTS pl_delete ON plantations;

CREATE POLICY pl_select ON plantations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pl_insert ON plantations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY pl_update ON plantations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY pl_delete ON plantations FOR DELETE TO anon, authenticated USING (true);

-- ─── plantation_entries ───
DROP POLICY IF EXISTS pe_select ON plantation_entries;
DROP POLICY IF EXISTS pe_insert ON plantation_entries;
DROP POLICY IF EXISTS pe_update ON plantation_entries;
DROP POLICY IF EXISTS pe_delete ON plantation_entries;

CREATE POLICY pe_select ON plantation_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pe_insert ON plantation_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY pe_update ON plantation_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY pe_delete ON plantation_entries FOR DELETE TO anon, authenticated USING (true);

-- ─── organization_relations ───
DROP POLICY IF EXISTS or_select ON organization_relations;
DROP POLICY IF EXISTS or_insert ON organization_relations;
DROP POLICY IF EXISTS or_update ON organization_relations;
DROP POLICY IF EXISTS or_delete ON organization_relations;

CREATE POLICY or_select ON organization_relations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY or_insert ON organization_relations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY or_update ON organization_relations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY or_delete ON organization_relations FOR DELETE TO anon, authenticated USING (true);

-- ─── map_points ───
DROP POLICY IF EXISTS mp_select ON map_points;
DROP POLICY IF EXISTS mp_insert ON map_points;
DROP POLICY IF EXISTS mp_update ON map_points;
DROP POLICY IF EXISTS mp_delete ON map_points;

CREATE POLICY mp_select ON map_points FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY mp_insert ON map_points FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY mp_update ON map_points FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY mp_delete ON map_points FOR DELETE TO anon, authenticated USING (true);

-- ─── periodic_reports (also had authenticated-only) ───
DROP POLICY IF EXISTS pr_insert ON periodic_reports;
CREATE POLICY pr_insert ON periodic_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
