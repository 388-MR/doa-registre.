// Plantation Surveillance Service
import supabase from '../lib/supabase';

export const PLANTATION_STATUSES = [
  { value: 'reperee', label: 'Repérée', color: '#f59e0b' },
  { value: 'sous_surveillance', label: 'Sous surveillance', color: '#3b82f6' },
  { value: 'neutralisee', label: 'Neutralisée', color: '#22c55e' },
] as const;

export interface PlantationEntry {
  id: string;
  plantation_id: string;
  author_matricule: string | null;
  author_name: string | null;
  photos: string[];
  notes: string | null;
  created_at: string;
}

export interface Plantation {
  id: string;
  name: string;
  location: string | null;
  map_point_id: string | null;
  status: string;
  neutralized_at: string | null;
  created_at: string;
  updated_at: string;
  entries?: PlantationEntry[];
}

export interface PlantationInput {
  name: string;
  location?: string;
  map_point_id?: string | null;
  status?: string;
  neutralized_at?: string | null;
}

export interface PlantationEntryInput {
  plantation_id: string;
  photos?: string[];
  notes?: string;
}

const STORAGE_KEY = 'doa_plantations_v1';
const ENTRIES_STORAGE_KEY = 'doa_plantation_entries_v1';

// Get session helper
function getSessionInfo(): { matricule: string | null; name: string | null } {
  try {
    const session = localStorage.getItem('doa_session_v3');
    if (session) {
      const parsed = JSON.parse(session);
      return {
        matricule: parsed.agent?.matricule || null,
        name: parsed.agent?.display_name || null,
      };
    }
  } catch {}
  return { matricule: null, name: null };
}

// Get all plantations
export async function getPlantations(): Promise<Plantation[]> {
  try {
    const { data, error } = await supabase
      .from('plantations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  }
}

// Get single plantation with entries
export async function getPlantation(id: string): Promise<Plantation | null> {
  try {
    const { data: plantation, error } = await supabase
      .from('plantations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!plantation) return null;

    const { data: entries } = await supabase
      .from('plantation_entries')
      .select('*')
      .eq('plantation_id', id)
      .order('created_at', { ascending: true });
    return { ...plantation, entries: entries || [] };
  } catch {
    const plantations = await getPlantations();
    const plantation = plantations.find(p => p.id === id);
    if (!plantation) return null;
    const entries = await getPlantationEntries(id);
    return { ...plantation, entries };
  }
}

// Create plantation
export async function createPlantation(input: PlantationInput): Promise<Plantation> {
  const data = {
    name: input.name,
    location: input.location || null,
    map_point_id: input.map_point_id || null,
    status: input.status || 'reperee',
    neutralized_at: input.neutralized_at || null,
  };

  try {
    const { data: result, error } = await supabase
      .from('plantations')
      .insert(data)
      .select('*')
      .single();
    if (error) throw error;
    return result;
  } catch {
    const plantations = await getPlantations();
    const newPlantation: Plantation = {
      id: `plant-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    plantations.unshift(newPlantation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plantations));
    return newPlantation;
  }
}

// Update plantation
export async function updatePlantation(id: string, input: Partial<PlantationInput>): Promise<Plantation | null> {
  try {
    const { data, error } = await supabase
      .from('plantations')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch {
    const plantations = await getPlantations();
    const idx = plantations.findIndex(p => p.id === id);
    if (idx === -1) return null;
    plantations[idx] = { ...plantations[idx], ...input, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plantations));
    return plantations[idx];
  }
}

// Delete plantation
export async function deletePlantation(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('plantations').delete().eq('id', id);
    if (error) throw error;
  } catch {
    const plantations = await getPlantations();
    const filtered = plantations.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    // Also delete entries
    const entries = await getAllEntries();
    const filteredEntries = entries.filter(e => e.plantation_id !== id);
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(filteredEntries));
  }
}

// Get entries for a plantation
export async function getPlantationEntries(plantationId: string): Promise<PlantationEntry[]> {
  try {
    const { data, error } = await supabase
      .from('plantation_entries')
      .select('*')
      .eq('plantation_id', plantationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch {
    const all = await getAllEntries();
    return all.filter(e => e.plantation_id === plantationId);
  }
}

// Get all entries (helper)
async function getAllEntries(): Promise<PlantationEntry[]> {
  try {
    const { data, error } = await supabase
      .from('plantation_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    const stored = localStorage.getItem(ENTRIES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  }
}

// Add entry to plantation
export async function addPlantationEntry(plantationId: string, input: { photos?: string[]; notes?: string }): Promise<PlantationEntry> {
  const session = getSessionInfo();
  const entry = {
    plantation_id: plantationId,
    author_matricule: session.matricule,
    author_name: session.name,
    photos: input.photos || [],
    notes: input.notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('plantation_entries')
      .insert(entry)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch {
    const entries = await getAllEntries();
    const newEntry: PlantationEntry = {
      id: `entry-${Date.now()}`,
      ...entry,
      created_at: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    return newEntry;
  }
}

// Delete entry
export async function deletePlantationEntry(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('plantation_entries').delete().eq('id', id);
    if (error) throw error;
  } catch {
    const entries = await getAllEntries();
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function getPlantationStatusLabel(status: string): string {
  return PLANTATION_STATUSES.find(s => s.value === status)?.label || status;
}

export function getPlantationStatusColor(status: string): string {
  return PLANTATION_STATUSES.find(s => s.value === status)?.color || '#6b7280';
}
