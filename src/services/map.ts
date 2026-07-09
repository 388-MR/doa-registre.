// Map Points Service - Interactive map points of interest
import supabase from '../lib/supabase';
import { stampCreate, stampUpdate } from '../lib/authorship';

export const MAP_POINT_TYPES = [
  { value: 'qg', label: 'QG', emoji: '🏠', defaultColor: '#4d6fa8' },
  { value: 'labo_drogue', label: 'Labo Drogue / Cocaïne', emoji: '❄️', defaultColor: '#22c55e' },
  { value: 'labo_cannabis', label: 'Labo Cannabis', emoji: '🌿', defaultColor: '#16a34a' },
  { value: 'labo_gilet', label: 'Labo Gilet pare-balles', emoji: '🦺', defaultColor: '#3b82f6' },
  { value: 'planque', label: 'Planque', emoji: '🔑', defaultColor: '#6b7280' },
  { value: 'point_chaud', label: 'Point chaud / Zone de conflit', emoji: '🔥', defaultColor: '#ef4444' },
  { value: 'poste_lspd', label: 'Poste de police LSPD', emoji: '👮', defaultColor: '#1e40af' },
  { value: 'ems', label: 'EMS', emoji: '⛑️', defaultColor: '#dc2626' },
  { value: 'plantation_sauvage', label: 'Plantation sauvage', emoji: '🌱', defaultColor: '#16a34a' },
  { value: 'autre', label: 'Autre', emoji: '📍', defaultColor: '#6b7280' },
] as const;

export const MAP_ICONS = [
  { value: 'map-pin', label: 'Épingle' },
  { value: 'building-2', label: 'Bâtiment' },
  { value: 'home', label: 'Maison' },
  { value: 'warehouse', label: 'Entrepôt' },
  { value: 'flask-conical', label: 'Laboratoire' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'shield-check', label: 'Police' },
  { value: 'cross', label: 'Croix' },
  { value: 'leaf', label: 'Feuille' },
  { value: 'flame', label: 'Flamme' },
  { value: 'skull', label: 'Crâne' },
  { value: 'eye', label: 'Œil' },
  { value: 'currency-dollar', label: 'Argent' },
  { value: 'gun', label: 'Arme' },
  { value: 'car', label: 'Véhicule' },
  { value: 'star', label: 'Étoile' },
  { value: 'alert-triangle', label: 'Alerte' },
  { value: 'flag', label: 'Drapeau' },
];

export interface MapPoint {
  id: string;
  name: string;
  type: string;
  icon: string;
  organization_id: string | null;
  latitude: number;
  longitude: number;
  color: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string; color: string | null } | null;
}

export interface MapPointInput {
  name: string;
  type: string;
  icon: string;
  organization_id?: string | null;
  latitude: number;
  longitude: number;
  color?: string;
  notes?: string;
}

const STORAGE_KEY = 'doa_map_points_v1';

export async function getMapPoints(): Promise<MapPoint[]> {
  try {
    const { data, error } = await supabase
      .from('map_points')
      .select('*, organization:organizations(id, name, color)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  }
}

export async function getMapPoint(id: string): Promise<MapPoint | null> {
  try {
    const { data, error } = await supabase
      .from('map_points')
      .select('*, organization:organizations(id, name, color)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    const points = await getMapPoints();
    return points.find(p => p.id === id) || null;
  }
}

export async function createMapPoint(input: MapPointInput): Promise<MapPoint> {
  const point = {
    ...input,
    organization_id: input.organization_id || null,
    color: input.color || MAP_POINT_TYPES.find(t => t.value === input.type)?.defaultColor || '#4d6fa8',
    notes: input.notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('map_points')
      .insert(stampCreate(point as Record<string, unknown>))
      .select('*, organization:organizations(id, name, color)')
      .single();
    if (error) throw error;
    return data;
  } catch {
    // Fallback to localStorage
    const points = await getMapPoints();
    const newPoint: MapPoint = {
      id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...point,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    points.unshift(newPoint);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    return newPoint;
  }
}

export async function updateMapPoint(id: string, input: Partial<MapPointInput>): Promise<MapPoint | null> {
  try {
    const { data, error } = await supabase
      .from('map_points')
      .update(stampUpdate(input as Record<string, unknown>))
      .eq('id', id)
      .select('*, organization:organizations(id, name, color)')
      .single();
    if (error) throw error;
    return data;
  } catch {
    const points = await getMapPoints();
    const idx = points.findIndex(p => p.id === id);
    if (idx === -1) return null;
    points[idx] = { ...points[idx], ...input, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    return points[idx];
  }
}

export async function deleteMapPoint(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('map_points').delete().eq('id', id);
    if (error) throw error;
  } catch {
    const points = await getMapPoints();
    const filtered = points.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function getPointTypeLabel(type: string): string {
  return MAP_POINT_TYPES.find(t => t.value === type)?.label || type;
}

export function getPointTypeEmoji(type: string): string {
  return MAP_POINT_TYPES.find(t => t.value === type)?.emoji || '📍';
}

export function getPointTypeIcon(type: string): string {
  return MAP_POINT_TYPES.find(t => t.value === type)?.icon || 'map-pin';
}

// Map image bounds - coordinates for the custom map image
// These bounds define the coordinate system for the Los Santos + Cayo Perico map
export const MAP_BOUNDS = {
  // Main map bounds (Los Santos + Blaine County)
  losSantos: {
    north: 4000,
    south: -4000,
    west: -4000,
    east: 4000,
  },
  // Cayo Perico island bounds (positioned in the southeast corner)
  cayoPerico: {
    north: -3000,
    south: -4500,
    west: 3500,
    east: 5000,
  },
};

// Default map image URL - can be overridden by user-uploaded image
export const DEFAULT_MAP_IMAGE = '/map-los-santos.jpg';
