import supabase from '../lib/supabase';
import type { Case, CaseInput, CaseMember, CaseOrganization, Evidence, EvidenceInput, Arrest, ArrestInput, Surveillance, SurveillanceInput } from '../types';

// =====================================================
// CASES
// =====================================================

export async function getCases(status?: string): Promise<Case[]> {
  try {
    let query = supabase
      .from('cases')
      .select('*, lead_agent:profiles(*)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load cases:', error);
    return [];
  }
}

export async function getCase(id: string): Promise<Case | null> {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, lead_agent:profiles(*), members:case_members(*, member:members(*)), organizations:case_organizations(*, organization:organizations(*))')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to load case:', error);
    return null;
  }
}

export async function createCase(input: CaseInput): Promise<Case> {
  const { data, error } = await supabase
    .from('cases')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCase(id: string, input: Partial<CaseInput & { closed_at?: string }>): Promise<Case> {
  const { data, error } = await supabase
    .from('cases')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCase(id: string): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function closeCase(id: string): Promise<Case> {
  return updateCase(id, { status: 'closed', closed_at: new Date().toISOString() });
}

// =====================================================
// CASE MEMBERS
// =====================================================

export async function addMemberToCase(caseId: string, memberId: string, role: string, notes?: string): Promise<CaseMember> {
  const { data, error } = await supabase
    .from('case_members')
    .insert({ case_id: caseId, member_id: memberId, role, notes })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeMemberFromCase(caseId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('case_members')
    .delete()
    .eq('case_id', caseId)
    .eq('member_id', memberId);

  if (error) throw error;
}

// =====================================================
// CASE ORGANIZATIONS
// =====================================================

export async function addOrganizationToCase(caseId: string, organizationId: string, notes?: string): Promise<CaseOrganization> {
  const { data, error } = await supabase
    .from('case_organizations')
    .insert({ case_id: caseId, organization_id: organizationId, notes })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeOrganizationFromCase(caseId: string, organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('case_organizations')
    .delete()
    .eq('case_id', caseId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}

// =====================================================
// EVIDENCE
// =====================================================

export async function getEvidence(caseId?: string): Promise<Evidence[]> {
  try {
    let query = supabase
      .from('evidence')
      .select('*, case:cases(*), author:profiles(*)')
      .order('created_at', { ascending: false });

    if (caseId) {
      query = query.eq('case_id', caseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load evidence:', error);
    return [];
  }
}

export async function createEvidence(input: EvidenceInput): Promise<Evidence> {
  const { data, error } = await supabase
    .from('evidence')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvidence(id: string): Promise<void> {
  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ARRESTS
// =====================================================

export async function getArrests(memberId?: string): Promise<Arrest[]> {
  try {
    let query = supabase
      .from('arrests')
      .select('*, member:members(*), arresting_agent:profiles(*)')
      .order('arrest_date', { ascending: false });

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load arrests:', error);
    return [];
  }
}

export async function createArrest(input: ArrestInput): Promise<Arrest> {
  const { data, error } = await supabase
    .from('arrests')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// SURVEILLANCE
// =====================================================

export async function getSurveillance(status?: string): Promise<Surveillance[]> {
  try {
    let query = supabase
      .from('surveillance')
      .select('*, target_member:members(*), target_organization:organizations(*)')
      .order('start_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load surveillance:', error);
    return [];
  }
}

export async function createSurveillance(input: SurveillanceInput): Promise<Surveillance> {
  const { data, error } = await supabase
    .from('surveillance')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSurveillance(id: string, input: Partial<SurveillanceInput>): Promise<Surveillance> {
  const { data, error } = await supabase
    .from('surveillance')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
