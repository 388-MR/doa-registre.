import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Edit, X, Loader2, Radio } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { addLog } from '../services/logger';

interface AgentRow {
  id: string;
  matricule: string;
  display_name: string | null;
  code_name: string | null;
  role: string;
  is_active: boolean;
  is_read_only: boolean;
  last_login: string | null;
  last_seen: string | null;
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

export function AgentsPage() {
  const navigate = useNavigate();
  const { isCommandant, isSuperAdmin } = usePermissions();
  const { agent: currentAgent, refreshAgent } = useAuth();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AgentRow | null>(null);
  const [editForm, setEditForm] = useState({ code_name: '', role: 'agent_doa', is_read_only: false });
  const [saving, setSaving] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('matricule');
      if (error) throw error;
      setAgents(data || []);
    } catch {
      setAgents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isCommandant) {
      navigate('/');
      return;
    }
    loadAgents();
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, [isCommandant, navigate, loadAgents]);

  const openEdit = (a: AgentRow) => {
    setEditing(a);
    setEditForm({
      code_name: a.code_name || '',
      role: a.role === 'admin' ? 'commandant_doa' : (a.doa_role || 'agent_doa'),
      is_read_only: a.is_read_only ?? false,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        code_name: editForm.code_name || null,
        is_read_only: editForm.is_read_only,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('agents').update(updates).eq('id', editing.id);

      // Update DOA role in agent_roles table
      const roleValue = editForm.role;
      await supabase
        .from('agent_roles')
        .upsert({ matricule: editing.matricule, role: roleValue, updated_at: new Date().toISOString() }, { onConflict: 'matricule' });

      addLog({
        action: 'update',
        entity_type: 'agent',
        entity_id: editing.id,
        entity_name: `Agent ${editing.matricule}`,
        new_values: { code_name: editForm.code_name, role: roleValue, is_read_only: editForm.is_read_only },
      });

      // If editing self, refresh session
      if (currentAgent?.matricule === editing.matricule) {
        await refreshAgent();
      }

      setEditing(null);
      await loadAgents();
    } catch {
      // ignore
    }
    setSaving(false);
  };

  if (!isCommandant) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-500" />Gestion des Agents
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Administration des agents DOA — rôles, noms de code, permissions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-800">
          <User className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun agent enregistré</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(a => (
            <AgentCard key={a.id} agent={a} onEdit={() => openEdit(a)} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-100">
                Modifier l'agent {editing.matricule}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Nom de code</label>
              <input
                type="text"
                value={editForm.code_name}
                onChange={e => setEditForm(f => ({ ...f, code_name: e.target.value }))}
                placeholder="ex: Juliett"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Rôle DOA</label>
              <select
                value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'agent_doa' | 'commandant_doa' | 'super_admin' }))}
                disabled={!isSuperAdmin && editForm.role === 'commandant_doa'}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 disabled:opacity-50"
              >
                <option value="agent_doa">Agent DOA</option>
                <option value="commandant_doa">Commandant DOA</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
              {!isSuperAdmin && editForm.role === 'commandant_doa' && (
                <p className="text-[10px] text-gray-600 mt-1">Seul le super admin peut modifier les commandants.</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_read_only}
                  onChange={e => setEditForm(f => ({ ...f, is_read_only: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-cyan-600 focus:ring-cyan-700"
                />
                <span className="text-sm text-gray-300">Mode lecture seule</span>
              </label>
              <p className="text-[10px] text-gray-600 mt-1 ml-6">L'agent peut consulter mais ne peut plus créer, modifier ou supprimer.</p>
            </div>

            {editing.last_login && (
              <div className="text-xs text-gray-600">
                Dernière connexion: {new Date(editing.last_login).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-gray-500 hover:text-gray-200 text-sm transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent, onEdit }: { agent: AgentRow; onEdit: () => void }) {
  const online = isOnline(agent.last_seen);
  const isCmd = agent.role === 'admin' || agent.role === 'lead' || agent.doa_role === 'commandant_doa' || agent.doa_role === 'super_admin';

  return (
    <button
      onClick={onEdit}
      className="text-left rounded-xl border border-gray-800/60 bg-gray-900/20 p-4 hover:border-gray-600 hover:bg-gray-900/40 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
            style={{ background: online ? '#22c55e' : '#6b7280' }}
            title={online ? 'En ligne' : 'Hors ligne'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100 truncate group-hover:text-white transition-colors">
              {agent.code_name || agent.display_name || `Agent ${agent.matricule}`}
            </span>
            {online && (
              <span className="flex items-center gap-0.5 text-[9px] text-green-500">
                <Radio className="w-2.5 h-2.5" />En ligne
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">Matricule {agent.matricule}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isCmd ? 'bg-cyan-900/30 text-cyan-500' : 'bg-gray-800 text-gray-500'}`}>
              {isCmd ? 'Commandant DOA' : 'Agent DOA'}
            </span>
            {agent.is_read_only && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-orange-900/30 text-orange-500">
                Lecture seule
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
