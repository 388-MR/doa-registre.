import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Save, Loader2, Trash2, X, Camera, Image, User, Phone, Calendar, Building2 } from 'lucide-react';
import { Lightbox } from '../components/ui/Lightbox';
import { usePermissions } from '../hooks/usePermissions';
import supabase from '../lib/supabase';
import { getLocalInformants, type LocalInformant } from '../services/storage';

const DANGER_LEVELS = [
  { value: 1, label: 'Faible', color: '#22c55e' },
  { value: 2, label: 'Modéré', color: '#f59e0b' },
  { value: 3, label: 'Élevé', color: '#ef4444' },
  { value: 4, label: 'Critique', color: '#dc2626' },
  { value: 5, label: 'Extrême', color: '#7f1d1d' },
];

interface WantedPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  phone: string | null;
  photo_url: string | null;
  id_card_url: string | null;
  reason: string | null;
  danger_level: number;
  organization_id: string | null;
  organization_name?: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'doa_wanted_persons_v1';

function loadWantedPersons(): WantedPerson[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveWantedPersons(persons: WantedPerson[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persons));
}

export function WantedPersonsPage() {
  const navigate = useNavigate();
  const { canCreate, canDelete } = usePermissions();
  const [persons, setPersons] = useState<WantedPerson[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    photo_url: '',
    id_card_url: '',
    reason: '',
    danger_level: 2,
    organization_id: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const idCardRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPersons(loadWantedPersons());
    // Load organizations
    supabase.from('organizations').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setOrganizations(data);
    });
  }, []);

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const newPerson: WantedPerson = {
      id: `local-${Date.now()}`,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      age: form.age ? parseInt(form.age) : null,
      phone: form.phone || null,
      photo_url: form.photo_url || null,
      id_card_url: form.id_card_url || null,
      reason: form.reason || null,
      danger_level: form.danger_level,
      organization_id: form.organization_id || null,
      organization_name: organizations.find(o => o.id === form.organization_id)?.name || null,
      created_at: now,
      updated_at: now,
    };
    const updated = [newPerson, ...persons];
    setPersons(updated);
    saveWantedPersons(updated);
    setSaving(false);
    setShowForm(false);
    setForm({
      first_name: '',
      last_name: '',
      age: '',
      phone: '',
      photo_url: '',
      id_card_url: '',
      reason: '',
      danger_level: 2,
      organization_id: '',
    });
  };

  const handleDelete = (id: string) => {
    const updated = persons.filter(p => p.id !== id);
    setPersons(updated);
    saveWantedPersons(updated);
    setDeleteConfirm(null);
  };

  const handleFileUpload = (field: 'photo_url' | 'id_card_url') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setForm(f => ({ ...f, [field]: url }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const getDangerInfo = (level: number) => DANGER_LEVELS.find(d => d.value === level) || DANGER_LEVELS[1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Avis de recherche
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Personnes activement recherchées</p>
        </div>
        {canCreate && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400 border border-cyan-900/40 hover:bg-cyan-400/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Nouvelle fiche
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prénom</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Âge</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
                placeholder="Ex: 28"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Organisation / Groupe</label>
              <select
                value={form.organization_id}
                onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              >
                <option value="">Inconnu</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dangerosité</label>
              <select
                value={form.danger_level}
                onChange={e => setForm(f => ({ ...f, danger_level: parseInt(e.target.value) }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              >
                {DANGER_LEVELS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Motif de recherche</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              rows={3}
            />
          </div>

          {/* Photos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Photo</label>
              {form.photo_url ? (
                <div className="relative inline-block">
                  <img src={form.photo_url} alt="Photo" className="w-24 h-24 object-cover rounded-lg border border-gray-700" />
                  <button
                    onClick={() => setForm(f => ({ ...f, photo_url: '' }))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleFileUpload('photo_url')}
                  className="w-24 h-24 flex items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Photo CNI</label>
              {form.id_card_url ? (
                <div className="relative inline-block">
                  <img src={form.id_card_url} alt="CNI" className="w-24 h-24 object-cover rounded-lg border border-gray-700" />
                  <button
                    onClick={() => setForm(f => ({ ...f, id_card_url: '' }))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleFileUpload('id_card_url')}
                  className="w-24 h-24 flex items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <Image className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* List */}
      {persons.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500 text-sm">Aucun avis de recherche</p>
          {canCreate && (
            <button onClick={() => setShowForm(true)} className="mt-4 text-xs text-cyan-600 hover:text-cyan-400 transition-colors">
              + Ajouter une fiche
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map(person => {
            const danger = getDangerInfo(person.danger_level);
            return (
              <div key={person.id} className="rounded-xl border border-gray-800/60 bg-gray-900/20 overflow-hidden group hover:border-gray-700 transition-colors">
                {/* Danger bar */}
                <div className="h-1" style={{ background: danger.color }} />

                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Photo */}
                    {person.photo_url ? (
                      <button
                        onClick={() => setLightbox({ imgs: [person.photo_url!], idx: 0 })}
                        className="flex-shrink-0"
                      >
                        <img src={person.photo_url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-100 truncate">
                        {[person.first_name, person.last_name].filter(Boolean).join(' ') || 'Inconnu'}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {person.age && <span className="text-xs text-gray-500">{person.age} ans</span>}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${danger.color}20`, color: danger.color }}>
                          {danger.label}
                        </span>
                      </div>
                      {person.organization_name && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />{person.organization_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {person.reason && (
                    <p className="text-xs text-gray-500 mt-3 line-clamp-2">{person.reason}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/60">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      {person.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{person.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(person.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirm(person.id)}
                        className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && <Lightbox images={lightbox.imgs} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-100 mb-2">Supprimer l'avis de recherche</h3>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-500 hover:text-gray-200 text-sm transition-colors">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
