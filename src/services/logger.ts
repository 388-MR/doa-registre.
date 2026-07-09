// Centralized logging service — writes to Supabase `audit_log` table.
// No localStorage fallback. All data is in Supabase.
import supabase from '../lib/supabase';
import { getAuthorshipSession } from '../lib/authorship';

export interface LogEntry {
  id: string;
  user_matricule: string | null;
  user_codename: string | null;
  agent_matricule: string | null;
  agent_codename: string | null;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout';
  action_label: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  view: 'Consultation',
  export: 'Export',
  login: 'Connexion',
  logout: 'Déconnexion',
};

export async function getLogsAsync(): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    user_matricule: (row.user_matricule as string) || null,
    user_codename: (row.user_codename as string) || null,
    agent_matricule: (row.agent_matricule as string) || null,
    agent_codename: (row.agent_codename as string) || null,
    action: (row.action as string) || 'view',
    action_label: (row.action_label as string) || null,
    entity_type: (row.entity_type as string) || '',
    entity_id: row.entity_id ? String(row.entity_id) : null,
    entity_name: (row.entity_name as string) || null,
    resource_type: (row.resource_type as string) || null,
    resource_id: row.resource_id ? String(row.resource_id) : null,
    resource_name: (row.resource_name as string) || null,
    old_values: (row.old_values as Record<string, unknown>) || null,
    new_values: (row.new_values as Record<string, unknown>) || null,
    ip_address: (row.ip_address as string) || null,
    created_at: (row.created_at as string) || new Date().toISOString(),
  }));
}

export function getLogs(): LogEntry[] {
  return [];
}

export async function addLog(entry: {
  action: LogEntry['action'];
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}): Promise<void> {
  const { matricule, codename } = getAuthorshipSession();
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;

  const { error } = await supabase.from('audit_log').insert({
    user_matricule: matricule,
    user_codename: codename,
    agent_matricule: matricule,
    agent_codename: codename,
    action: entry.action,
    action_label: actionLabel,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id || null,
    entity_name: entry.entity_name || null,
    resource_type: entry.entity_type,
    resource_id: entry.entity_id || null,
    resource_name: entry.entity_name || null,
    old_values: entry.old_values || null,
    new_values: entry.new_values || null,
  });
  if (error) throw error;
}

export const logCreate = (entityType: string, entityId: string, entityName: string, newData: Record<string, unknown>) => {
  addLog({ action: 'create', entity_type: entityType, entity_id: entityId, entity_name: entityName, new_values: newData });
};

export const logUpdate = (entityType: string, entityId: string, entityName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) => {
  addLog({ action: 'update', entity_type: entityType, entity_id: entityId, entity_name: entityName, old_values: oldData, new_values: newData });
};

export const logDelete = (entityType: string, entityId: string, entityName: string, oldData: Record<string, unknown>) => {
  addLog({ action: 'delete', entity_type: entityType, entity_id: entityId, entity_name: entityName, old_values: oldData });
};

export const logView = (entityType: string, entityId: string, entityName: string) => {
  addLog({ action: 'view', entity_type: entityType, entity_id: entityId, entity_name: entityName });
};

export const logExport = (entityType: string, entityId: string, entityName: string) => {
  addLog({ action: 'export', entity_type: entityType, entity_id: entityId, entity_name: entityName });
};

export const logLogin = (matricule: string) => {
  addLog({ action: 'login', entity_type: 'session', entity_id: null, entity_name: `Matricule ${matricule}` });
};

export const logLogout = (matricule: string) => {
  addLog({ action: 'logout', entity_type: 'session', entity_id: null, entity_name: `Matricule ${matricule}` });
};

export function clearOldLogs(daysToKeep: number = 30): void {
  // No-op — cleanup should be done via Supabase scheduled job if needed
}
