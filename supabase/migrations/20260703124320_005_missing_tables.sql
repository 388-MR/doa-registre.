/*
# Missing Tables for DOA Application

Tables created: map_points, plantations, plantation_entries, organization_relations, periodic_reports
Foreign keys reference existing tables: organizations, agents
*/

-- MAP POINTS
CREATE TABLE IF NOT EXISTS map_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  icon text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  color text DEFAULT '#6b7280',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE map_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mp_select" ON map_points;
CREATE POLICY "mp_select" ON map_points FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mp_insert" ON map_points;
CREATE POLICY "mp_insert" ON map_points FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "mp_update" ON map_points;
CREATE POLICY "mp_update" ON map_points FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mp_delete" ON map_points;
CREATE POLICY "mp_delete" ON map_points FOR DELETE TO authenticated USING (true);

-- PLANTATIONS
CREATE TABLE IF NOT EXISTS plantations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  map_point_id uuid REFERENCES map_points(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'reperee' CHECK (status IN ('reperee', 'sous_surveillance', 'neutralisee')),
  neutralized_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plantations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pl_select" ON plantations;
CREATE POLICY "pl_select" ON plantations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pl_insert" ON plantations;
CREATE POLICY "pl_insert" ON plantations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pl_update" ON plantations;
CREATE POLICY "pl_update" ON plantations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pl_delete" ON plantations;
CREATE POLICY "pl_delete" ON plantations FOR DELETE TO authenticated USING (true);

-- PLANTATION ENTRIES
CREATE TABLE IF NOT EXISTS plantation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES plantations(id) ON DELETE CASCADE,
  author_matricule text,
  author_name text,
  photos jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plantation_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pe_select" ON plantation_entries;
CREATE POLICY "pe_select" ON plantation_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pe_insert" ON plantation_entries;
CREATE POLICY "pe_insert" ON plantation_entries FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pe_update" ON plantation_entries;
CREATE POLICY "pe_update" ON plantation_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pe_delete" ON plantation_entries;
CREATE POLICY "pe_delete" ON plantation_entries FOR DELETE TO authenticated USING (true);

-- ORGANIZATION RELATIONS
CREATE TABLE IF NOT EXISTS organization_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_a_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  organization_b_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('alliance', 'rivalite', 'conflit_actif', 'neutre')),
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (organization_a_id != organization_b_id)
);

ALTER TABLE organization_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "or_select" ON organization_relations;
CREATE POLICY "or_select" ON organization_relations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "or_insert" ON organization_relations;
CREATE POLICY "or_insert" ON organization_relations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "or_update" ON organization_relations;
CREATE POLICY "or_update" ON organization_relations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "or_delete" ON organization_relations;
CREATE POLICY "or_delete" ON organization_relations FOR DELETE TO authenticated USING (true);

-- PERIODIC REPORTS
CREATE TABLE IF NOT EXISTS periodic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('hebdomadaire', 'mensuel', 'personnalise')),
  date_from date NOT NULL,
  date_to date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  generated_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE periodic_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_select" ON periodic_reports;
CREATE POLICY "pr_select" ON periodic_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pr_insert" ON periodic_reports;
CREATE POLICY "pr_insert" ON periodic_reports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pr_update" ON periodic_reports;
CREATE POLICY "pr_update" ON periodic_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pr_delete" ON periodic_reports;
CREATE POLICY "pr_delete" ON periodic_reports FOR DELETE TO authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_map_points_org ON map_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_map_points_type ON map_points(type);
CREATE INDEX IF NOT EXISTS idx_plantations_status ON plantations(status);
CREATE INDEX IF NOT EXISTS idx_plantation_entries_plantation ON plantation_entries(plantation_id);
CREATE INDEX IF NOT EXISTS idx_org_rel_a ON organization_relations(organization_a_id);
CREATE INDEX IF NOT EXISTS idx_org_rel_b ON organization_relations(organization_b_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON periodic_reports(date_from, date_to);