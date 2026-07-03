import supabase from '../lib/supabase';
import type { Informant, InformantInput, Member, Organization, Vehicle, Case, Tag, EntityTag, Favorite, Note, Draft, Notification, PersonRelation } from '../types';

// =====================================================
// INFORMANTS (INDICS)
// =====================================================

export async function getInformants(status?: string): Promise<Informant[]> {
  try {
    let query = supabase
      .from('informants')
      .select('*, organization:organizations(*), handler:profiles(*)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load informants:', error);
    return [];
  }
}

export async function getInformant(id: string): Promise<Informant | null> {
  const { data, error } = await supabase
    .from('informants')
    .select('*, organization:organizations(*), handler:profiles(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createInformant(input: InformantInput): Promise<Informant> {
  const { data, error } = await supabase
    .from('informants')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInformant(id: string, input: Partial<InformantInput>): Promise<Informant> {
  const { data, error } = await supabase
    .from('informants')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInformant(id: string): Promise<void> {
  const { error } = await supabase
    .from('informants')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// PERSON RELATIONS
// =====================================================

export async function getPersonRelations(memberId: string): Promise<PersonRelation[]> {
  const { data, error } = await supabase
    .from('person_relations')
    .select('*, person_a:members!person_a_id(*), person_b:members!person_b_id(*)')
    .or(`person_a_id.eq.${memberId},person_b_id.eq.${memberId}`);

  if (error) throw error;
  return data || [];
}

export async function createPersonRelation(input: { person_a_id: string; person_b_id: string; relation_type?: string; description?: string; is_mutual?: boolean }): Promise<PersonRelation> {
  const { data, error } = await supabase
    .from('person_relations')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePersonRelation(id: string): Promise<void> {
  const { error } = await supabase
    .from('person_relations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// TAGS
// =====================================================

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, color })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getEntityTags(entityType: string, entityId: string): Promise<EntityTag[]> {
  const { data, error } = await supabase
    .from('entity_tags')
    .select('*, tag:tags(*)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) throw error;
  return data || [];
}

export async function addTagToEntity(tagId: string, entityType: string, entityId: string): Promise<EntityTag> {
  const { data, error } = await supabase
    .from('entity_tags')
    .insert({ tag_id: tagId, entity_type: entityType, entity_id: entityId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeTagFromEntity(tagId: string, entityType: string, entityId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .eq('tag_id', tagId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) throw error;
}

// =====================================================
// FAVORITES
// =====================================================

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addFavorite(userId: string, entityType: string, entityId: string): Promise<Favorite> {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(userId: string, entityType: string, entityId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) throw error;
}

export async function isFavorite(userId: string, entityType: string, entityId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// =====================================================
// NOTES
// =====================================================

export async function getNotes(userId: string, includeShared = true): Promise<Note[]> {
  try {
    let query = supabase
      .from('notes')
      .select('*');

    if (includeShared) {
      query = query.or(`user_id.eq.${userId},is_shared.eq.true`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to load notes:', error);
    return [];
  }
}

export async function createNote(userId: string, title: string, content: string, isShared = false): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: userId, title, content, is_shared: isShared })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNote(id: string, input: Partial<{ title: string; content: string; is_shared: boolean }>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

// =====================================================
// DRAFTS
// =====================================================

export async function getDrafts(userId: string): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createDraft(userId: string, title: string, content: string): Promise<Draft> {
  const { data, error } = await supabase
    .from('drafts')
    .insert({ user_id: userId, title, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDraft(id: string, input: Partial<{ title: string; content: string }>): Promise<Draft> {
  const { data, error } = await supabase
    .from('drafts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export async function getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

// =====================================================
// GLOBAL SEARCH
// =====================================================

export interface SearchResult {
  type: 'member' | 'organization' | 'case' | 'vehicle' | 'informant';
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];
  const searchTerm = `%${query}%`;

  try {
    // Search members
    const { data: members } = await supabase
      .from('members')
      .select('id, first_name, last_name, nickname, phone, dna_profile')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},nickname.ilike.${searchTerm},phone.ilike.${searchTerm},dna_profile.ilike.${searchTerm}`)
      .limit(10);

    if (members) {
      members.forEach((m) => {
        results.push({
          type: 'member',
          id: m.id,
          title: [m.first_name, m.last_name, m.nickname && `(${m.nickname})`].filter(Boolean).join(' '),
          subtitle: m.phone || null,
          url: `/members/${m.id}`,
        });
      });
    }
  } catch (e) {
    console.error('Member search failed:', e);
  }

  try {
    // Search organizations
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, category')
      .ilike('name', searchTerm)
      .limit(10);

    if (organizations) {
      organizations.forEach((o) => {
        results.push({
          type: 'organization',
          id: o.id,
          title: o.name,
          subtitle: o.category,
          url: `/organizations/${o.id}`,
        });
      });
    }
  } catch (e) {
    console.error('Organization search failed:', e);
  }

  try {
    // Search vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, plate, make, model')
      .or(`plate.ilike.${searchTerm},make.ilike.${searchTerm},model.ilike.${searchTerm}`)
      .limit(10);

    if (vehicles) {
      vehicles.forEach((v) => {
        results.push({
          type: 'vehicle',
          id: v.id,
          title: `${v.make || ''} ${v.model || ''}`.trim() || 'Véhicule',
          subtitle: v.plate,
          url: `/vehicles/${v.id}`,
        });
      });
    }
  } catch (e) {
    console.error('Vehicle search failed:', e);
  }

  try {
    // Search cases
    const { data: cases } = await supabase
      .from('cases')
      .select('id, name, status')
      .ilike('name', searchTerm)
      .limit(10);

    if (cases) {
      cases.forEach((c) => {
        results.push({
          type: 'case',
          id: c.id,
          title: c.name,
          subtitle: c.status,
          url: `/cases/${c.id}`,
        });
      });
    }
  } catch (e) {
    console.error('Case search failed:', e);
  }

  try {
    // Search informants
    const { data: informants } = await supabase
      .from('informants')
      .select('id, first_name, last_name, nickname')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},nickname.ilike.${searchTerm}`)
      .limit(10);

    if (informants) {
      informants.forEach((i) => {
        results.push({
          type: 'informant',
          id: i.id,
          title: [i.first_name, i.last_name, i.nickname && `(${i.nickname})`].filter(Boolean).join(' '),
          subtitle: 'Indic',
          url: `/informants/${i.id}`,
        });
      });
    }
  } catch (e) {
    console.error('Informant search failed:', e);
  }

  return results;
}
