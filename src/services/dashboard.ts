import supabase from '../lib/supabase';
import type { DashboardStats, RecentActivity, AuditLog } from '../types';

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [
      orgsResult,
      membersResult,
      informantsResult,
      casesResult,
      vehiclesResult,
      evidenceResult,
      hideoutsResult,
      hqResult,
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('informants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('evidence').select('id', { count: 'exact', head: true }),
      supabase.from('hideouts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('headquarters').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    return {
      organizations: orgsResult.count || 0,
      members: membersResult.count || 0,
      informants: informantsResult.count || 0,
      cases: casesResult.count || 0,
      vehicles: vehiclesResult.count || 0,
      evidence: evidenceResult.count || 0,
      hideouts: hideoutsResult.count || 0,
      headquarters: hqResult.count || 0,
    };
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    return {
      organizations: 0,
      members: 0,
      informants: 0,
      cases: 0,
      vehicles: 0,
      evidence: 0,
      hideouts: 0,
      headquarters: 0,
    };
  }
}

// =====================================================
// RECENT ACTIVITY
// =====================================================

export async function getRecentActivity(limit = 20): Promise<RecentActivity[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, user:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as RecentActivity[];
  } catch (error) {
    console.error('Failed to load recent activity:', error);
    return [];
  }
}

// =====================================================
// AUDIT LOG
// =====================================================

export async function getAuditLog(limit = 50, offset = 0): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, user:profiles(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []) as AuditLog[];
  } catch (error) {
    console.error('Failed to load audit log:', error);
    return [];
  }
}

export async function getEntityAuditLog(entityType: string, entityId: string): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, user:profiles(*)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AuditLog[];
  } catch (error) {
    console.error('Failed to load entity audit log:', error);
    return [];
  }
}

export async function createAuditLog(input: {
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
}): Promise<void> {
  try {
    await supabase.from('audit_log').insert(input);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// =====================================================
// RECENT CASES
// =====================================================

export async function getRecentCases(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, lead_agent:profiles(*)')
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load recent cases:', error);
    return [];
  }
}

// =====================================================
// DANGEROUS ORGANIZATIONS
// =====================================================

export async function getDangerousOrganizations(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('status', 'active')
      .gte('threat_level', 4)
      .order('threat_level', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load dangerous organizations:', error);
    return [];
  }
}
