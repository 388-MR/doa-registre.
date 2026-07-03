import { useAuth } from '../contexts/AuthContext';

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

  // Super admin is specifically matricule 388
  const isSuperAdmin = agent?.matricule === '388';

  // Automatic Commandant DOA for matricules 400 and 302
  const isAutoCommandant = agent?.matricule === '400' || agent?.matricule === '302';

  // Determine effective role
  let role: DoaRole;
  if (isSuperAdmin) {
    role = 'super_admin';
  } else if (isAutoCommandant || agent?.doa_role === 'commandant_doa') {
    role = 'commandant_doa';
  } else {
    role = 'agent_doa';
  }

  const isCommandant = role === 'commandant_doa' || role === 'super_admin';

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
