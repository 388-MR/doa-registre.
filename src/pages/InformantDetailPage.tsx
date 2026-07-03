import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Plus, Phone, Dna, Briefcase,
  Image, Video, FileText, Loader2, Clock, User, X,
} from 'lucide-react';
import { Lightbox } from '../components/ui/Lightbox';
import {
  getLocalInformant,
  getLocalInformantsAsync,
  deleteLocalInformant,
  getLocalTestimonials,
  createLocalTestimonial,
  deleteLocalTestimonial,
  type LocalInformant,
  type LocalTestimonial,
} from '../services/storage';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';

const FUNCTION_LABELS: Record<string, string> = {
  employee: 'Employé d\'une entreprise',
  gang_member: 'Membre d\'un gang',
  criminal_org: 'Membre d\'une organisation criminelle',
  biker: 'Biker',
  unemployed: 'Sans emploi',
  other: 'Autre',
};

interface TestimonialForm {
  text: string;
  report: string;
  photos: string[];
  videos: string[];
  videoInput: string;
}

const EMPTY_FORM: TestimonialForm = { text: '', report: '', photos: [], videos: [], videoInput: '' };

export function InformantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();
  const { agent } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [informant, setInformant] = useState<LocalInformant | null>(null);
  const [testimonials, setTestimonials] = useState<LocalTestimonial[]>([]);
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TestimonialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const setF = <K extends keyof TestimonialForm>(k: K, v: TestimonialForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!id) return;
    // Try cache first
    const cached = getLocalInformant(id);
    if (cached) {
      setInformant(cached);
      setTestimonials(getLocalTestimonials(id));
    } else {
      // Fallback: load all from Supabase and find this one
      getLocalInformantsAsync().then(all => {
        const found = all.find(i => i.id === id) ?? null;
        setInformant(found);
        setTestimonials(getLocalTestimonials(id));
      });
    }
  }, [id]);

  const reload = () => {
    if (!id) return;
    setTestimonials(getLocalTestimonials(id));
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteLocalInformant(id);
    navigate('/informants');
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

  const handleSaveTestimonial = () => {
    if (!id || (!form.text.trim() && !form.report.trim() && form.photos.length === 0)) return;
    setSaving(true);
    createLocalTestimonial({
      informant_id: id,
      text: form.text || null,
      agent_report: form.report || null,
      agent_matricule: agent?.matricule ?? null,
      photos_urls: form.photos,
      videos_urls: form.videos,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    reload();
  };

  if (!informant) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-500">Indic introuvable.</p>
        <button onClick={() => navigate('/informants')} className="mt-4 text-cyan-500 text-sm hover:underline">
          Retour
        </button>
      </div>
    );
  }

  const fullName = [informant.first_name, informant.last_name].filter(Boolean).join(' ') || 'Inconnu';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/informants')}
          className="mt-1 p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-100">{fullName}</h1>
            {informant.function_type && (
              <span className="text-xs bg-cyan-900/30 text-cyan-500 px-2 py-0.5 rounded-full">
                {FUNCTION_LABELS[informant.function_type] ?? informant.function_type}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Enregistré le {new Date(informant.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/informants/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 text-xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />Modifier
          </button>
          {canDelete && (
            <button
              onClick={() => setDelConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/20 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Photos */}
      {(informant.photo_url || informant.id_card_url) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {informant.photo_url && (
            <div>
              <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5"><User className="w-3 h-3" />Photo du visage</p>
              <button
                onClick={() => setLightbox({ imgs: [informant.photo_url!], idx: 0 })}
                className="block w-full rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors"
              >
                <img src={informant.photo_url} alt="" className="w-full object-contain" style={{ maxHeight: '16rem', background: '#0a0c10' }} />
              </button>
            </div>
          )}
          {informant.id_card_url && (
            <div>
              <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5"><FileText className="w-3 h-3" />Carte d'identité</p>
              <button
                onClick={() => setLightbox({ imgs: [informant.id_card_url!], idx: 0 })}
                className="block w-full rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors"
              >
                <img src={informant.id_card_url} alt="" className="w-full object-contain" style={{ maxHeight: '16rem', background: '#0a0c10' }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info cards */}
      {(informant.phone || informant.dna_profile || informant.function_detail) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {informant.phone && (
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1"><Phone className="w-3.5 h-3.5" />Téléphone</div>
              <p className="text-gray-100 text-sm font-mono">{informant.phone}</p>
            </div>
          )}
          {informant.dna_profile && (
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1"><Dna className="w-3.5 h-3.5" />ADN</div>
              <p className="text-gray-100 text-sm font-mono">{informant.dna_profile}</p>
            </div>
          )}
          {informant.function_detail && (
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-3">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1"><Briefcase className="w-3.5 h-3.5" />Précisions</div>
              <p className="text-gray-100 text-sm">{informant.function_detail}</p>
            </div>
          )}
        </div>
      )}

      {/* Testimonials section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Témoignages
            {testimonials.length > 0 && (
              <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{testimonials.length}</span>
            )}
          </h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400 border border-cyan-900/40 hover:bg-cyan-400/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Ajouter
          </button>
        </div>

        {/* Add testimonial form */}
        {showForm && (
          <div className="rounded-xl border border-cyan-900/40 bg-gray-900/30 p-4 mb-4 space-y-3">
            <h3 className="text-xs font-medium text-cyan-600 uppercase tracking-wider">Nouveau témoignage</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Contenu du témoignage</label>
              <textarea
                value={form.text}
                onChange={e => setF('text', e.target.value)}
                placeholder="Rédigez le témoignage..."
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rapport de l'agent</label>
              <textarea
                value={form.report}
                onChange={e => setF('report', e.target.value)}
                placeholder="Observations de l'agent..."
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors resize-none"
              />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 flex items-center gap-1"><Image className="w-3 h-3" />Photos</label>
              <div className="flex flex-wrap gap-2">
                {form.photos.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                    <button
                      onClick={() => setF('photos', form.photos.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <Image className="w-4 h-4" />
                  <span className="text-[9px] mt-0.5">Ajouter</span>
                </button>
              </div>
            </div>

            {/* Videos */}
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 flex items-center gap-1"><Video className="w-3 h-3" />Vidéos (URL)</label>
              {form.videos.map((v, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <Video className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate flex-1">{v}</span>
                  <button onClick={() => setF('videos', form.videos.filter((_, j) => j !== i))} className="text-gray-700 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.videoInput}
                  onChange={e => setF('videoInput', e.target.value)}
                  placeholder="URL de la vidéo (mp4, webm)..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideo(); } }}
                />
                <button onClick={handleAddVideo} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors">
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveTestimonial}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Enregistrer le témoignage
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Testimonial list */}
        {testimonials.length === 0 && !showForm ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-gray-800">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Aucun témoignage enregistré</p>
            <p className="text-xs text-gray-700 mt-0.5">Cliquez sur "Ajouter" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map(t => (
              <TestimonialCard
                key={t.id}
                testimonial={t}
                canDelete={canDelete}
                onDelete={() => { deleteLocalTestimonial(t.id); reload(); }}
                onLightbox={(imgs, idx) => setLightbox({ imgs, idx })}
              />
            ))}
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

      {/* Delete confirm modal */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-100 mb-2">Supprimer l'indic</h3>
            <p className="text-sm text-gray-500 mb-5">
              Voulez-vous supprimer la fiche de <strong className="text-gray-200">{fullName}</strong> et tous ses témoignages ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelConfirm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-200 text-sm transition-colors">Annuler</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonialCard({
  testimonial, canDelete, onDelete, onLightbox,
}: {
  testimonial: LocalTestimonial;
  canDelete: boolean;
  onDelete: () => void;
  onLightbox: (imgs: string[], idx: number) => void;
}) {
  const date = new Date(testimonial.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/20 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3.5 h-3.5" />
          <span>{dateStr} à {timeStr}</span>
          {testimonial.agent_matricule && (
            <>
              <span className="text-gray-700">·</span>
              <span>Agent N°{testimonial.agent_matricule}</span>
            </>
          )}
        </div>
        {canDelete && !confirm && (
          <button onClick={() => setConfirm(true)} className="text-gray-700 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {confirm && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Supprimer ?</span>
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Oui</button>
            <button onClick={() => setConfirm(false)} className="text-xs text-gray-500 hover:text-gray-300">Non</button>
          </div>
        )}
      </div>

      {testimonial.text && (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{testimonial.text}</p>
      )}

      {testimonial.agent_report && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] text-gray-600 mb-1 uppercase tracking-wider">Rapport agent</p>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{testimonial.agent_report}</p>
        </div>
      )}

      {testimonial.photos_urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {testimonial.photos_urls.map((p, i) => (
            <button
              key={i}
              onClick={() => onLightbox(testimonial.photos_urls, i)}
              className="rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors"
            >
              <img src={p} alt="" className="w-20 h-20 object-cover" />
            </button>
          ))}
        </div>
      )}

      {testimonial.videos_urls.length > 0 && (
        <div className="space-y-2">
          {testimonial.videos_urls.map((v, i) => (
            <video key={i} src={v} controls className="w-full rounded-lg border border-gray-800" style={{ maxHeight: '12rem' }} />
          ))}
        </div>
      )}
    </div>
  );
}
