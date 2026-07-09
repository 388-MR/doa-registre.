import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Plus, Loader2, MapPin, Eye, Trash2, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import {
  getPlantations, createPlantation, deletePlantation,
  PLANTATION_STATUSES, type Plantation
} from '../services/plantations';
import { logCreate, logDelete } from '../services/logger';
import { AuthorFooter } from '../components/ui/AuthorFooter';

export function PlantationsPage() {
  const navigate = useNavigate();
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadPlantations();
  }, []);

  const loadPlantations = async () => {
    setLoading(true);
    const data = await getPlantations();
    setPlantations(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const newPlantation = await createPlantation({
        name: formData.name,
        location: formData.location || undefined,
        status: 'reperee',
      });
      logCreate('plantations', newPlantation.id, newPlantation.name, { status: 'reperee' });
      setPlantations([newPlantation, ...plantations]);
      setShowForm(false);
      setFormData({ name: '', location: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Plantation) => {
    if (!confirm(`Supprimer la plantation "${p.name}" ?`)) return;
    await deletePlantation(p.id);
    logDelete('plantations', p.id, p.name, { status: p.status });
    setPlantations(plantations.filter(x => x.id !== p.id));
  };

  const filteredPlantations = plantations.filter(p => {
    if (!filter) return true;
    return p.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reperee': return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
      case 'sous_surveillance': return <Clock className="w-3.5 h-3.5 text-blue-500" />;
      case 'neutralisee': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      default: return <Leaf className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => PLANTATION_STATUSES.find(s => s.value === status)?.label || status;
  const getStatusColor = (status: string) => PLANTATION_STATUSES.find(s => s.value === status)?.color || '#6b7280';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            Surveillance Plantation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des plantations repérées</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Nouvelle plantation
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Ajouter une plantation</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom / Référence *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
                placeholder="Ex: Plantation Vinewood Hills..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Localisation</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
                placeholder="Description de l'emplacement..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Créer
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${!filter ? 'bg-cyan-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
        >
          Tous ({plantations.length})
        </button>
        {PLANTATION_STATUSES.map(s => {
          const count = plantations.filter(p => p.status === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${filter === s.value ? 'bg-cyan-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              {getStatusIcon(s.value)}
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gray-600 animate-spin" /></div>
      ) : filteredPlantations.length === 0 ? (
        <div className="text-center py-12">
          <Leaf className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucune plantation trouvée</p>
          <p className="text-xs text-gray-700 mt-1">Cliquez sur "Nouvelle plantation" pour commencer le suivi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlantations.map(p => (
            <Fragment key={p.id}>
            <div
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-800/50 bg-gray-900/20 hover:border-gray-700/50 transition-colors group cursor-pointer"
              onClick={() => navigate(`/plantations/${p.id}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200">{p.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: `${getStatusColor(p.status)}20`, color: getStatusColor(p.status) }}
                  >
                    {getStatusIcon(p.status)}
                    {getStatusLabel(p.status)}
                  </span>
                  {p.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />{p.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/plantations/${p.id}`); }}
                  className="p-2 text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(p); }}
                  className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <AuthorFooter createdAt={p.created_at} updatedAt={p.updated_at} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
