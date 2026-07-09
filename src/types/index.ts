// =====================================================
// ENUMS & TYPES
// =====================================================

export type UserRole = 'admin' | 'lead' | 'co_lead' | 'agent' | 'readonly';

export type OrganizationCategory = 'bikers' | 'criminal_org' | 'gang';

export type OrganizationStatus = 'active' | 'archived' | 'dissolved';

export type MemberStatus = 'active' | 'incarcerated' | 'deceased' | 'unknown';

export type InformantStatus = 'active' | 'inactive' | 'compromised';

export type VehicleStatus = 'active' | 'impounded' | 'destroyed';

export type LocationStatus = 'active' | 'raided' | 'abandoned';

export type BusinessStatus = 'active' | 'closed' | 'suspected';

export type TerritoryStatus = 'controlled' | 'disputed' | 'lost';

export type WeaponStatus = 'located' | 'seized' | 'unknown';

export type CaseStatus = 'open' | 'closed' | 'archived' | 'pending';

export type EvidenceType = 'photo' | 'video' | 'audio' | 'document' | 'physical';

export type RelationType = 'family' | 'associate' | 'enemy' | 'rival' | 'partner' | 'friend';

export type AllianceType = 'allied' | 'neutral' | 'enemy' | 'rival' | 'friendly';

export type SurveillanceTarget = 'member' | 'organization' | 'location';

export type SurveillanceStatus = 'active' | 'completed' | 'cancelled';

export type NotificationType = 'info' | 'warning' | 'urgent' | 'success';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export';

export type CaseMemberRole = 'suspect' | 'witness' | 'victim' | 'informant' | 'person_of_interest';

export type HideoutType = 'hideout' | 'lab' | 'warehouse';

// =====================================================
// DATABASE ENTITIES
// =====================================================

export interface Profile {
  id: string;
  matricule: string;
  rank: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  category: OrganizationCategory;
  logo_url: string | null;
  color: string;
  threat_level: number;
  status: OrganizationStatus;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Computed/aggregated fields (optional)
  member_count?: number;
  vehicle_count?: number;
  territory_count?: number;
}

export interface Member {
  id: string;
  organization_id: string | null;
  photo_url: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  birth_date: string | null;
  phone: string | null;
  dna_profile: string | null;
  profession: string | null;
  role: string | null;
  grade: string | null;
  address: string | null;
  nationality: string | null;
  observations: string | null;
  id_card_url: string | null;
  status: MemberStatus;
  is_wanted: boolean;
  danger_level: number;
  created_at: string;
  updated_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  organization?: Organization | null;
}

export interface Informant {
  id: string;
  photo_url: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  phone: string | null;
  reliability: number;
  information_provided: string | null;
  rewards: number;
  last_contact: string | null;
  notes: string | null;
  organization_id: string | null;
  handler_id: string | null;
  status: InformantStatus;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization | null;
  handler?: Profile | null;
}

export interface Vehicle {
  id: string;
  photo_url: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  owner_id: string | null;
  organization_id: string | null;
  last_known_location: string | null;
  observations: string | null;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  owner?: Member | null;
  organization?: Organization | null;
}

export interface Headquarters {
  id: string;
  organization_id: string;
  address: string | null;
  photos_urls: string[];
  observations: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  organization?: Organization;
}

export interface Hideout {
  id: string;
  organization_id: string | null;
  address: string | null;
  type: HideoutType;
  security_measures: string | null;
  photos_urls: string[];
  observations: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  organization?: Organization | null;
}

export interface Business {
  id: string;
  organization_id: string | null;
  name: string | null;
  address: string | null;
  activity_type: string | null;
  description: string | null;
  estimated_revenue: number | null;
  observations: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization | null;
}

export interface Territory {
  id: string;
  organization_id: string;
  name: string | null;
  description: string | null;
  zone_coordinates: Record<string, unknown> | null;
  photos_urls: string[];
  observations: string | null;
  status: TerritoryStatus;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization;
}

export interface Weapon {
  id: string;
  organization_id: string | null;
  name: string | null;
  type: string | null;
  quantity: number;
  origin: string | null;
  serial_numbers: string[];
  observations: string | null;
  status: WeaponStatus;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization | null;
}

export interface Case {
  id: string;
  name: string;
  description: string | null;
  status: CaseStatus;
  priority: number;
  lead_agent_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  lead_agent?: Profile | null;
  members?: CaseMember[];
  organizations?: CaseOrganization[];
}

export interface CaseMember {
  id: string;
  case_id: string;
  member_id: string;
  role: CaseMemberRole;
  notes: string | null;
  created_at: string;
  // Relations
  member?: Member;
}

export interface CaseOrganization {
  id: string;
  case_id: string;
  organization_id: string;
  notes: string | null;
  created_at: string;
  // Relations
  organization?: Organization;
}

export interface Evidence {
  id: string;
  case_id: string | null;
  type: EvidenceType;
  title: string | null;
  description: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  author_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  case?: Case | null;
  author?: Profile | null;
}

export interface PersonRelation {
  id: string;
  person_a_id: string;
  person_b_id: string;
  relation_type: RelationType | null;
  description: string | null;
  is_mutual: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  person_a?: Member;
  person_b?: Member;
}

export interface OrganizationAlliance {
  id: string;
  organization_a_id: string;
  organization_b_id: string;
  relation_type: AllianceType | null;
  description: string | null;
  history: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  organization_a?: Organization;
  organization_b?: Organization;
}

export interface Financing {
  id: string;
  organization_id: string;
  source: string | null;
  estimated_amount: number | null;
  laundering_method: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization;
}

export interface Surveillance {
  id: string;
  target_type: SurveillanceTarget;
  target_member_id: string | null;
  target_organization_id: string | null;
  target_location: string | null;
  agents: string[];
  start_date: string;
  end_date: string | null;
  report: string | null;
  status: SurveillanceStatus;
  created_at: string;
  updated_at: string;
  // Relations
  target_member?: Member | null;
  target_organization?: Organization | null;
}

export interface Arrest {
  id: string;
  member_id: string;
  arrest_date: string;
  arresting_agent_id: string | null;
  charges: string[];
  judicial_outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
  // Relations
  member?: Member;
  arresting_agent?: Profile | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  // Relations
  tag?: Tag;
}

export interface Favorite {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Relations
  user?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

// =====================================================
// FORM DATA TYPES (for creating/updating)
// =====================================================

export type OrganizationInput = Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'vehicle_count' | 'territory_count'>;

export type MemberInput = Omit<Member, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type InformantInput = Omit<Informant, 'id' | 'created_at' | 'updated_at' | 'organization' | 'handler'>;

export type VehicleInput = Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'owner' | 'organization'>;

export type CaseInput = Omit<Case, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'lead_agent' | 'members' | 'organizations'>;

export type EvidenceInput = Omit<Evidence, 'id' | 'created_at' | 'case' | 'author'>;

export type HeadquartersInput = Omit<Headquarters, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type HideoutInput = Omit<Hideout, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type BusinessInput = Omit<Business, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type TerritoryInput = Omit<Territory, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type WeaponInput = Omit<Weapon, 'id' | 'created_at' | 'updated_at' | 'organization'>;

export type SurveillanceInput = Omit<Surveillance, 'id' | 'created_at' | 'updated_at' | 'target_member' | 'target_organization'>;

export type ArrestInput = Omit<Arrest, 'id' | 'created_at' | 'member' | 'arresting_agent'>;

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchResult {
  type: 'member' | 'organization' | 'case' | 'vehicle' | 'informant';
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
}

export interface DashboardStats {
  organizations: number;
  members: number;
  informants: number;
  cases: number;
  vehicles: number;
  evidence: number;
  hideouts: number;
  headquarters: number;
}

export interface RecentActivity {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user: Profile | null;
}
