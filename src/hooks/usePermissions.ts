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

  return {
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: isCommandant, // commandant + super_admin
    canManageUsers: isCommandant, // commandant + super_admin
    canAccessSettings: isCommandant, // commandant + super_admin
    canViewLogs: isSuperAdmin || role === 'commandant_doa', // super_admin + commandants
    canManageThemes: isSuperAdmin, // only super_admin
    canPromoteUsers: isSuperAdmin, // only super_admin can promote/demote commandants
    role,
    isCommandant,
    isSuperAdmin,
  };
}
