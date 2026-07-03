// ─── LOCAL STORAGE PERSISTENCE ───────────────────────────────────────────────
// Provides reliable storage-backed CRUD for all features.
// Informants: persisted to Supabase (existing `informants` table) + localStorage fallback.
// Notes/Drafts/Testimonials: localStorage-backed.

import supabase from '../lib/supabase';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── INFORMANTS ───────────────────────────────────────────────────────────────
// Persisted in Supabase `informants` table.
// Extended fields (function_type, function_detail, dna_profile, id_card_url, reliability_status)
// are stored as JSON in the `notes` column alongside any actual notes.

const INFORMANTS_CACHE_KEY = 'doa_informants_cache_v3';

export interface LocalInformant {
  id: string;
  photo_url: string | null;
  id_card_url: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  dna_profile: string | null;
  function_type: string | null;
  function_detail: string | null;
  reliability_status: 'fiable' | 'non_fiable' | 'inconnu';
  created_at: string;
  updated_at: string;
}

// Encode extended fields into the DB notes column
function encodeNotes(informant: Partial<LocalInformant>, existingNotes?: string): string {
  let prior: Record<string, unknown> = {};
  if (existingNotes) {
    try {
      prior = JSON.parse(existingNotes);
    } catch {
      prior = {};
    }
  }
  return JSON.stringify({
    ...prior,
    _ext: {
      id_card_url: informant.id_card_url ?? null,
      dna_profile: informant.dna_profile ?? null,
      function_type: informant.function_type ?? null,
      function_detail: informant.function_detail ?? null,
      reliability_status: informant.reliability_status ?? 'inconnu',
    },
  });
}

function decodeNotes(raw: string | null): Pick<LocalInformant, 'id_card_url' | 'dna_profile' | 'function_type' | 'function_detail' | 'reliability_status'> {
  if (!raw) return { id_card_url: null, dna_profile: null, function_type: null, function_detail: null, reliability_status: 'inconnu' };
  try {
    const parsed = JSON.parse(raw);
    const ext = parsed._ext || parsed;
    return {
      id_card_url: ext.id_card_url ?? null,
      dna_profile: ext.dna_profile ?? null,
      function_type: ext.function_type ?? null,
      function_detail: ext.function_detail ?? null,
      reliability_status: ext.reliability_status ?? 'inconnu',
    };
  } catch {
    return { id_card_url: null, dna_profile: null, function_type: null, function_detail: null, reliability_status: 'inconnu' };
  }
}

// Convert Supabase row to LocalInformant
function rowToLocal(row: Record<string, unknown>): LocalInformant {
  const ext = decodeNotes(row.notes as string | null);
  return {
    id: row.id as string,
    photo_url: (row.photo_url as string | null) ?? null,
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
    ...ext,
  };
}

export async function getLocalInformantsAsync(): Promise<LocalInformant[]> {
  try {
    const { data, error } = await supabase
      .from('informants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    const items = data.map(row => rowToLocal(row as Record<string, unknown>));
    // Also merge with any localStorage items that may be missing from DB
    const cached = load<LocalInformant>(INFORMANTS_CACHE_KEY);
    const dbIds = new Set(items.map(i => i.id));
    const missingLocally = cached.filter(c => !dbIds.has(c.id));
    // Cache the DB results locally too
    save(INFORMANTS_CACHE_KEY, items);
    return items.concat(missingLocally).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    // Fallback to cache
    const cached = load<LocalInformant>(INFORMANTS_CACHE_KEY);
    if (cached.length > 0) return cached;
    // Legacy key fallback for previously stored data
    const legacy = load<LocalInformant>('doa_informants_v2');
    return legacy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

// Sync version for backwards compat — returns from cache immediately
export function getLocalInformants(): LocalInformant[] {
  // Try cache first
  const cached = load<LocalInformant>(INFORMANTS_CACHE_KEY);
  if (cached.length > 0) return cached.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  // Legacy fallback
  const legacy = load<LocalInformant>('doa_informants_v2');
  return legacy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getLocalInformant(id: string): LocalInformant | null {
  const all = getLocalInformants();
  return all.find(i => i.id === id) ?? null;
}

export async function createLocalInformant(input: Omit<LocalInformant, 'id' | 'created_at' | 'updated_at'>): Promise<LocalInformant> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('informants')
      .insert({
        photo_url: input.photo_url,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        notes: encodeNotes(input),
        status: 'active',
      })
      .select('*')
      .single();
    if (error) throw error;
    const item = rowToLocal(data as Record<string, unknown>);
    // Update cache
    const all = getLocalInformants();
    save(INFORMANTS_CACHE_KEY, [item, ...all.filter(i => i.id !== item.id)]);
    return item;
  } catch {
    // Fallback to localStorage only
    const item: LocalInformant = { ...input, id: uid(), created_at: now, updated_at: now };
    const all = getLocalInformants();
    save(INFORMANTS_CACHE_KEY, [item, ...all]);
    return item;
  }
}

export async function updateLocalInformant(id: string, patch: Partial<Omit<LocalInformant, 'id' | 'created_at'>>): Promise<LocalInformant | null> {
  try {
    // First get the existing row to preserve existing notes content
    const { data: existing } = await supabase.from('informants').select('notes').eq('id', id).maybeSingle();
    const { data, error } = await supabase
      .from('informants')
      .update({
        photo_url: patch.photo_url,
        first_name: patch.first_name,
        last_name: patch.last_name,
        phone: patch.phone,
        notes: encodeNotes(patch, existing?.notes ?? null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const updated = rowToLocal(data as Record<string, unknown>);
    // Update cache
    const all = getLocalInformants();
    save(INFORMANTS_CACHE_KEY, all.map(i => i.id === id ? updated : i));
    return updated;
  } catch {
    // Fallback to localStorage
    const all = getLocalInformants();
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const updated = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    all[idx] = updated;
    save(INFORMANTS_CACHE_KEY, all);
    return updated;
  }
}

export async function deleteLocalInformant(id: string): Promise<void> {
  try {
    await supabase.from('informants').delete().eq('id', id);
  } catch {}
  // Always clean up cache
  const all = getLocalInformants();
  save(INFORMANTS_CACHE_KEY, all.filter(i => i.id !== id));
  // Also delete related testimonials
  const TESTIMONIALS_KEY = 'doa_testimonials_v2';
  save(TESTIMONIALS_KEY, load<LocalTestimonial>(TESTIMONIALS_KEY).filter(t => t.informant_id !== id));
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

const TESTIMONIALS_KEY = 'doa_testimonials_v2';

export interface LocalTestimonial {
  id: string;
  informant_id: string;
  text: string | null;
  agent_report: string | null;
  agent_matricule: string | null;
  photos_urls: string[];
  videos_urls: string[];
  created_at: string;
}

export function getLocalTestimonials(informantId: string): LocalTestimonial[] {
  return load<LocalTestimonial>(TESTIMONIALS_KEY)
    .filter(t => t.informant_id === informantId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createLocalTestimonial(input: Omit<LocalTestimonial, 'id' | 'created_at'>): LocalTestimonial {
  const item: LocalTestimonial = { ...input, id: uid(), created_at: new Date().toISOString() };
  save(TESTIMONIALS_KEY, [...load<LocalTestimonial>(TESTIMONIALS_KEY), item]);
  return item;
}

export function deleteLocalTestimonial(id: string): void {
  save(TESTIMONIALS_KEY, load<LocalTestimonial>(TESTIMONIALS_KEY).filter(t => t.id !== id));
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

const NOTES_KEY = 'doa_notes_v2';

export interface LocalNote {
  id: string;
  title: string | null;
  content: string | null;
  photos_urls: string[];
  videos_urls: string[];
  created_at: string;
  updated_at: string;
}

export function getLocalNotes(): LocalNote[] {
  return load<LocalNote>(NOTES_KEY).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getLocalNote(id: string): LocalNote | null {
  return load<LocalNote>(NOTES_KEY).find(n => n.id === id) ?? null;
}

export function createLocalNote(input: Omit<LocalNote, 'id' | 'created_at' | 'updated_at'>): LocalNote {
  const now = new Date().toISOString();
  const item: LocalNote = { ...input, id: uid(), created_at: now, updated_at: now };
  save(NOTES_KEY, [...load<LocalNote>(NOTES_KEY), item]);
  return item;
}

export function updateLocalNote(id: string, patch: Partial<Omit<LocalNote, 'id' | 'created_at'>>): LocalNote | null {
  const all = load<LocalNote>(NOTES_KEY);
  const idx = all.findIndex(n => n.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  all[idx] = updated;
  save(NOTES_KEY, all);
  return updated;
}

export function deleteLocalNote(id: string): void {
  save(NOTES_KEY, load<LocalNote>(NOTES_KEY).filter(n => n.id !== id));
}

// ─── DRAFTS ───────────────────────────────────────────────────────────────────

const DRAFTS_KEY = 'doa_drafts_v2';

export interface LocalDraft {
  id: string;
  title: string | null;
  content: string | null;
  photos_urls: string[];
  videos_urls: string[];
  created_at: string;
  updated_at: string;
}

export function getLocalDrafts(): LocalDraft[] {
  return load<LocalDraft>(DRAFTS_KEY).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getLocalDraft(id: string): LocalDraft | null {
  return load<LocalDraft>(DRAFTS_KEY).find(d => d.id === id) ?? null;
}

export function createLocalDraft(input: Omit<LocalDraft, 'id' | 'created_at' | 'updated_at'>): LocalDraft {
  const now = new Date().toISOString();
  const item: LocalDraft = { ...input, id: uid(), created_at: now, updated_at: now };
  save(DRAFTS_KEY, [...load<LocalDraft>(DRAFTS_KEY), item]);
  return item;
}

export function updateLocalDraft(id: string, patch: Partial<Omit<LocalDraft, 'id' | 'created_at'>>): LocalDraft | null {
  const all = load<LocalDraft>(DRAFTS_KEY);
  const idx = all.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  all[idx] = updated;
  save(DRAFTS_KEY, all);
  return updated;
}

export function deleteLocalDraft(id: string): void {
  save(DRAFTS_KEY, load<LocalDraft>(DRAFTS_KEY).filter(d => d.id !== id));
}
