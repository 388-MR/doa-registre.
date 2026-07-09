import { useAuth } from '../contexts/AuthContext';
import type { DoaRoleType } from '../contexts/AuthContext';

export type DoaRole = 'agent_doa' | 'commandant_doa' | 'super_admin';

export interface Permissions {
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
  canViewLogs: boolean;
  canManageThemes: boolean;
  canPromoteUsers: boolean;
  role: DoaRole;
  isCommandant: boolean;
  isSuperAdmin: boolean;
  isReadOnly: boolean;
  canWrite: boolean;
}

export function usePermissions(): Permissions {
  const { agent } = useAuth();

  const role: DoaRole = agent?.doa_role || 'agent_doa';

  const isSuperAdmin = role === 'super_admin';
  const isCommandant = role === 'commandant_doa' || isSuperAdmin;

  const isReadOnly = agent?.is_read_only ?? false;
  const canWrite = !isReadOnly;

  return {
    canRead: true,
    canCreate: canWrite,
    canEdit: canWrite,
    canDelete: canWrite && isCommandant,
    canManageUsers: canWrite && isCommandant,
    canAccessSettings: canWrite && isCommandant,
    canViewLogs: isSuperAdmin || role === 'commandant_doa',
    canManageThemes: isSuperAdmin,
    canPromoteUsers: isSuperAdmin,
    role,
    isCommandant,
    isSuperAdmin,
    isReadOnly,
    canWrite,
  };
}

export { type DoaRoleType };
