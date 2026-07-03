/*
# 007 — Agents: code_name, is_read_only, last_seen + audit_log enrichment + informants reliability_status + agent_roles table + created_by_matricule

## 1. agents table — new columns
- `code_name` (text, nullable): display name for each agent (e.g. "Juliett")
- `is_read_only` (boolean, default false): when true, agent can read but not write/delete
- `last_seen` (timestamptz, nullable): heartbeat timestamp for online/offline presence

## 2. informants table — new column
- `reliability_status` (text, default 'inconnu', CHECK in 'fiable','non_fiable','inconnu')
- Data migration from notes JSON _ext.reliability_status into the new column

## 3. audit_log table — new columns
- `user_matricule`, `user_codename`, `entity_name`, `action_label`

## 4. agent_roles table — new table
- Stores DOA role overrides keyed by matricule
- RLS: anon+authenticated CRUD

## 5. created_by_matricule on key tables
- organizations, members, vehicles, hideouts, evidence, arrests, informants, map_points, cases
*/

-- ─── 1. agents: new columns ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'code_name') THEN
    ALTER TABLE agents ADD COLUMN code_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'is_read_only') THEN
    ALTER TABLE agents ADD COLUMN is_read_only boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'last_seen') THEN
    ALTER TABLE agents ADD COLUMN last_seen timestamptz;
  END IF;
END $$;

-- ─── 2. informants: reliability_status column ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informants' AND column_name = 'reliability_status') THEN
    ALTER TABLE informants ADD COLUMN reliability_status text NOT NULL DEFAULT 'inconnu';
    ALTER TABLE informants ADD CONSTRAINT informants_reliability_status_check
      CHECK (reliability_status IN ('fiable', 'non_fiable', 'inconnu'));
  END IF;
END $$;

-- Migrate existing reliability data from notes JSON
DO $$
DECLARE
  r RECORD;
  parsed jsonb;
  ext_val text;
BEGIN
  FOR r IN SELECT id, notes FROM informants WHERE notes IS NOT NULL AND notes != '' LOOP
    BEGIN
      parsed := jsonb(r.notes);
      ext_val := parsed->'_ext'->>'reliability_status';
      IF ext_val IN ('fiable', 'non_fiable', 'inconnu') THEN
        UPDATE informants SET reliability_status = ext_val WHERE id = r.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ─── 3. audit_log: new columns ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'user_matricule') THEN
    ALTER TABLE audit_log ADD COLUMN user_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'user_codename') THEN
    ALTER TABLE audit_log ADD COLUMN user_codename text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'entity_name') THEN
    ALTER TABLE audit_log ADD COLUMN entity_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'action_label') THEN
    ALTER TABLE audit_log ADD COLUMN action_label text;
  END IF;
END $$;

-- ─── 4. agent_roles table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_roles (
  matricule text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('commandant_doa', 'agent_doa')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_select" ON agent_roles;
CREATE POLICY "ar_select" ON agent_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ar_insert" ON agent_roles;
CREATE POLICY "ar_insert" ON agent_roles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ar_update" ON agent_roles;
CREATE POLICY "ar_update" ON agent_roles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ar_delete" ON agent_roles;
CREATE POLICY "ar_delete" ON agent_roles FOR DELETE
  TO anon, authenticated USING (true);

-- ─── 5. created_by_matricule on key tables ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE organizations ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE members ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE vehicles ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hideouts' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE hideouts ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE evidence ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arrests' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE arrests ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informants' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE informants ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_points' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE map_points ADD COLUMN created_by_matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'created_by_matricule') THEN
    ALTER TABLE cases ADD COLUMN created_by_matricule text;
  END IF;
END $$;
