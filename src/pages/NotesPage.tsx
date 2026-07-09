import { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Loader2, Trash2, Save, X, Edit3, Image, Video, Search } from 'lucide-react';
import { Lightbox } from '../components/ui/Lightbox';
import { AuthorFooter } from '../components/ui/AuthorFooter';
import {
  getLocalNotes,
  createLocalNote,
  updateLocalNote,
  deleteLocalNote,
  type LocalNote,
} from '../services/storage';

type EditState = { mode: 'new' } | { mode: 'edit'; id: string } | null;

interface FormState {
  title: string;
  content: string;
  photos: string[];
  videos: string[];
  videoInput: string;
}

const EMPTY_FORM: FormState = { title: '', content: '', photos: [], videos: [], videoInput: '' };

export function NotesPage() {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [search, setSearch] = useState('');
  const [editState, setEditState] = useState<EditState>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => setNotes(getLocalNotes());
  useEffect(() => { reload(); }, []);

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleNew = () => {
    setEditState({ mode: 'new' });
    setForm(EMPTY_FORM);
  };

  const handleEdit = (note: LocalNote) => {
    setEditState({ mode: 'edit', id: note.id });
    setForm({
      title: note.title ?? '',
      content: note.content ?? '',
      photos: note.photos_urls,
      videos: note.videos_urls,
      videoInput: '',
    });
  };

  const handleSave = () => {
    if (!form.title.trim() && !form.content.trim() && form.photos.length === 0) return;
    setSaving(true);
    const payload = {
      title: form.title || null,
      content: form.content || null,
      photos_urls: form.photos,
      videos_urls: form.videos,
    };
    if (editState?.mode === 'edit') {
      updateLocalNote(editState.id, payload);
    } else {
      createLocalNote(payload);
    }
    setSaving(false);
    setEditState(null);
    setForm(EMPTY_FORM);
    reload();
  };

  const handleDelete = (id: string) => {
    deleteLocalNote(id);
    if (editState && editState.mode === 'edit' && editState.id === id) {
      setEditState(null);
      setForm(EMPTY_FORM);
    }
    setDeleteConfirm(null);
    reload();
  };

  const handleAddPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setF('photos', [...form.photos, url]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddVideo = () => {
    if (form.videoInput.trim()) {
      setF('videos', [...form.videos, form.videoInput.trim()]);
      setF('videoInput', '');
    }
  };

  const filtered = notes.filter(n =>
    (n.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (n.content ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isEditing = editState !== null;

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />Notes
          </h1>
          <button onClick={handleNew} className="text-cyan-400 hover:text-cyan-300 transition-colors" title="Nouvelle note">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900/40 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-700 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: 'none' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{search ? 'Aucun résultat' : 'Aucune note'}</p>
              {!search && (
                <button onClick={handleNew} className="mt-3 text-xs text-cyan-600 hover:text-cyan-400 transition-colors">
                  + Créer
                </button>
              )}
            </div>
          ) : (
            filtered.map(note => {
              const isActive = editState?.mode === 'edit' && editState.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => handleEdit(note)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                    isActive
                      ? 'border-cyan-800/60 bg-cyan-900/10'
                      : 'border-gray-800/60 bg-gray-900/20 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 truncate">{note.title || 'Sans titre'}</div>
                      <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{note.content || '...'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {note.photos_urls.length > 0 && (
                          <span className="text-[9px] text-gray-700 flex items-center gap-0.5">
                            <Image className="w-2.5 h-2.5" />{note.photos_urls.length}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-700">
                          {new Date(note.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <AuthorFooter createdAt={note.created_at} updatedAt={note.updated_at} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel - editor */}
      <div className="flex-1 flex flex-col bg-gray-900/20 border border-gray-800/60 rounded-xl overflow-hidden">
        {!isEditing ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Edit3 className="w-12 h-12 text-gray-700" />
            <div>
              <p className="text-gray-500 text-sm">Sélectionnez une note</p>
              <p className="text-gray-700 text-xs mt-1">ou créez-en une nouvelle</p>
            </div>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-900/20 text-cyan-500 rounded-lg text-sm hover:bg-cyan-900/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Nouvelle note
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 flex-shrink-0">
              <input
                type="text"
                value={form.title}
                onChange={e => setF('title', e.target.value)}
                placeholder="Titre de la note..."
                className="flex-1 bg-transparent text-base font-semibold text-gray-100 placeholder-gray-700 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors"
                  title="Ajouter une photo"
                >
                  <Image className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Sauvegarder
                </button>
                <button
                  onClick={() => { setEditState(null); setForm(EMPTY_FORM); }}
                  className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Text content */}
            <textarea
              value={form.content}
              onChange={e => setF('content', e.target.value)}
              placeholder="Rédigez votre note ici..."
              className="flex-1 bg-transparent px-5 py-4 text-sm text-gray-200 placeholder-gray-700 focus:outline-none resize-none leading-relaxed"
              style={{ minHeight: 0 }}
            />

            {/* Media section */}
            {(form.photos.length > 0 || form.videos.length > 0) && (
              <div className="px-5 pb-3 border-t border-gray-800/60 pt-3 space-y-3 flex-shrink-0">
                {/* Photos */}
                {form.photos.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-700 mb-2 flex items-center gap-1"><Image className="w-3 h-3" />Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {form.photos.map((p, i) => (
                        <div key={i} className="relative group">
                          <button
                            onClick={() => setLightbox({ imgs: form.photos, idx: i })}
                            className="block rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-700 transition-colors"
                          >
                            <img src={p} alt="" className="w-16 h-16 object-cover" />
                          </button>
                          <button
                            onClick={() => setF('photos', form.photos.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Videos */}
                {form.videos.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-700 mb-2 flex items-center gap-1"><Video className="w-3 h-3" />Vidéos</p>
                    <div className="space-y-1.5">
                      {form.videos.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 truncate flex-1">{v}</span>
                          <button onClick={() => setF('videos', form.videos.filter((_, j) => j !== i))} className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add video bar */}
            <div className="px-4 py-2.5 border-t border-gray-800/60 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <Video className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                <input
                  type="url"
                  value={form.videoInput}
                  onChange={e => setF('videoInput', e.target.value)}
                  placeholder="Coller l'URL d'une vidéo (mp4, webm)..."
                  className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-700 focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideo(); } }}
                />
                {form.videoInput && (
                  <button onClick={handleAddVideo} className="text-xs text-cyan-600 hover:text-cyan-400 transition-colors flex-shrink-0">
                    Ajouter
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
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

      {lightbox && <Lightbox images={lightbox.imgs} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-100 mb-2">Supprimer la note</h3>
            <p className="text-sm text-gray-500 mb-5">Cette note sera définitivement supprimée.</p>
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
