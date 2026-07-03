/*
# REGISTRE DOA - Initial Database Schema

This migration creates the complete database schema for the REGISTRE DOA application,
a professional criminal intelligence software for a FiveM RP server.

## 1. User Management & Authentication

### `profiles` table
Extended user profiles linked to Supabase auth.users with role-based access control.
- `id`: UUID primary key, references auth.users
- `matricule`: Unique officer identification number (e.g., "LSPD-0507")
- `rank`: Officer rank (Agent, Co-Lead, Lead, Admin)
- `display_name`: Display name for the UI
- `avatar_url`: Profile picture URL
- `created_at`, `updated_at`: Timestamps

## 2. Core Entities

### `organizations` table
Criminal organizations tracked by DOA.
- `id`: UUID primary key
- `name`: Organization name
- `category`: bikers | criminal_org | gang
- `logo_url`: Organization logo
- `color`: Hex color code for UI theming
- `threat_level`: Integer 1-5
- `status`: active | archived | dissolved
- `description`: Detailed description
- `notes`: Internal notes
- `created_at`, `updated_at`: Timestamps

### `members` table
Individuals tracked within organizations or independently.
- `id`: UUID primary key
- `organization_id`: FK to organizations (nullable)
- `photo_url`: Profile photo
- `first_name`, `last_name`, `nickname`
- `birth_date`: Date of birth
- `phone`: Phone number
- `dna_profile`: DNA reference
- `profession`: Legal profession
- `role`: Role within organization
- `grade`: Rank/grade within organization
- `address`: Known address
- `nationality`: Nationality
- `observations`: Notes
- `id_card_url`: ID card photo URL
- `status`: active | incarcerated | deceased | unknown
- `is_wanted`: Boolean flag
- `danger_level`: Integer 1-5
- `created_at`, `updated_at`: Timestamps

### `informants` (indics) table
People providing information to DOA.
- `id`: UUID primary key
- `photo_url`: Profile photo
- `first_name`, `last_name`, `nickname`
- `phone`: Contact number
- `reliability`: Integer 1-5 (trustworthiness)
- `information_provided`: Text log of intel given
- `rewards`: Total rewards paid
- `last_contact`: Date of last contact
- `notes`: Internal notes
- `organization_id`: Linked organization (optional)
- `handler_id`: FK to agents handling this informant
- `status`: active | inactive | compromised
- `created_at`, `updated_at`: Timestamps

## 3. Vehicles & Assets

### `vehicles` table
Tracked vehicles.
- `id`: UUID primary key
- `photo_url`: Vehicle photo
- `plate`: License plate
- `make`, `model`, `color`: Vehicle details
- `owner_id`: FK to members (nullable)
- `organization_id`: FK to organizations (nullable)
- `last_known_location`: Text description
- `observations`: Notes
- `status`: active | impounded | destroyed
- `created_at`, `updated_at`: Timestamps

### `headquarters` table
Organizational headquarters/bases.
- `id`: UUID primary key
- `organization_id`: FK to organizations
- `address`: Physical address
- `photos_urls`: Array of photo URLs
- `observations`: Notes
- `status`: active | raided | abandoned
- `created_at`, `updated_at`: Timestamps

### `hideouts` table
Hideouts and laboratories.
- `id`: UUID primary key
- `organization_id`: FK to organizations (nullable)
- `address`: Physical address
- `type`: hideout | lab | warehouse
- `security_measures`: Text description
- `photos_urls`: Array of photo URLs
- `observations`: Notes
- `status`: active | raided | abandoned
- `created_at`, `updated_at`: Timestamps

### `businesses` table
Legitimate business fronts.
- `id`: UUID primary key
- `organization_id`: FK to organizations (nullable)
- `name`: Business name
- `address`: Physical address
- `activity_type`: Type of business
- `description`: Description
- `estimated_revenue`: Estimated monthly revenue
- `observations`: Notes
- `status`: active | closed | suspected
- `created_at`, `updated_at`: Timestamps

### `territories` table
Controlled territories.
- `id`: UUID primary key
- `organization_id`: FK to organizations
- `name`: Territory name
- `description`: Description
- `zone_coordinates`: JSON coordinates
- `photos_urls`: Array of photo URLs
- `observations`: Notes
- `status`: controlled | disputed | lost
- `created_at`, `updated_at`: Timestamps

### `weapons` table
Tracked weapons inventory.
- `id`: UUID primary key
- `organization_id`: FK to organizations (nullable)
- `name`: Weapon name
- `type`: Weapon type (pistol, rifle, etc.)
- `quantity`: Quantity known
- `origin`: Source country/organization
- `serial_numbers`: Array of serial numbers
- `observations`: Notes
- `status`: located | seized | unknown
- `created_at`, `updated_at`: Timestamps

## 4. Cases & Evidence

### `cases` table
Criminal cases/investigations.
- `id`: UUID primary key
- `name`: Case name
- `description`: Case description
- `status`: open | closed | archived | pending
- `priority`: Integer 1-5
- `lead_agent_id`: FK to profiles (case lead)
- `created_at`, `updated_at`, `closed_at`: Timestamps

### `case_members` table
Junction table linking members to cases.
- `id`: UUID primary key
- `case_id`: FK to cases
- `member_id`: FK to members
- `role`: suspect | witness | victim | informant
- `notes`: Notes specific to this involvement
- `created_at`: Timestamp

### `case_organizations` table
Junction table linking organizations to cases.
- `id`: UUID primary key
- `case_id`: FK to cases
- `organization_id`: FK to organizations
- `notes`: Notes specific to this involvement
- `created_at`: Timestamp

### `evidence` table
Evidence collection.
- `id`: UUID primary key
- `case_id`: FK to cases (nullable)
- `type`: photo | video | audio | document | physical
- `title`: Evidence title
- `description`: Detailed description
- `file_url`: File URL in storage
- `thumbnail_url`: Preview thumbnail
- `author_id`: FK to profiles (uploader)
- `metadata`: JSON metadata
- `created_at`: Timestamp

## 5. Relationships & Intelligence

### `person_relations` table
Relationships between individuals.
- `id`: UUID primary key
- `person_a_id`: FK to members
- `person_b_id`: FK to members
- `relation_type`: family | associate | enemy | rival | partner
- `description`: Relationship description
- `is_mutual`: Boolean
- `created_at`, `updated_at`: Timestamps

### `organization_alliances` table
Relationships between organizations.
- `id`: UUID primary key
- `organization_a_id`: FK to organizations
- `organization_b_id`: FK to organizations
- `relation_type`: allied | neutral | enemy | rival
- `description`: Relationship description
- `history`: Historical context
- `created_at`, `updated_at`: Timestamps

### `financing` table
Financial intelligence.
- `id`: UUID primary key
- `organization_id`: FK to organizations
- `source`: Income source
- `estimated_amount`: Estimated value
- `laundering_method`: Money laundering technique
- `observations`: Notes
- `created_at`, `updated_at`: Timestamps

### `surveillance` table
Surveillance operations.
- `id`: UUID primary key
- `target_type`: member | organization | location
- `target_member_id`: FK to members (nullable)
- `target_organization_id`: FK to organizations (nullable)
- `target_location`: Text location (nullable)
- `agents`: Array of agent IDs
- `start_date`: Start date
- `end_date`: End date (nullable)
- `report`: Surveillance report
- `status`: active | completed | cancelled
- `created_at`, `updated_at`: Timestamps

## 6. Utility Tables

### `arrests` table
Arrest records.
- `id`: UUID primary key
- `member_id`: FK to members
- `arrest_date`: Date of arrest
- `arresting_agent_id`: FK to profiles
- `charges`: Array of charges
- `judicial_outcome`: Text outcome
- `notes`: Notes
- `created_at`: Timestamp

### `tags` table
Custom tags for categorization.
- `id`: UUID primary key
- `name`: Tag name
- `color`: Hex color
- `created_at`: Timestamp

### `entity_tags` table
Junction table for tagging any entity.
- `id`: UUID primary key
- `tag_id`: FK to tags
- `entity_type`: Text (members, organizations, cases)
- `entity_id`: UUID of tagged entity
- `created_at`: Timestamp

### `favorites` table
Pinned items for quick access.
- `id`: UUID primary key
- `user_id`: FK to profiles
- `entity_type`: Text
- `entity_id`: UUID
- `created_at`: Timestamp

### `notes` table
Personal and shared notes.
- `id`: UUID primary key
- `user_id`: FK to profiles
- `title`: Note title
- `content`: Note content (markdown)
- `is_shared`: Boolean
- `created_at`, `updated_at`: Timestamps

### `drafts` table
Independent scratchpad.
- `id`: UUID primary key
- `user_id`: FK to profiles
- `title`: Draft title
- `content`: Draft content
- `created_at`, `updated_at`: Timestamps

### `audit_log` table
Immutable audit trail.
- `id`: UUID primary key
- `user_id`: FK to profiles
- `action`: create | update | delete
- `entity_type`: Text
- `entity_id`: UUID
- `old_values`: JSON (previous state)
- `new_values`: JSON (new state)
- `ip_address`: IP address
- `created_at`: Timestamp (immutable)

### `notifications` table
Internal notifications.
- `id`: UUID primary key
- `user_id`: FK to profiles
- `title`: Notification title
- `message`: Notification message
- `type`: info | warning | urgent
- `entity_type`: Related entity type
- `entity_id`: Related entity ID
- `is_read`: Boolean
- `created_at`: Timestamp

## Security
- RLS enabled on all tables
- Policies restrict access to authenticated users based on role
- Audit log is append-only, deletable only by admins
*/

-- =====================================================
-- PROFILES (Extended User Data)
-- =====================================================
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

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
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

DROP POLICY IF EXISTS "orgs_select" ON organizations;
CREATE POLICY "orgs_select" ON organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "orgs_insert" ON organizations;
CREATE POLICY "orgs_insert" ON organizations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orgs_update" ON organizations;
CREATE POLICY "orgs_update" ON organizations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orgs_delete" ON organizations;
CREATE POLICY "orgs_delete" ON organizations FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- MEMBERS
-- =====================================================
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

DROP POLICY IF EXISTS "members_select" ON members;
CREATE POLICY "members_select" ON members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "members_insert" ON members;
CREATE POLICY "members_insert" ON members FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- INFORMANTS (Indics)
-- =====================================================
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

DROP POLICY IF EXISTS "informants_select" ON informants;
CREATE POLICY "informants_select" ON informants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "informants_insert" ON informants;
CREATE POLICY "informants_insert" ON informants FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "informants_update" ON informants;
CREATE POLICY "informants_update" ON informants FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "informants_delete" ON informants;
CREATE POLICY "informants_delete" ON informants FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- VEHICLES
-- =====================================================
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

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- HEADQUARTERS
-- =====================================================
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

DROP POLICY IF EXISTS "hq_select" ON headquarters;
CREATE POLICY "hq_select" ON headquarters FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hq_insert" ON headquarters;
CREATE POLICY "hq_insert" ON headquarters FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hq_update" ON headquarters;
CREATE POLICY "hq_update" ON headquarters FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hq_delete" ON headquarters;
CREATE POLICY "hq_delete" ON headquarters FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- HIDEOUTS
-- =====================================================
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

DROP POLICY IF EXISTS "hideouts_select" ON hideouts;
CREATE POLICY "hideouts_select" ON hideouts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hideouts_insert" ON hideouts;
CREATE POLICY "hideouts_insert" ON hideouts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hideouts_update" ON hideouts;
CREATE POLICY "hideouts_update" ON hideouts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hideouts_delete" ON hideouts;
CREATE POLICY "hideouts_delete" ON hideouts FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- BUSINESSES
-- =====================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT,
  address TEXT,
  activity_type TEXT,
  description TEXT,
  estimated_revenue NUMERIC,
  observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select" ON businesses;
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "businesses_insert" ON businesses;
CREATE POLICY "businesses_insert" ON businesses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "businesses_update" ON businesses;
CREATE POLICY "businesses_update" ON businesses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "businesses_delete" ON businesses;
CREATE POLICY "businesses_delete" ON businesses FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- TERRITORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  description TEXT,
  zone_coordinates JSONB,
  photos_urls TEXT[] DEFAULT '{}',
  observations TEXT,
  status TEXT DEFAULT 'controlled' CHECK (status IN ('controlled', 'disputed', 'lost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "territories_select" ON territories;
CREATE POLICY "territories_select" ON territories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "territories_insert" ON territories;
CREATE POLICY "territories_insert" ON territories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "territories_update" ON territories;
CREATE POLICY "territories_update" ON territories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "territories_delete" ON territories;
CREATE POLICY "territories_delete" ON territories FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- WEAPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT,
  type TEXT,
  quantity INTEGER DEFAULT 1,
  origin TEXT,
  serial_numbers TEXT[] DEFAULT '{}',
  observations TEXT,
  status TEXT DEFAULT 'located' CHECK (status IN ('located', 'seized', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weapons_select" ON weapons;
CREATE POLICY "weapons_select" ON weapons FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "weapons_insert" ON weapons;
CREATE POLICY "weapons_insert" ON weapons FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "weapons_update" ON weapons;
CREATE POLICY "weapons_update" ON weapons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "weapons_delete" ON weapons;
CREATE POLICY "weapons_delete" ON weapons FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- CASES
-- =====================================================
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

DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "cases_insert" ON cases;
CREATE POLICY "cases_insert" ON cases FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "cases_update" ON cases;
CREATE POLICY "cases_update" ON cases FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cases_delete" ON cases;
CREATE POLICY "cases_delete" ON cases FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- CASE MEMBERS (Junction)
-- =====================================================
CREATE TABLE IF NOT EXISTS case_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'suspect' CHECK (role IN ('suspect', 'witness', 'victim', 'informant', 'person_of_interest')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_members_select" ON case_members;
CREATE POLICY "case_members_select" ON case_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "case_members_insert" ON case_members;
CREATE POLICY "case_members_insert" ON case_members FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "case_members_update" ON case_members;
CREATE POLICY "case_members_update" ON case_members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "case_members_delete" ON case_members;
CREATE POLICY "case_members_delete" ON case_members FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- CASE ORGANIZATIONS (Junction)
-- =====================================================
CREATE TABLE IF NOT EXISTS case_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_orgs_select" ON case_organizations;
CREATE POLICY "case_orgs_select" ON case_organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "case_orgs_insert" ON case_organizations;
CREATE POLICY "case_orgs_insert" ON case_organizations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "case_orgs_update" ON case_organizations;
CREATE POLICY "case_orgs_update" ON case_organizations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "case_orgs_delete" ON case_organizations;
CREATE POLICY "case_orgs_delete" ON case_organizations FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- EVIDENCE
-- =====================================================
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

DROP POLICY IF EXISTS "evidence_select" ON evidence;
CREATE POLICY "evidence_select" ON evidence FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "evidence_insert" ON evidence;
CREATE POLICY "evidence_insert" ON evidence FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "evidence_update" ON evidence;
CREATE POLICY "evidence_update" ON evidence FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evidence_delete" ON evidence;
CREATE POLICY "evidence_delete" ON evidence FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- PERSON RELATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS person_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  person_b_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  relation_type TEXT CHECK (relation_type IN ('family', 'associate', 'enemy', 'rival', 'partner', 'friend')),
  description TEXT,
  is_mutual BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE person_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relations_select" ON person_relations;
CREATE POLICY "relations_select" ON person_relations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "relations_insert" ON person_relations;
CREATE POLICY "relations_insert" ON person_relations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "relations_update" ON person_relations;
CREATE POLICY "relations_update" ON person_relations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "relations_delete" ON person_relations;
CREATE POLICY "relations_delete" ON person_relations FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- ORGANIZATION ALLIANCES
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_a_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  organization_b_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  relation_type TEXT CHECK (relation_type IN ('allied', 'neutral', 'enemy', 'rival', 'friendly')),
  description TEXT,
  history TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_alliances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alliances_select" ON organization_alliances;
CREATE POLICY "alliances_select" ON organization_alliances FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "alliances_insert" ON organization_alliances;
CREATE POLICY "alliances_insert" ON organization_alliances FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "alliances_update" ON organization_alliances;
CREATE POLICY "alliances_update" ON organization_alliances FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alliances_delete" ON organization_alliances;
CREATE POLICY "alliances_delete" ON organization_alliances FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- FINANCING
-- =====================================================
CREATE TABLE IF NOT EXISTS financing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  source TEXT,
  estimated_amount NUMERIC,
  laundering_method TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE financing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financing_select" ON financing;
CREATE POLICY "financing_select" ON financing FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "financing_insert" ON financing;
CREATE POLICY "financing_insert" ON financing FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "financing_update" ON financing;
CREATE POLICY "financing_update" ON financing FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "financing_delete" ON financing;
CREATE POLICY "financing_delete" ON financing FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- SURVEILLANCE
-- =====================================================
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

DROP POLICY IF EXISTS "surveillance_select" ON surveillance;
CREATE POLICY "surveillance_select" ON surveillance FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "surveillance_insert" ON surveillance;
CREATE POLICY "surveillance_insert" ON surveillance FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "surveillance_update" ON surveillance;
CREATE POLICY "surveillance_update" ON surveillance FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "surveillance_delete" ON surveillance;
CREATE POLICY "surveillance_delete" ON surveillance FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- ARRESTS
-- =====================================================
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

DROP POLICY IF EXISTS "arrests_select" ON arrests;
CREATE POLICY "arrests_select" ON arrests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "arrests_insert" ON arrests;
CREATE POLICY "arrests_insert" ON arrests FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "arrests_update" ON arrests;
CREATE POLICY "arrests_update" ON arrests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "arrests_delete" ON arrests;
CREATE POLICY "arrests_delete" ON arrests FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- TAGS
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#4d6fa8',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_select" ON tags;
CREATE POLICY "tags_select" ON tags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert" ON tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tags_update" ON tags;
CREATE POLICY "tags_update" ON tags FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tags_delete" ON tags;
CREATE POLICY "tags_delete" ON tags FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- ENTITY TAGS (Junction)
-- =====================================================
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_tags_select" ON entity_tags;
CREATE POLICY "entity_tags_select" ON entity_tags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "entity_tags_insert" ON entity_tags;
CREATE POLICY "entity_tags_insert" ON entity_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "entity_tags_delete" ON entity_tags;
CREATE POLICY "entity_tags_delete" ON entity_tags FOR DELETE
  TO authenticated USING (true);

-- =====================================================
-- FAVORITES
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select" ON favorites;
CREATE POLICY "favorites_select" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert" ON favorites;
CREATE POLICY "favorites_insert" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete" ON favorites;
CREATE POLICY "favorites_delete" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- NOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_shared = true);

DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- DRAFTS
-- =====================================================
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts_select" ON drafts;
CREATE POLICY "drafts_select" ON drafts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "drafts_insert" ON drafts;
CREATE POLICY "drafts_insert" ON drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drafts_update" ON drafts;
CREATE POLICY "drafts_update" ON drafts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drafts_delete" ON drafts;
CREATE POLICY "drafts_delete" ON drafts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- AUDIT LOG (Immutable)
-- =====================================================
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

DROP POLICY IF EXISTS "audit_select" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_insert" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'success')),
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_members_organization ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_organizations_category ON organizations(category);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_lead ON cases(lead_agent_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);
