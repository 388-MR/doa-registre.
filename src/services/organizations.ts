import supabase from '../lib/supabase';
import { stampCreate, stampUpdate } from '../lib/authorship';
import type { Organization, OrganizationInput, Member, Vehicle, Headquarters, Hideout, Business, Territory, Weapon, Financing, OrganizationAlliance } from '../types';

// =====================================================
// ORGANIZATIONS
// =====================================================

export async function getOrganizations(category?: string): Promise<Organization[]> {
  try {
    let query = supabase
      .from('organizations')
      .select('*')
      .order('threat_level', { ascending: false })
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load organizations:', error);
    return [];
  }
}

export async function getOrganization(id: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to load organization:', error);
    return null;
  }
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(id: string, input: Partial<OrganizationInput>): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(stampUpdate(input as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function archiveOrganization(id: string): Promise<Organization> {
  return updateOrganization(id, { status: 'archived' });
}

// =====================================================
// MEMBERS
// =====================================================

export async function getMembers(organizationId?: string, status?: string): Promise<Member[]> {
  try {
    let query = supabase
      .from('members')
      .select('*, organization:organizations(*)')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load members:', error);
    return [];
  }
}

export async function getMember(id: string): Promise<Member | null> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*, organization:organizations(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to load member:', error);
    return null;
  }
}

export async function createMember(input: MemberInput): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMember(id: string, input: Partial<MemberInput>): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update(stampUpdate(input as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getWantedMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*, organization:organizations(*)')
    .eq('is_wanted', true)
    .order('danger_level', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =====================================================
// VEHICLES
// =====================================================

export async function getVehicles(organizationId?: string): Promise<Vehicle[]> {
  let query = supabase
    .from('vehicles')
    .select('*, owner:members(*), organization:organizations(*)')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(stampUpdate(input as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// HEADQUARTERS
// =====================================================

export async function getHeadquarters(organizationId: string): Promise<Headquarters[]> {
  const { data, error } = await supabase
    .from('headquarters')
    .select('*, organization:organizations(*)')
    .eq('organization_id', organizationId);

  if (error) throw error;
  return data || [];
}

export async function createHeadquarters(input: HeadquartersInput): Promise<Headquarters> {
  const { data, error } = await supabase
    .from('headquarters')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// HIDEOUTS
// =====================================================

export async function getHideouts(organizationId?: string): Promise<Hideout[]> {
  let query = supabase
    .from('hideouts')
    .select('*, organization:organizations(*)')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createHideout(input: HideoutInput): Promise<Hideout> {
  const { data, error } = await supabase
    .from('hideouts')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// BUSINESSES
// =====================================================

export async function getBusinesses(organizationId?: string): Promise<Business[]> {
  let query = supabase
    .from('businesses')
    .select('*, organization:organizations(*)')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createBusiness(input: BusinessInput): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// TERRITORIES
// =====================================================

export async function getTerritories(organizationId: string): Promise<Territory[]> {
  const { data, error } = await supabase
    .from('territories')
    .select('*, organization:organizations(*)')
    .eq('organization_id', organizationId);

  if (error) throw error;
  return data || [];
}

export async function createTerritory(input: TerritoryInput): Promise<Territory> {
  const { data, error } = await supabase
    .from('territories')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// WEAPONS
// =====================================================

export async function getWeapons(organizationId?: string): Promise<Weapon[]> {
  let query = supabase
    .from('weapons')
    .select('*, organization:organizations(*)')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createWeapon(input: WeaponInput): Promise<Weapon> {
  const { data, error } = await supabase
    .from('weapons')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// FINANCING
// =====================================================

export async function getFinancing(organizationId: string): Promise<Financing[]> {
  const { data, error } = await supabase
    .from('financing')
    .select('*, organization:organizations(*)')
    .eq('organization_id', organizationId);

  if (error) throw error;
  return data || [];
}

// =====================================================
// ALLIANCES
// =====================================================

export async function getAlliances(organizationId: string): Promise<OrganizationAlliance[]> {
  const { data, error } = await supabase
    .from('organization_alliances')
    .select('*, organization_a:organizations!organization_a_id(*), organization_b:organizations!organization_b_id(*)')
    .or(`organization_a_id.eq.${organizationId},organization_b_id.eq.${organizationId}`);

  if (error) throw error;
  return data || [];
}

export async function createAlliance(input: { organization_a_id: string; organization_b_id: string; relation_type?: string; description?: string; history?: string }): Promise<OrganizationAlliance> {
  const { data, error } = await supabase
    .from('organization_alliances')
    .insert(stampCreate(input as Record<string, unknown>))
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// STATISTICS
// =====================================================

export async function getOrganizationStats(id: string) {
  const [members, vehicles, hideouts, hq, businesses, territories, weapons] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('hideouts').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('headquarters').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('territories').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    supabase.from('weapons').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ]);

  return {
    members: members.count || 0,
    vehicles: vehicles.count || 0,
    hideouts: hideouts.count || 0,
    headquarters: hq.count || 0,
    businesses: businesses.count || 0,
    territories: territories.count || 0,
    weapons: weapons.count || 0,
  };
}
