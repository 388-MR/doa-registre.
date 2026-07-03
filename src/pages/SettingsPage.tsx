import { useEffect, useState } from 'react';
import { Settings, UserCog, Shield, ShieldCheck, Plus, Save, Loader2, Trash2, AlertTriangle, Palette, Check } from 'lucide-react';
import supabase from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type Theme } from '../contexts/ThemeContext';

interface AgentRole {
  id: string;
  matricule: string;
  role: 'agent_doa' | 'commandant_doa';
  display_name: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  agent_doa: 'Agent DOA',
  commandant_doa: 'Commandant DOA',
  super_admin: 'Super Administrateur',
};

const ROLE_DESC: Record<string, string> = {
  agent_doa: 'Peut consulter, ajouter et modifier. Ne peut pas supprimer.',
  commandant_doa: 'Tous les droits — suppression, gestion des utilisateurs, paramètres, logs.',
  super_admin: 'Accès total — gestion des thèmes, promotion des commandants, tous les droits.',
};

const ROLES_STORAGE_KEY = 'doa_roles_v2';

function loadRolesFromStorage(): AgentRole[] {
  try {
    const stored = localStorage.getItem(ROLES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveRolesToStorage(roles: AgentRole[]) {
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
}

const THEME_OPTIONS: { id: Theme; label: string; colors: string[] }[] = [
  { id: 'dark', label: 'Thème sombre', colors: ['#0c0f14', '#22d3ee', '#1a2030'] },
  { id: 'light', label: 'Thème clair', colors: ['#ffffff', '#0891b2', '#f1f5f9'] },
  { id: 'pink', label: 'Thème rose', colors: ['#240c18', '#ec4899', '#2d1430'] },
];

export function SettingsPage() {
  const { isCommandant, isSuperAdmin, canManageThemes } = usePermissions();
  const { agent, refreshAgent } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ matricule: '', role: 'agent_doa', display_name: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCommandant) {
      navigate('/');
      return;
    }
    loadRoles();
  }, [isCommandant, navigate]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_roles')
        .select('*')
        .order('matricule');
      if (!error && data) {
        setRoles(data);
        saveRolesToStorage(data);
      } else {
        // Fallback to localStorage
        setRoles(loadRolesFromStorage());
      }
    } catch {
      // Fallback to localStorage
      setRoles(loadRolesFromStorage());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    const num = parseInt(form.matricule, 10);
    if (isNaN(num) || num < 301 || num > 400) {
      setError('Le matricule doit être un nombre entre 301 et 400.');
      return;
    }
    setSaving(true);
    const newRole: AgentRole = {
      id: `local-${num}`,
      matricule: String(num),
      role: form.role as 'agent_doa' | 'commandant_doa',
      display_name: form.display_name || null,
      created_at: new Date().toISOString(),
    };
    try {
      const { error: err } = await supabase.from('agent_roles').upsert({
        matricule: String(num),
        role: form.role,
        display_name: form.display_name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'matricule' });
      if (err) throw err;
      await loadRoles();
    } catch {
      // Fallback: save to localStorage
      const existing = loadRolesFromStorage();
      const filtered = existing.filter(r => r.matricule !== String(num));
      const updated = [...filtered, newRole].sort((a, b) => parseInt(a.matricule) - parseInt(b.matricule));
      saveRolesToStorage(updated);
      setRoles(updated);
    }
    if (agent?.matricule === String(num)) await refreshAgent();
    setShowForm(false);
    setForm({ matricule: '', role: 'agent_doa', display_name: '' });
    setSaving(false);
  };

  const handleDelete = async (id: string, matricule: string) => {
    if (matricule === agent?.matricule) return;
    try {
      await supabase.from('agent_roles').delete().eq('id', id);
      await loadRoles();
    } catch {
      // Fallback: delete from localStorage
      const existing = loadRolesFromStorage();
      const updated = existing.filter(r => r.id !== id && r.matricule !== matricule);
      saveRolesToStorage(updated);
      setRoles(updated);
    }
  };

  const handleRoleChange = async (id: string, matricule: string, newRole: 'agent_doa' | 'commandant_doa') => {
    try {
      await supabase.from('agent_roles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', id);
      if (agent?.matricule === matricule) await refreshAgent();
      await loadRoles();
    } catch {
      // Fallback: update in localStorage
      const existing = loadRolesFromStorage();
      const updated = existing.map(r => r.id === id || r.matricule === matricule ? { ...r, role: newRole } : r);
      saveRolesToStorage(updated);
      setRoles(updated);
      if (agent?.matricule === matricule) await refreshAgent();
    }
  };

  if (!isCommandant) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-500" />Paramètres
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Administration — Gestion des accès et des rôles</p>
      </div>

      {/* Theme settings - Only for super admin (388) */}
      {canManageThemes && (
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">Thème global</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Sélectionnez le thème visuel pour l'ensemble de l'application.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`relative rounded-xl border-2 p-3 transition-all ${
                  theme === opt.id
                    ? 'border-cyan-500 bg-gray-900/60'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900/30'
                }`}
              >
                {theme === opt.id && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex gap-1 mb-2">
                  {opt.colors.map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="text-xs font-medium text-gray-200">{opt.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Le thème sera appliqué immédiatement à toutes les pages.
          </p>
        </div>
      )}

      {/* Roles info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              {key === 'super_admin'
                ? <ShieldCheck className="w-4 h-4 text-yellow-400" />
                : key === 'commandant_doa'
                  ? <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  : <Shield className="w-4 h-4 text-gray-500" />}
              <span className="text-sm font-semibold text-gray-100">{label}</span>
            </div>
            <p className="text-xs text-gray-500">{ROLE_DESC[key]}</p>
          </div>
        ))}
      </div>

      {/* User management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-gray-500" />Gestion des agents
          </h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400 border border-cyan-900/40 hover:bg-cyan-400/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Assigner un rôle
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-medium text-gray-400 mb-3">Assigner un rôle à un matricule</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Matricule (301–400)</label>
                <input
                  type="number"
                  min="301"
                  max="400"
                  value={form.matricule}
                  onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))}
                  placeholder="Ex: 394"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors"
                >
                  <option value="agent_doa">Agent DOA</option>
                  <option value="commandant_doa">Commandant DOA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nom affiché (optionnel)</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="Ex: Inspecteur Martin"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
                />
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />{error}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
              </button>
              <button onClick={() => { setShowForm(false); setError(null); }} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-gray-600 animate-spin" /></div>
        ) : roles.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-800">
            <UserCog className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Aucun rôle configuré</p>
            <p className="text-xs text-gray-700 mt-1">Par défaut, tous les agents ont le rôle "Agent DOA"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800/60 bg-gray-900/20 hover:border-gray-700 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                  {r.role === 'commandant_doa'
                    ? <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    : <Shield className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">Matricule {r.matricule}</span>
                    {r.matricule === agent?.matricule && <span className="text-[10px] bg-cyan-900/30 text-cyan-600 px-1.5 py-0.5 rounded">Vous</span>}
                    {r.matricule === '388' && <span className="text-[10px] bg-yellow-900/30 text-yellow-500 px-1.5 py-0.5 rounded">Super Admin</span>}
                  </div>
                  {r.display_name && <span className="text-xs text-gray-500">{r.display_name}</span>}
                </div>
                <select
                  value={r.role}
                  onChange={e => handleRoleChange(r.id, r.matricule, e.target.value as any)}
                  disabled={r.matricule === agent?.matricule || r.matricule === '388'}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="agent_doa">Agent DOA</option>
                  <option value="commandant_doa">Commandant DOA</option>
                </select>
                {r.matricule !== agent?.matricule && r.matricule !== '388' && (
                  <button
                    onClick={() => handleDelete(r.id, r.matricule)}
                    className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-700 mt-4 text-center">
          Les agents sans rôle configuré ont automatiquement le rôle "Agent DOA"
        </p>
      </div>
    </div>
  );
}
