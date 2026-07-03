import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import supabase from '../lib/supabase';
import type { UserRole } from '../types';

export interface Agent {
  id: string;
  matricule: string;
  pin: string;
  role: UserRole;
  doa_role: 'agent_doa' | 'commandant_doa';
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  agent: Agent | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (matricule: string, pin: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshAgent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = 'doa_session_v3';

function getStoredAgent(): Agent | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored).agent ?? null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

function isValidMatricule(raw: string): number | null {
  const cleaned = raw.trim();
  const num = parseInt(cleaned, 10);
  if (!isNaN(num) && num >= 301 && num <= 400 && String(num) === cleaned) return num;
  return null;
}

async function fetchDoaRole(matricule: string): Promise<'agent_doa' | 'commandant_doa'> {
  // Automatic Commandant DOA for specific matricules
  if (matricule === '400' || matricule === '302') return 'commandant_doa';

  // Check agent_roles table first (preferred)
  try {
    const { data, error } = await supabase
      .from('agent_roles')
      .select('role')
      .eq('matricule', matricule)
      .maybeSingle();
    if (!error && data?.role) return data.role as 'agent_doa' | 'commandant_doa';
  } catch { /* table may not exist */ }

  // Fallback: check agents table (admin → commandant_doa)
  try {
    const { data } = await supabase
      .from('agents')
      .select('role')
      .ilike('matricule', matricule)
      .maybeSingle();
    if (data?.role === 'admin') return 'commandant_doa';
  } catch { /* ignore */ }

  // localStorage fallback
  try {
    const stored = localStorage.getItem('doa_roles');
    if (stored) {
      const roles = JSON.parse(stored) as Record<string, string>;
      if (roles[matricule] === 'commandant_doa') return 'commandant_doa';
    }
  } catch { /* ignore */ }

  return 'agent_doa';
}

function buildSessionAgent(matriculeNum: number, doaRole: 'agent_doa' | 'commandant_doa' = 'agent_doa'): Agent {
  return {
    id: `local-${matriculeNum}`,
    matricule: String(matriculeNum),
    pin: String(matriculeNum),
    role: 'agent',
    doa_role: doaRole,
    display_name: doaRole === 'commandant_doa' ? `Commandant N°${matriculeNum}` : `Agent N°${matriculeNum}`,
    avatar_url: null,
    is_active: true,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(getStoredAgent);
  const [isLoading, setIsLoading] = useState(false);

  const saveAgent = useCallback((a: Agent) => {
    setAgent(a);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ agent: a }));
  }, []);

  const login = useCallback(async (matricule: string, pin: string) => {
    setIsLoading(true);
    try {
      const cleanMatricule = matricule.trim();

      // Try agents table first (for pre-configured accounts)
      const { data: dbAgent } = await supabase
        .from('agents')
        .select('*')
        .ilike('matricule', cleanMatricule)
        .maybeSingle();

      if (dbAgent) {
        if (dbAgent.pin !== pin) { setIsLoading(false); return { error: 'Mot de passe invalide' }; }
        if (!dbAgent.is_active) { setIsLoading(false); return { error: 'Compte désactivé' }; }
        const doaRole = await fetchDoaRole(cleanMatricule);
        const fullAgent: Agent = { ...dbAgent, doa_role: doaRole };
        saveAgent(fullAgent);
        setIsLoading(false);
        return { error: null };
      }

      // Accept 301-400 range with fixed password "0507"
      const num = isValidMatricule(cleanMatricule);
      if (num === null) {
        setIsLoading(false);
        return { error: 'Matricule invalide. Saisissez un nombre entre 301 et 400.' };
      }
      if (pin !== '0507') {
        setIsLoading(false);
        return { error: 'Mot de passe invalide.' };
      }
      const doaRole = await fetchDoaRole(cleanMatricule);
      saveAgent(buildSessionAgent(num, doaRole));
      setIsLoading(false);
      return { error: null };
    } catch {
      const num = isValidMatricule(matricule.trim());
      if (num !== null && pin === '0507') {
        saveAgent(buildSessionAgent(num, 'agent_doa'));
        setIsLoading(false);
        return { error: null };
      }
      setIsLoading(false);
      return { error: 'Erreur de connexion.' };
    }
  }, [saveAgent]);

  const refreshAgent = useCallback(async () => {
    if (!agent) return;
    const doaRole = await fetchDoaRole(agent.matricule);
    if (doaRole !== agent.doa_role) {
      saveAgent({ ...agent, doa_role: doaRole });
    }
  }, [agent, saveAgent]);

  const logout = useCallback(async () => {
    setAgent(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, isLoading, isAuthenticated: !!agent, login, logout, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUserRole(): UserRole | null {
  return useAuth().agent?.role ?? null;
}
