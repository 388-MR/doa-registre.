import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from '../components/ui/ImageUpload';
import {
  getLocalInformant,
  createLocalInformant,
  updateLocalInformant,
  getLocalInformantsAsync,
  type LocalInformant,
} from '../services/storage';

const FUNCTION_TYPES = [
  { value: '', label: 'Sélectionner une situation' },
  { value: 'employee', label: 'Employé d\'une entreprise' },
  { value: 'gang_member', label: 'Membre d\'un gang' },
  { value: 'criminal_org', label: 'Membre d\'une organisation criminelle' },
  { value: 'biker', label: 'Biker' },
  { value: 'unemployed', label: 'Sans emploi' },
  { value: 'other', label: 'Autre' },
];

const RELIABILITY_STATUSES = [
  { value: 'inconnu', label: 'Inconnu', color: '#6b7280' },
  { value: 'fiable', label: 'Fiable', color: '#22c55e' },
  { value: 'non_fiable', label: 'Non fiable', color: '#ef4444' },
];

type FormData = Omit<LocalInformant, 'id' | 'created_at' | 'updated_at'>;

const EMPTY: FormData = {
  photo_url: null,
  id_card_url: null,
  first_name: '',
  last_name: '',
  phone: '',
  dna_profile: '',
  function_type: '',
  function_detail: '',
  reliability_status: 'inconnu',
};

export function InformantFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const existing = getLocalInformant(id);
    if (existing) {
      setForm({
        photo_url: existing.photo_url,
        id_card_url: existing.id_card_url,
        first_name: existing.first_name ?? '',
        last_name: existing.last_name ?? '',
        phone: existing.phone ?? '',
        dna_profile: existing.dna_profile ?? '',
        function_type: existing.function_type ?? '',
        function_detail: existing.function_detail ?? '',
        reliability_status: existing.reliability_status ?? 'inconnu',
      });
    }
    setIsLoading(false);
  }, [id]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      ...form,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone: form.phone || null,
      dna_profile: form.dna_profile || null,
      function_type: form.function_type || null,
      function_detail: form.function_detail || null,
      reliability_status: form.reliability_status || 'inconnu',
    };
    try {
      if (id) {
        await updateLocalInformant(id, payload);
      } else {
        await createLocalInformant(payload);
      }
    } finally {
      setIsSaving(false);
      navigate('/informants');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/informants')} className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-100">
          {id ? 'Modifier la fiche indic' : 'Nouvel indic'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photos */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">Photos</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <ImageUpload
              label="Photo du visage"
              value={form.photo_url}
              onChange={v => set('photo_url', v)}
              placeholder="Importer une photo"
            />
            <ImageUpload
              label="Carte d'identité"
              value={form.id_card_url}
              onChange={v => set('id_card_url', v)}
              placeholder="Importer la carte d'identité"
            />
          </div>
        </div>

        {/* Identity */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">Identité</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Prénom</label>
              <input
                type="text"
                value={form.first_name ?? ''}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Jean"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nom</label>
              <input
                type="text"
                value={form.last_name ?? ''}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Dupont"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Numéro de téléphone</label>
            <input
              type="text"
              value={form.phone ?? ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="0612345678"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">ADN (facultatif)</label>
            <input
              type="text"
              value={form.dna_profile ?? ''}
              onChange={e => set('dna_profile', e.target.value)}
              placeholder="DNA-XXXX-XXXX"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
            />
            <p className="text-[11px] text-gray-700 mt-1">Profil ADN issu du fichier biométrique</p>
          </div>
        </div>

        {/* Function */}
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">Fonction / Situation</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Catégorie</label>
            <select
              value={form.function_type ?? ''}
              onChange={e => set('function_type', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700 transition-colors"
            >
              {FUNCTION_TYPES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Précisions (optionnel)</label>
            <input
              type="text"
              value={form.function_detail ?? ''}
              onChange={e => set('function_detail', e.target.value)}
              placeholder="Ex: Employé chez Maze Bank, secteur comptabilité..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Statut de fiabilité</label>
            <div className="flex gap-2">
              {RELIABILITY_STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('reliability_status', s.value as any)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    form.reliability_status === s.value
                      ? 'border-2'
                      : 'border border-gray-700 hover:border-gray-600'
                  }`}
                  style={{
                    background: form.reliability_status === s.value ? `${s.color}20` : 'transparent',
                    borderColor: form.reliability_status === s.value ? s.color : undefined,
                    color: form.reliability_status === s.value ? s.color : '#6b7280',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/informants')}
            className="px-4 py-2 text-gray-500 hover:text-gray-200 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
