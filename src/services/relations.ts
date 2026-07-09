// Organization Relations Service
import supabase from '../lib/supabase';

export const RELATION_TYPES = [
  { value: 'allie', label: 'Allié', color: '#22c55e' },
  { value: 'ennemi', label: 'Ennemi', color: '#ef4444' },
  { value: 'partenaire_commercial', label: 'Partenaire commercial', color: '#3b82f6' },
  { value: 'fournisseur', label: 'Fournisseur', color: '#8b5cf6' },
  { value: 'client', label: 'Client', color: '#06b6d4' },
  { value: 'neutre', label: 'Neutre', color: '#6b7280' },
  { value: 'sous_controle', label: 'Sous contrôle', color: '#eab308' },
  { value: 'rival', label: 'Rival', color: '#f97316' },
  { value: 'inconnu', label: 'Inconnu', color: '#9ca3af' },
] as const;

export interface OrganizationRelation {
  id: string;
  organization_a_id: string;
  organization_b_id: string;
  relation_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization_a?: { id: string; name: string; color: string | null; logo_url: string | null };
  organization_b?: { id: string; name: string; color: string | null; logo_url: string | null };
}

export interface RelationInput {
  organization_a_id: string;
  organization_b_id: string;
  relation_type: string;
  notes?: string;
}

const STORAGE_KEY = 'doa_org_relations_v1';

// Get all relations involving a specific organization
export async function getOrganizationRelations(orgId: string): Promise<OrganizationRelation[]> {
  try {
    const { data, error } = await supabase
      .from('organization_relations')
      .select(`
        *,
        organization_a:organizations!organization_a_id(id, name, color, logo_url),
        organization_b:organizations!organization_b_id(id, name, color, logo_url)
      `)
      .or(`organization_a_id.eq.${orgId},organization_b_id.eq.${orgId}`);
    if (error) throw error;
    return data || [];
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const all: OrganizationRelation[] = JSON.parse(stored);
      return all.filter(r => r.organization_a_id === orgId || r.organization_b_id === orgId);
    }
    return [];
  }
}

// Get all relations
export async function getAllRelations(): Promise<OrganizationRelation[]> {
  try {
    const { data, error } = await supabase
      .from('organization_relations')
      .select(`
        *,
        organization_a:organizations!organization_a_id(id, name, color, logo_url),
        organization_b:organizations!organization_b_id(id, name, color, logo_url)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  }
}

// Create a relation (bidirectional)
export async function createRelation(input: RelationInput): Promise<OrganizationRelation> {
  const [orgA, orgB] = [input.organization_a_id, input.organization_b_id].sort();

  try {
    // Check if a relation already exists between these two organizations
    const { data: existing } = await supabase
      .from('organization_relations')
      .select('id')
      .or(`and(organization_a_id.eq.${orgA},organization_b_id.eq.${orgB}),and(organization_a_id.eq.${orgB},organization_b_id.eq.${orgA})`)
      .maybeSingle();

    if (existing) {
      // Update the existing relation instead of creating a duplicate
      const { data, error } = await supabase
        .from('organization_relations')
        .update({
          relation_type: input.relation_type,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(`
          *,
          organization_a:organizations!organization_a_id(id, name, color, logo_url),
          organization_b:organizations!organization_b_id(id, name, color, logo_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('organization_relations')
      .insert({
        organization_a_id: orgA,
        organization_b_id: orgB,
        relation_type: input.relation_type,
        notes: input.notes || null,
      })
      .select(`
        *,
        organization_a:organizations!organization_a_id(id, name, color, logo_url),
        organization_b:organizations!organization_b_id(id, name, color, logo_url)
      `)
      .single();
    if (error) throw error;
    return data;
  } catch {
    const relations = await getAllRelations();
    const existingLocal = relations.find(r =>
      (r.organization_a_id === orgA && r.organization_b_id === orgB) ||
      (r.organization_a_id === orgB && r.organization_b_id === orgA)
    );
    if (existingLocal) {
      existingLocal.relation_type = input.relation_type;
      existingLocal.notes = input.notes || null;
      existingLocal.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(relations));
      return existingLocal;
    }
    const newRelation: OrganizationRelation = {
      id: `rel-${Date.now()}`,
      organization_a_id: orgA,
      organization_b_id: orgB,
      relation_type: input.relation_type,
      notes: input.notes || null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    relations.unshift(newRelation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relations));
    return newRelation;
  }
}

// Update a relation
export async function updateRelation(id: string, input: Partial<RelationInput>): Promise<OrganizationRelation | null> {
  try {
    const { data, error } = await supabase
      .from('organization_relations')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        organization_a:organizations!organization_a_id(id, name, color, logo_url),
        organization_b:organizations!organization_b_id(id, name, color, logo_url)
      `)
      .single();
    if (error) throw error;
    return data;
  } catch {
    const relations = await getAllRelations();
    const idx = relations.findIndex(r => r.id === id);
    if (idx === -1) return null;
    relations[idx] = { ...relations[idx], ...input, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relations));
    return relations[idx];
  }
}

// Delete a relation
export async function deleteRelation(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('organization_relations').delete().eq('id', id);
    if (error) throw error;
  } catch {
    const relations = await getAllRelations();
    const filtered = relations.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function getRelationTypeLabel(type: string): string {
  return RELATION_TYPES.find(t => t.value === type)?.label || type;
}

export function getRelationTypeColor(type: string): string {
  return RELATION_TYPES.find(t => t.value === type)?.color || '#6b7280';
}
