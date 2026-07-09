/*
# 009 — Global authorship tracing columns
# Adds created_by_matricule, created_by_codename, updated_by_matricule, updated_by_codename
# to every content table, plus updated_at where missing.
# No data loss — all additions are nullable.
*/

-- organizations: has created_by_matricule, needs the other 3
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- members: has created_by_matricule, needs the other 3
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- vehicles: has created_by_matricule, needs the other 3
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- hideouts: has created_by_matricule, needs the other 3
ALTER TABLE hideouts ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE hideouts ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE hideouts ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- informants: has created_by_matricule, needs the other 3
ALTER TABLE informants ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE informants ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE informants ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- map_points: has created_by_matricule, needs the other 3
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- arrests: has created_by_matricule, needs the other 3 + updated_at
ALTER TABLE arrests ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE arrests ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE arrests ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;
ALTER TABLE arrests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- evidence: has created_by_matricule, needs the other 3 + updated_at
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- cases: has created_by_matricule, needs the other 3
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- headquarters: needs all 4
ALTER TABLE headquarters ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE headquarters ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE headquarters ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE headquarters ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- notes: needs all 4 (has updated_at already)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- periodic_reports: needs all 4 + updated_at
ALTER TABLE periodic_reports ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE periodic_reports ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE periodic_reports ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE periodic_reports ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;
ALTER TABLE periodic_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- plantations: needs all 4
ALTER TABLE plantations ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE plantations ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE plantations ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE plantations ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- plantation_entries: needs all 4 + updated_at
ALTER TABLE plantation_entries ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE plantation_entries ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE plantation_entries ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE plantation_entries ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;
ALTER TABLE plantation_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- surveillance: needs all 4
ALTER TABLE surveillance ADD COLUMN IF NOT EXISTS created_by_matricule TEXT;
ALTER TABLE surveillance ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE surveillance ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE surveillance ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;

-- organization_relations: rename created_by -> created_by_matricule, add the rest
-- First add new columns
ALTER TABLE organization_relations ADD COLUMN IF NOT EXISTS created_by_codename TEXT;
ALTER TABLE organization_relations ADD COLUMN IF NOT EXISTS updated_by_matricule TEXT;
ALTER TABLE organization_relations ADD COLUMN IF NOT EXISTS updated_by_codename TEXT;
