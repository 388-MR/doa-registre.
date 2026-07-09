import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Leaf, ArrowLeft, Loader2, Save, Trash2, Plus, Camera, X, Send, CheckCircle, Clock, AlertCircle, MapPin, Image, MessageSquare
} from 'lucide-react';
import {
  getPlantation, updatePlantation, deletePlantation, addPlantationEntry, deletePlantationEntry,
  PLANTATION_STATUSES, type Plantation, type PlantationEntry
} from '../services/plantations';
import { logUpdate, logDelete, logCreate } from '../services/logger';
import { Lightbox } from '../components/ui/Lightbox';
import { AuthorFooter } from '../components/ui/AuthorFooter';

export function PlantationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plantation, setPlantation] = useState<Plantation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [viewMode, setViewMode] = useState<'thread' | 'gallery'>('thread');
  const [editData, setEditData] = useState({ name: '', location: '', status: '', neutralized_at: '' });
  const [entryForm, setEntryForm] = useState({ notes: '', photos: [] as string[] });
  const [addingEntry, setAddingEntry] = useState(false);
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    loadPlantation();
  }, [id]);

  const loadPlantation = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getPlantation(id);
    setPlantation(data);
    if (data) {
      setEditData({
        name: data.name,
        location: data.location || '',
        status: data.status,
        neutralized_at: data.neutralized_at || '',
      });
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!id || !plantation) return;
    setSaving(true);
    try {
      const updated = await updatePlantation(id, {
        name: editData.name,
        location: editData.location || null,
        status: editData.status,
        neutralized_at: editData.status === 'neutralisee' ? (editData.neutralized_at || new Date().toISOString().split('T')[0]) : null,
      });
      if (updated) {
        logUpdate('plantations', id, updated.name, { old: plantation }, { new: updated });
        setPlantation({ ...updated, entries: plantation.entries });
        setShowEdit(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !plantation) return;
    if (!confirm(`Supprimer la plantation "${plantation.name}" et tout son suivi ?`)) return;
    await deletePlantation(id);
    logDelete('plantations', id, plantation.name, { status: plantation.status });
    navigate('/plantations');
  };

  const handleAddPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setEntryForm(f => ({ ...f, photos: [...f.photos, url] }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddEntry = async () => {
    if (!id || (!entryForm.notes.trim() && entryForm.photos.length === 0)) return;
    setAddingEntry(true);
    try {
      const newEntry = await addPlantationEntry(id, {
        notes: entryForm.notes || undefined,
        photos: entryForm.photos.length > 0 ? entryForm.photos : undefined,
      });
      logCreate('plantation_entries', newEntry.id, `Entrée plantation ${id}`, { notes: entryForm.notes });
      setPlantation(p => p ? { ...p, entries: [...(p.entries || []), newEntry] } : p);
      setEntryForm({ notes: '', photos: [] });
    } finally {
      setAddingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    await deletePlantationEntry(entryId);
    logDelete('plantation_entries', entryId, 'Entrée', {});
    setPlantation(p => p ? { ...p, entries: (p.entries || []).filter(e => e.id !== entryId) } : p);
  };

  // Collect all photos from all entries for gallery
  const allPhotos: { url: string; entryId: string; entryDate: string; author: string }[] = [];
  plantation?.entries?.forEach(entry => {
    entry.photos?.forEach(photo => {
      allPhotos.push({
        url: photo,
        entryId: entry.id,
        entryDate: entry.created_at,
        author: entry.author_name || entry.author_matricule || 'Agent',
      });
    });
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reperee': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'sous_surveillance': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'neutralisee': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Leaf className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => PLANTATION_STATUSES.find(s => s.value === status)?.label || status;
  const getStatusColor = (status: string) => PLANTATION_STATUSES.find(s => s.value === status)?.color || '#6b7280';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
      </div>
    );
  }

  if (!plantation) {
    return (
      <div className="text-center py-12">
        <Leaf className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Plantation non trouvée</p>
        <button onClick={() => navigate('/plantations')} className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/plantations')}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />Retour aux plantations
      </button>

      {/* Header */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        {showEdit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Localisation</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={e => setEditData(d => ({ ...d, location: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Statut</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  {PLANTATION_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {editData.status === 'neutralisee' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date de neutralisation</label>
                  <input
                    type="date"
                    value={editData.neutralized_at}
                    onChange={e => setEditData(d => ({ ...d, neutralized_at: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
              <button onClick={() => setShowEdit(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-100">{plantation.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                      style={{ background: `${getStatusColor(plantation.status)}20`, color: getStatusColor(plantation.status) }}
                    >
                      {getStatusIcon(plantation.status)}
                      {getStatusLabel(plantation.status)}
                    </span>
                    {plantation.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{plantation.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg text-xs hover:text-gray-200 hover:border-gray-600 transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-red-400 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('thread')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            viewMode === 'thread' ? 'bg-cyan-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />Fil de suivi
        </button>
        <button
          onClick={() => setViewMode('gallery')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            viewMode === 'gallery' ? 'bg-cyan-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Image className="w-3.5 h-3.5" />Galerie photos ({allPhotos.length})
        </button>
      </div>

      {viewMode === 'gallery' ? (
        /* Gallery view */
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Image className="w-4 h-4" />Toutes les photos
          </h2>
          {allPhotos.length === 0 ? (
            <div className="text-center py-8">
              <Image className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Aucune photo disponible</p>
              <p className="text-xs text-gray-700 mt-1">Ajoutez des photos dans le fil de suivi</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {allPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative group cursor-pointer"
                  onClick={() => setLightbox({ imgs: allPhotos.map(p => p.url), idx: i })}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg border border-gray-700 hover:border-cyan-700 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                    <div className="text-[10px] text-white">
                      <div className="font-medium">{photo.author}</div>
                      <div className="text-gray-300">{new Date(photo.entryDate).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Thread view */
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Fil de suivi</h2>

          {/* Add entry */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-cyan-400">+</span>
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  value={entryForm.notes}
                  onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Nouvelle observation..."
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 resize-none"
                />
                {/* Photos */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {entryForm.photos.map((p, i) => (
                      <div key={i} className="relative group">
                        <img src={p} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                        <button
                          onClick={() => setEntryForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-16 h-16 flex items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-300 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleAddPhoto(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                <button
                  onClick={handleAddEntry}
                  disabled={addingEntry || (!entryForm.notes.trim() && entryForm.photos.length === 0)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {addingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Entries list */}
          {(!plantation.entries || plantation.entries.length === 0) ? (
            <div className="text-center py-8 bg-gray-900/20 rounded-xl border border-gray-800/50">
              <p className="text-sm text-gray-600">Aucune observation enregistrée</p>
              <p className="text-xs text-gray-700 mt-1">Utilisez le formulaire ci-dessus pour ajouter un suivi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plantation.entries.map(entry => (
                <div key={entry.id} className="bg-gray-900/30 border border-gray-800/50 rounded-xl p-4 group">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-400">
                      {(entry.author_name || entry.author_matricule || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="font-medium text-gray-400">{entry.author_name || entry.author_matricule || 'Agent'}</span>
                        <span>·</span>
                        <span>{new Date(entry.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      {entry.photos && entry.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {entry.photos.map((p, i) => (
                            <img
                              key={i}
                              src={p}
                              alt=""
                              className="w-20 h-20 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-cyan-700 transition-colors"
                              onClick={() => setLightbox({ imgs: entry.photos || [], idx: i })}
                            />
                          ))}
                        </div>
                      )}
                      {entry.notes && (
                        <p className="text-sm text-gray-300">{entry.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox images={lightbox.imgs} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}

      <AuthorFooter createdAt={plantation.created_at} createdMatricule={plantation.created_by_matricule} createdCodename={plantation.created_by_codename} updatedAt={plantation.updated_at} updatedMatricule={plantation.updated_by_matricule} updatedCodename={plantation.updated_by_codename} />
    </div>
  );
}
