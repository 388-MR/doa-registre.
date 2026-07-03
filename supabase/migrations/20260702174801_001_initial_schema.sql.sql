-- PROFILES (Extended User Data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matricule TEXT UNIQUE NOT NULL,
  rank TEXT NOT NULL DEFAULT 'agent' CHECK (rank IN ('admin', 'lead', 'co_lead', 'agent', 'readonly')),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated, anon USING (true) WITH CHECK (true);

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bikers', 'criminal_org', 'gang')),
  logo_url TEXT,
  color TEXT DEFAULT '#4d6fa8',
  threat_level INTEGER DEFAULT 1 CHECK (threat_level BETWEEN 1 AND 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'dissolved')),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated, anon USING (true);

-- MEMBERS
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  photo_url TEXT,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT,
  birth_date DATE,
  phone TEXT,
  dna_profile TEXT,
  profession TEXT,
  role TEXT,
  grade TEXT,
  address TEXT,
  nationality TEXT,
  observations TEXT,
  id_card_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'incarcerated', 'deceased', 'unknown')),
  is_wanted BOOLEAN DEFAULT false,
  danger_level INTEGER DEFAULT 1 CHECK (danger_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON members FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated, anon USING (true);

-- INFORMANTS (Indics)
CREATE TABLE IF NOT EXISTS informants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT,
  phone TEXT,
  reliability INTEGER DEFAULT 3 CHECK (reliability BETWEEN 1 AND 5),
  information_provided TEXT,
  rewards NUMERIC DEFAULT 0,
  last_contact DATE,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  handler_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'compromised')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE informants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "informants_select" ON informants FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "informants_insert" ON informants FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "informants_update" ON informants FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "informants_delete" ON informants FOR DELETE TO authenticated, anon USING (true);

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT,
  plate TEXT,
  make TEXT,
  model TEXT,
  color TEXT,
  owner_id UUID REFERENCES members(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  last_known_location TEXT,
  observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'impounded', 'destroyed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE TO authenticated, anon USING (true);

-- HEADQUARTERS
CREATE TABLE IF NOT EXISTS headquarters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  address TEXT,
  photos_urls TEXT[] DEFAULT '{}',
  observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'raided', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE headquarters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hq_select" ON headquarters FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "hq_insert" ON headquarters FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "hq_update" ON headquarters FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "hq_delete" ON headquarters FOR DELETE TO authenticated, anon USING (true);

-- HIDEOUTS
CREATE TABLE IF NOT EXISTS hideouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  address TEXT,
  type TEXT DEFAULT 'hideout' CHECK (type IN ('hideout', 'lab', 'warehouse')),
  security_measures TEXT,
  photos_urls TEXT[] DEFAULT '{}',
  observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'raided', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hideouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hideouts_select" ON hideouts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "hideouts_insert" ON hideouts FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "hideouts_update" ON hideouts FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "hideouts_delete" ON hideouts FOR DELETE TO authenticated, anon USING (true);

-- CASES
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived', 'pending')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  lead_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_select" ON cases FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "cases_insert" ON cases FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "cases_update" ON cases FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "cases_delete" ON cases FOR DELETE TO authenticated, anon USING (true);

-- CASE MEMBERS
CREATE TABLE IF NOT EXISTS case_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'suspect' CHECK (role IN ('suspect', 'witness', 'victim', 'informant', 'person_of_interest')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_members_select" ON case_members FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "case_members_insert" ON case_members FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "case_members_delete" ON case_members FOR DELETE TO authenticated, anon USING (true);

-- CASE ORGANIZATIONS
CREATE TABLE IF NOT EXISTS case_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_orgs_select" ON case_organizations FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "case_orgs_insert" ON case_organizations FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "case_orgs_delete" ON case_organizations FOR DELETE TO authenticated, anon USING (true);

-- EVIDENCE
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'document' CHECK (type IN ('photo', 'video', 'audio', 'document', 'physical')),
  title TEXT,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_select" ON evidence FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "evidence_insert" ON evidence FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "evidence_delete" ON evidence FOR DELETE TO authenticated, anon USING (true);

-- SURVEILLANCE
CREATE TABLE IF NOT EXISTS surveillance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT CHECK (target_type IN ('member', 'organization', 'location')),
  target_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  target_location TEXT,
  agents UUID[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  report TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE surveillance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "surveillance_select" ON surveillance FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "surveillance_insert" ON surveillance FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "surveillance_update" ON surveillance FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "surveillance_delete" ON surveillance FOR DELETE TO authenticated, anon USING (true);

-- ARRESTS
CREATE TABLE IF NOT EXISTS arrests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  arrest_date DATE NOT NULL,
  arresting_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  charges TEXT[],
  judicial_outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE arrests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arrests_select" ON arrests FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "arrests_insert" ON arrests FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "arrests_delete" ON arrests FOR DELETE TO authenticated, anon USING (true);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'export')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated, anon WITH CHECK (true);

-- NOTES
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  title TEXT,
  content TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON notes FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "notes_insert" ON notes FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "notes_update" ON notes FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "notes_delete" ON notes FOR DELETE TO authenticated, anon USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_members_organization ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_organizations_category ON organizations(category);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);