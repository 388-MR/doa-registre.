import supabase from '../lib/supabase';
import type { UserRole } from '../types';

// Agent type for custom authentication
export interface Agent {
  id: string;
  matricule: string;
  pin: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// AUTHENTICATION
// =====================================================

export async function signInWithMatricule(matricule: string, pin: string): Promise<{ agent: Agent | null; error: string | null }> {
  try {
    // Look up agent by matricule
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .ilike('matricule', matricule)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return { agent: null, error: 'Erreur de connexion au serveur' };
    }

    if (!agent) {
      return { agent: null, error: 'Matricule non trouvé' };
    }

    // Validate PIN
    if (agent.pin !== pin) {
      return { agent: null, error: 'Code PIN invalide' };
    }

    if (!agent.is_active) {
      return { agent: null, error: 'Compte désactivé' };
    }

    // Update last login (non-blocking)
    supabase
      .from('agents')
      .update({ last_login: new Date().toISOString() })
      .eq('id', agent.id)
      .then(() => {})
      .catch(() => {});

    return { agent, error: null };
  } catch (err) {
    console.error('signInWithMatricule error:', err);
    return { agent: null, error: 'Erreur de connexion' };
  }
}

export async function signOut(): Promise<void> {
  // No server-side session to clear for custom auth
}

// =====================================================
// AGENT MANAGEMENT
// =====================================================

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAgent(input: { matricule: string; pin: string; role?: UserRole; display_name?: string }): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAgent(id: string, input: Partial<{ matricule: string; pin: string; role: UserRole; display_name: string; avatar_url: string; is_active: boolean }>): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ROLE HELPERS
// =====================================================

export function canEdit(rank: UserRole | null | undefined): boolean {
  if (!rank) return false;
  return ['admin', 'lead', 'co_lead', 'agent'].includes(rank);
}

export function canDelete(rank: UserRole | null | undefined): boolean {
  if (!rank) return false;
  return ['admin', 'lead'].includes(rank);
}

export function canManageUsers(rank: UserRole | null | undefined): boolean {
  if (!rank) return false;
  return ['admin', 'lead'].includes(rank);
}

export function canExport(rank: UserRole | null | undefined): boolean {
  if (!rank) return false;
  return ['admin', 'lead', 'co_lead', 'agent'].includes(rank);
}

export function getRoleLabel(rank: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrateur',
    lead: 'Lead DOA',
    co_lead: 'Co-Lead DOA',
    agent: 'Agent DOA',
    readonly: 'Lecture seule',
  };
  return labels[rank] || rank;
}

export function getRoleRank(rank: UserRole): number {
  const ranks: Record<UserRole, number> = {
    admin: 5,
    lead: 4,
    co_lead: 3,
    agent: 2,
    readonly: 1,
  };
  return ranks[rank] || 0;
}
