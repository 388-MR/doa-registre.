// Centralized logging service — writes to Supabase `audit_log` table with localStorage fallback.
import supabase from '../lib/supabase';

export interface LogEntry {
  id: string;
  user_matricule: string | null;
  user_name: string | null;
  user_codename: string | null;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout';
  action_label: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const LOGS_KEY = 'doa_logs_v2';
const MAX_LOGS = 500;

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  view: 'Consultation',
  export: 'Export',
  login: 'Connexion',
  logout: 'Déconnexion',
};

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getSessionInfo(): { matricule: string | null; codename: string | null } {
  try {
    const session = localStorage.getItem('doa_session_v3');
    if (session) {
      const parsed = JSON.parse(session);
      return {
        matricule: parsed.agent?.matricule || null,
        codename: parsed.agent?.code_name || parsed.agent?.display_name || null,
      };
    }
  } catch {}
  return { matricule: null, codename: null };
}

function getLocalLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem(LOGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveLocalLogs(logs: LogEntry[]): void {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch {}
}

export async function getLogsAsync(): Promise<LogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!data) return getLocalLogs();
    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      user_matricule: (row.user_matricule as string) || null,
      user_name: (row.user_codename as string) || null,
      user_codename: (row.user_codename as string) || null,
      action: (row.action as string) || 'view',
      action_label: (row.action_label as string) || null,
      entity_type: (row.entity_type as string) || '',
      entity_id: row.entity_id ? String(row.entity_id) : null,
      entity_name: (row.entity_name as string) || null,
      old_values: (row.old_values as Record<string, unknown>) || null,
      new_values: (row.new_values as Record<string, unknown>) || null,
      ip_address: (row.ip_address as string) || null,
      created_at: (row.created_at as string) || new Date().toISOString(),
    }));
  } catch {
    return getLocalLogs().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export function getLogs(): LogEntry[] {
  return getLocalLogs().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addLog(entry: {
  action: LogEntry['action'];
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}): void {
  const { matricule, codename } = getSessionInfo();
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;

  // Write to Supabase (fire-and-forget, fallback to localStorage)
  (async () => {
    try {
      await supabase.from('audit_log').insert({
        user_matricule: matricule,
        user_codename: codename,
        action: entry.action,
        action_label: actionLabel,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        entity_name: entry.entity_name || null,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
      });
    } catch {
      // Fallback to localStorage
      const logs = getLocalLogs();
      logs.unshift({
        id: generateId(),
        user_matricule: matricule,
        user_name: codename,
        user_codename: codename,
        action: entry.action,
        action_label: actionLabel,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        entity_name: entry.entity_name || null,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        ip_address: null,
        created_at: new Date().toISOString(),
      });
      saveLocalLogs(logs);
    }
  })();
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
  const logs = getLocalLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  saveLocalLogs(logs.filter(log => new Date(log.created_at) > cutoff));
}
