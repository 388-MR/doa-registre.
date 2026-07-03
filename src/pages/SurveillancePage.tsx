import { useEffect, useState } from 'react';
import { Eye, Plus, Search, Loader2, Trash2, Save, X, Users } from 'lucide-react';
import supabase from '../lib/supabase';
import { getMembers } from '../services/organizations';
import type { Member } from '../types';

interface SurveillanceRecord {
  id: string;
  target_member_id: string | null;
  target_location: string | null;
  start_date: string;
  end_date: string | null;
  report: string | null;
  status: string;
  observations: string | null;
  habits: string | null;
  schedule: string | null;
  frequented_locations: string | null;
  history: string | null;
  created_at: string;
  target_member?: Member | null;
}

const ORG_FUNCTIONS: Record<string, string> = {
  leader: 'Leader', co_leader: 'Co-Leader', haut_grade: 'Haut Gradé',
  bas_grade: 'Bas Gradé', inconnu: 'Inconnu',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'completed', label: 'Terminée', color: '#60a5fa' },
  { value: 'cancelled', label: 'Annulée', color: '#6b7280' },
];

export function SurveillancePage() {
  const [records, setRecords] = useState<SurveillanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<SurveillanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({
    target_member_id: '', target_location: '', start_date: new Date().toISOString().split('T')[0],
    status: 'active', report: '', observations: '', habits: '', schedule: '', frequented_locations: '',
  });

  useEffect(() => {
    Promise.all([loadRecords(), getMembers().then(m => setMembers(m))]);
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('surveillance')
      .select('*, target_member:members(id, first_name, last_name, nickname, grade, organization:organizations(name))')
      .order('created_at', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        target_member_id: formData.target_member_id || null,
        target_type: formData.target_member_id ? 'member' : 'location',
        target_location: formData.target_location || null,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        status: formData.status || 'active',
        report: formData.report || null,
        observations: formData.observations || null,
        habits: formData.habits || null,
        schedule: formData.schedule || null,
        frequented_locations: formData.frequented_locations || null,
        agents: [],
      };
      if (selected) {
        await supabase.from('surveillance').update(payload).eq('id', selected.id);
      } else {
        await supabase.from('surveillance').insert(payload);
      }
      await loadRecords();
      setShowForm(false);
      setSelected(null);
      setFormData({ target_member_id: '', target_location: '', start_date: new Date().toISOString().split('T')[0], status: 'active', report: '', observations: '', habits: '', schedule: '', frequented_locations: '' });
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('surveillance').delete().eq('id', id);
    await loadRecords();
  };

  const handleEdit = (rec: SurveillanceRecord) => {
    setSelected(rec);
    setFormData({
      target_member_id: rec.target_member_id || '',
      target_location: rec.target_location || '',
      start_date: rec.start_date || '',
      status: rec.status || 'active',
      report: rec.report || '',
      observations: rec.observations || '',
      habits: rec.habits || '',
      schedule: rec.schedule || '',
      frequented_locations: rec.frequented_locations || '',
    });
    setShowForm(true);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    const memberName = r.target_member ? [r.target_member.first_name, r.target_member.last_name].filter(Boolean).join(' ').toLowerCase() : '';
    return memberName.includes(q) || (r.target_location || '').toLowerCase().includes(q);
  });

  const fc = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }));
  const inp = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors";

  const priorityMembers = members.filter(m => ['leader', 'co_leader', 'haut_grade'].includes(m.grade || ''));
  const otherMembers = members.filter(m => !['leader', 'co_leader', 'haut_grade'].includes(m.grade || ''));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-500" />Surveillance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Surveillance d'individus et de cibles</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowForm(true); setFormData({ target_member_id: '', target_location: '', start_date: new Date().toISOString().split('T')[0], status: 'active', report: '', observations: '', habits: '', schedule: '', frequented_locations: '' }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          <Plus className="w-4 h-4" />Nouvelle fiche
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une cible..." className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-800 transition-colors" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">{selected ? 'Modifier la fiche' : 'Nouvelle fiche de surveillance'}</h3>
            <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-gray-600 hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Membre surveillé</label>
                <select value={formData.target_member_id} onChange={e => fc('target_member_id', e.target.value)} className={inp}>
                  <option value="">— Aucun membre spécifique —</option>
                  {priorityMembers.length > 0 && (
                    <optgroup label="Prioritaires (Leaders / Co-Leaders / Hauts gradés)">
                      {priorityMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu'} — {ORG_FUNCTIONS[m.grade||'inconnu']}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherMembers.length > 0 && (
                    <optgroup label="Autres membres">
                      {otherMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lieu / Cible</label>
                <input type="text" value={formData.target_location} onChange={e => fc('target_location', e.target.value)} placeholder="Adresse, zone..." className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                <input type="date" value={formData.start_date} onChange={e => fc('start_date', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Statut</label>
                <select value={formData.status} onChange={e => fc('status', e.target.value)} className={inp}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Habitudes connues</label>
                <textarea value={formData.habits} onChange={e => fc('habits', e.target.value)} className={inp} rows={2} placeholder="Routine, comportements..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horaires</label>
                <textarea value={formData.schedule} onChange={e => fc('schedule', e.target.value)} className={inp} rows={2} placeholder="Horaires fréquents..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lieux fréquentés</label>
                <textarea value={formData.frequented_locations} onChange={e => fc('frequented_locations', e.target.value)} className={inp} rows={2} placeholder="Bars, garages, entrepôts..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Observations</label>
                <textarea value={formData.observations} onChange={e => fc('observations', e.target.value)} className={inp} rows={2} placeholder="Notes d'observation..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rapport de surveillance</label>
              <textarea value={formData.report} onChange={e => fc('report', e.target.value)} className={inp} rows={3} placeholder="Rapport détaillé..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
            </button>
            <button onClick={() => { setShowForm(false); setSelected(null); }} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-gray-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Eye className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-gray-500">Aucune fiche de surveillance</p>
          <button onClick={() => setShowForm(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-900/20 text-cyan-500 rounded-lg text-sm hover:bg-cyan-900/40 transition-colors">
            <Plus className="w-3.5 h-3.5" />Créer une fiche
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(rec => {
            const m = rec.target_member;
            const name = m ? [m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Membre' : rec.target_location || 'Cible inconnue';
            const statusOpt = STATUS_OPTIONS.find(s => s.value === rec.status);
            return (
              <div key={rec.id} className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-4 hover:border-gray-700 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-300 flex-shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-100 text-sm">{name}</div>
                      {m && <div className="text-xs text-gray-500">{ORG_FUNCTIONS[m.grade||'inconnu']} {m.organization ? `· ${(m.organization as any).name}` : ''}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusOpt?.color || '#6b7280' }} />
                    <span className="text-xs" style={{ color: statusOpt?.color || '#6b7280' }}>{statusOpt?.label || rec.status}</span>
                  </div>
                </div>

                {rec.observations && (
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Observations</div>
                    <p className="text-xs text-gray-400 line-clamp-2">{rec.observations}</p>
                  </div>
                )}
                {rec.habits && (
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Habitudes</div>
                    <p className="text-xs text-gray-400 line-clamp-2">{rec.habits}</p>
                  </div>
                )}
                {rec.frequented_locations && (
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Lieux fréquentés</div>
                    <p className="text-xs text-gray-400 line-clamp-2">{rec.frequented_locations}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/60">
                  <span className="text-xs text-gray-600">{rec.start_date ? new Date(rec.start_date+'T12:00:00').toLocaleDateString('fr-FR') : '—'}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(rec)} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">Modifier</button>
                    <button onClick={() => handleDelete(rec.id)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
