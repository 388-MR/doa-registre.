// Centralized logging service that tracks all modifications
import { useAuth } from '../contexts/AuthContext';

export interface LogEntry {
  id: string;
  user_matricule: string | null;
  user_name: string | null;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout';
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

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem(LOGS_KEY);
    if (stored) {
      const logs = JSON.parse(stored);
      return logs.sort((a: LogEntry, b: LogEntry) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  } catch {}
  return [];
}

export function addLog(entry: {
  action: LogEntry['action'];
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}): void {
  try {
    // Get current user from localStorage
    let userMatricule: string | null = null;
    let userName: string | null = null;

    try {
      const session = localStorage.getItem('doa_session_v3');
      if (session) {
        const parsed = JSON.parse(session);
        userMatricule = parsed.agent?.matricule || null;
        userName = parsed.agent?.display_name || null;
      }
    } catch {}

    const logs = getLogs();
    const newLog: LogEntry = {
      id: generateId(),
      user_matricule: userMatricule,
      user_name: userName,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_name: entry.entity_name || null,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      ip_address: null,
      created_at: new Date().toISOString(),
    };

    logs.unshift(newLog);

    // Keep only last MAX_LOGS entries
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to add log:', error);
  }
}

// Convenience functions for common actions
export const logCreate = (entityType: string, entityId: string, entityName: string, newData: Record<string, unknown>) => {
  addLog({
    action: 'create',
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    new_values: newData,
  });
};

export const logUpdate = (entityType: string, entityId: string, entityName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) => {
  addLog({
    action: 'update',
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    old_values: oldData,
    new_values: newData,
  });
};

export const logDelete = (entityType: string, entityId: string, entityName: string, oldData: Record<string, unknown>) => {
  addLog({
    action: 'delete',
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    old_values: oldData,
  });
};

export const logView = (entityType: string, entityId: string, entityName: string) => {
  addLog({
    action: 'view',
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
  });
};

export const logExport = (entityType: string, entityId: string, entityName: string) => {
  addLog({
    action: 'export',
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
  });
};

export const logLogin = (matricule: string) => {
  addLog({
    action: 'login',
    entity_type: 'session',
    entity_id: null,
    entity_name: `Matricule ${matricule}`,
  });
};

export const logLogout = (matricule: string) => {
  addLog({
    action: 'logout',
    entity_type: 'session',
    entity_id: null,
    entity_name: `Matricule ${matricule}`,
  });
};

// Clear old logs (for maintenance)
export function clearOldLogs(daysToKeep: number = 30): void {
  const logs = getLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const filtered = logs.filter(log =>
    new Date(log.created_at) > cutoff
  );

  localStorage.setItem(LOGS_KEY, JSON.stringify(filtered));
}
