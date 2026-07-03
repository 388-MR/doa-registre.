import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Users, Bike, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { getOrganizations, createOrganization } from '../services/organizations';
import type { Organization, OrganizationCategory } from '../types';
import { ThreatBadge } from '../components/ui/Badge';

const CATEGORIES: { id: OrganizationCategory; label: string; icon: typeof Building2; desc: string }[] = [
  { id: 'criminal_org', label: 'Organisations criminelles', icon: Building2, desc: 'Syndicats et réseaux criminels organisés' },
  { id: 'gang', label: 'Gangs', icon: Users, desc: 'Gangs de rue et groupes territoriaux' },
  { id: 'bikers', label: 'Gangs Bikers', icon: Bike, desc: 'Clubs de motards et gangs bikers' },
];

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', category: 'criminal_org' as OrganizationCategory, color: '#4d6fa8', threat_level: 3, description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOrganizations().then(data => { setOrganizations(data); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!newOrg.name.trim()) return;
    setSaving(true);
    try {
      const org = await createOrganization({ ...newOrg, status: 'active', logo_url: null, notes: null });
      navigate(`/organizations/${org.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 text-gray-600 animate-spin" /></div>;

  const byCategory = (cat: OrganizationCategory) => organizations.filter(o => o.category === cat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Affaires</h1>
          <p className="text-sm text-gray-500 mt-0.5">{organizations.length} organisation{organizations.length !== 1 ? 's' : ''} répertoriée{organizations.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          <Plus className="w-4 h-4" />Nouvelle organisation
        </button>
      </div>

      {/* New org form */}
      {showNewForm && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Nouvelle organisation</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom</label>
              <input value={newOrg.name} onChange={e => setNewOrg(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
              <select value={newOrg.category} onChange={e => setNewOrg(p => ({ ...p, category: e.target.value as OrganizationCategory }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors">
                <option value="criminal_org">Organisation criminelle</option>
                <option value="gang">Gang</option>
                <option value="bikers">Gang Bikers</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" value={newOrg.color} onChange={e => setNewOrg(p => ({ ...p, color: e.target.value }))} className="w-10 h-9 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer" />
                <span className="text-xs text-gray-500">{newOrg.color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Niveau de menace (1-5)</label>
              <input type="number" min={1} max={5} value={newOrg.threat_level} onChange={e => setNewOrg(p => ({ ...p, threat_level: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea value={newOrg.description} onChange={e => setNewOrg(p => ({ ...p, description: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newOrg.name.trim()} className="flex items-center gap-2 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Créer
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {CATEGORIES.map(cat => {
          const orgs = byCategory(cat.id);
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{cat.label}</h2>
                <span className="text-xs text-gray-600 ml-1">{orgs.length}</span>
                <div className="flex-1 h-px bg-gray-800 ml-2" />
                <button onClick={() => setShowNewForm(true)} className="text-xs text-gray-600 hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" />Ajouter
                </button>
              </div>
              {orgs.length === 0 ? (
                <div className="text-xs text-gray-700 pl-6 py-2">{cat.desc} — aucune enregistrée</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orgs.map(org => (
                    <Link key={org.id} to={`/organizations/${org.id}`} className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800/60 bg-gray-900/20 hover:border-gray-700 hover:bg-gray-900/40 transition-all">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: org.color || '#4d6fa8' }}>
                        {org.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors truncate">{org.name}</div>
                        <ThreatBadge level={org.threat_level} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
