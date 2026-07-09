import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import supabase from '../lib/supabase';
import { setAuthorshipSession } from '../lib/authorship';
import type { UserRole } from '../types';

export interface Agent {
  id: string;
  matricule: string;
  pin: string;
  role: UserRole;
  doa_role: DoaRoleType;
  display_name: string | null;
  code_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_read_only: boolean;
  last_login: string | null;
  last_seen: string | null;
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

export type DoaRoleType = 'agent_doa' | 'commandant_doa' | 'super_admin';

async function fetchDoaRole(matricule: string): Promise<DoaRoleType> {
  try {
    const { data, error } = await supabase
      .from('agent_roles')
      .select('role')
      .eq('matricule', matricule)
      .maybeSingle();
    if (!error && data?.role) {
      if (data.role === 'super_admin') return 'super_admin';
      if (data.role === 'commandant_doa') return 'commandant_doa';
    }
  } catch { /* table may not exist */ }

  if (matricule === '388') return 'super_admin';

  try {
    const { data } = await supabase
      .from('agents')
      .select('role')
      .ilike('matricule', matricule)
      .maybeSingle();
    if (data?.role === 'admin') return 'commandant_doa';
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
    code_name: null,
    avatar_url: null,
    is_active: true,
    is_read_only: false,
    last_login: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(getStoredAgent);
  const [isLoading, setIsLoading] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount, sync authorship session with any stored agent
  useEffect(() => {
    const stored = getStoredAgent();
    if (stored) {
      setAuthorshipSession({
        matricule: stored.matricule,
        code_name: (stored as Record<string, unknown>).code_name as string | null,
        display_name: (stored as Record<string, unknown>).display_name as string | null,
      });
    }
  }, []);

  const saveAgent = useCallback((a: Agent) => {
    setAgent(a);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ agent: a }));
    setAuthorshipSession({
      matricule: a.matricule,
      code_name: (a as Record<string, unknown>).code_name as string | null,
      display_name: (a as Record<string, unknown>).display_name as string | null,
    });
  }, []);

  const updatePresence = useCallback(async (matricule: string) => {
    try {
      await supabase
        .from('agents')
        .update({ last_seen: new Date().toISOString() })
        .ilike('matricule', matricule);
    } catch { /* ignore */ }
  }, []);

  const login = useCallback(async (matricule: string, pin: string) => {
    setIsLoading(true);
    try {
      const cleanMatricule = matricule.trim();

      const { data: dbAgent } = await supabase
        .from('agents')
        .select('*')
        .ilike('matricule', cleanMatricule)
        .maybeSingle();

      if (dbAgent) {
        if (dbAgent.pin !== pin) { setIsLoading(false); return { error: 'Mot de passe invalide' }; }
        if (!dbAgent.is_active) { setIsLoading(false); return { error: 'Compte désactivé' }; }
        const doaRole = await fetchDoaRole(cleanMatricule);
        const now = new Date().toISOString();
        const fullAgent: Agent = {
          ...dbAgent,
          doa_role: doaRole,
          is_read_only: dbAgent.is_read_only ?? false,
          code_name: dbAgent.code_name ?? null,
          last_seen: now,
        };
        saveAgent(fullAgent);
        supabase
          .from('agents')
          .update({ last_login: now, last_seen: now })
          .ilike('matricule', cleanMatricule)
          .then(() => {});
        setIsLoading(false);
        return { error: null };
      }

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
      const sessionAgent = buildSessionAgent(num, doaRole);
      saveAgent(sessionAgent);
      supabase
        .from('agents')
        .upsert({
          matricule: cleanMatricule,
          pin: '0507',
          role: 'agent',
          last_login: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        }, { onConflict: 'matricule' })
        .then(() => {});
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
    try {
      const { data } = await supabase
        .from('agents')
        .select('*')
        .ilike('matricule', agent.matricule)
        .maybeSingle();
      const doaRole = await fetchDoaRole(agent.matricule);
      if (data) {
        saveAgent({
          ...agent,
          ...data,
          doa_role: doaRole,
          is_read_only: data.is_read_only ?? false,
          code_name: data.code_name ?? null,
        });
      } else if (doaRole !== agent.doa_role) {
        saveAgent({ ...agent, doa_role: doaRole });
      }
    } catch { /* ignore */ }
  }, [agent, saveAgent]);

  const logout = useCallback(async () => {
    if (agent) {
      try {
        await supabase
          .from('agents')
          .update({ last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString() })
          .ilike('matricule', agent.matricule);
      } catch { /* ignore */ }
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    setAgent(null);
    setAuthorshipSession(null);
    localStorage.removeItem(SESSION_KEY);
  }, [agent]);

  useEffect(() => {
    if (!agent) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }
    updatePresence(agent.matricule);
    heartbeatRef.current = setInterval(() => {
      updatePresence(agent.matricule);
    }, 45000);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [agent, updatePresence]);

  useEffect(() => {
    if (!agent) return;
    const onVisible = () => {
      if (!document.hidden) updatePresence(agent.matricule);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [agent, updatePresence]);

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
