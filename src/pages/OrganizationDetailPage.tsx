import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Plus, Save, Users, Car, Briefcase,
  Shield, MapPin, Home, Gavel, Camera, Loader2, AlertTriangle, X,
  FileText, CalendarDays, Image, Video, ExternalLink, Download,
  FolderOpen, BookMarked,
} from 'lucide-react';
import { getOrganization, getMembers, getVehicles, getHeadquarters, getHideouts,
  getBusinesses, getTerritories, deleteOrganization } from '../services/organizations';
import supabase from '../lib/supabase';
import type { Organization, Member, Vehicle, Headquarters, Hideout, Business, Territory } from '../types';
import { ThreatBadge } from '../components/ui/Badge';
import { usePermissions } from '../hooks/usePermissions';
import { EvidenceEditor } from '../components/evidence/EvidenceEditor';
import type { ContentBlock } from '../components/evidence/EvidenceEditor';
import { Lightbox } from '../components/ui/Lightbox';
import { CRIME_TYPES, getCrimeLabel } from '../services/crimes';
import { logCreate, logUpdate, logDelete, logExport } from '../services/logger';
import {
  getOrganizationRelations, createRelation, updateRelation, deleteRelation,
  RELATION_TYPES, getRelationTypeLabel, getRelationTypeColor, type OrganizationRelation
} from '../services/relations';

type Tab = 'dossier' | 'journal_crime' | 'membres' | 'vehicules' | 'business' | 'qg' | 'planques' | 'proprietes' | 'arrestations' | 'preuves' | 'relations';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'dossier', label: 'Dossier complet', icon: FolderOpen },
  { id: 'journal_crime', label: 'Journal de crime', icon: BookMarked },
  { id: 'relations', label: 'Relations', icon: Users },
  { id: 'membres', label: 'Membres', icon: Users },
  { id: 'vehicules', label: 'Véhicules', icon: Car },
  { id: 'business', label: 'Business connus', icon: Briefcase },
  { id: 'qg', label: 'QG', icon: Shield },
  { id: 'planques', label: 'Planques / Labos', icon: MapPin },
  { id: 'proprietes', label: 'Propriétés des membres', icon: Home },
  { id: 'arrestations', label: 'Arrestations', icon: Gavel },
  { id: 'preuves', label: 'Preuves', icon: Camera },
];

const ORG_FUNCTIONS: Record<string, string> = {
  leader: 'Leader', co_leader: 'Co-Leader', haut_grade: 'Haut Gradé',
  bas_grade: 'Bas Gradé', inconnu: 'Inconnu',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', incarcerated: '#ef4444', deceased: '#6b7280', unknown: '#f59e0b',
};

interface MediaFormData {
  photos: string[];
  videos: string[];
  videoInput: string;
}

interface FormDataType extends Record<string, string> {
  // QG specific
  name?: string;
  description?: string;
  photo_facade?: string;
  photo_angle2?: string;
  photo_gps?: string;
  photo_free?: string;
}

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();
  const [org, setOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('membres');
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hq, setHq] = useState<Headquarters[]>([]);
  const [hideouts, setHideouts] = useState<Hideout[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [arrests, setArrests] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormDataType>({});
  const [mediaData, setMediaData] = useState<MediaFormData>({ photos: [], videos: [], videoInput: '' });
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  // Evidence editor state
  const [evidenceBlocks, setEvidenceBlocks] = useState<ContentBlock[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceAuthor, setEvidenceAuthor] = useState('');
  const [evidenceDate, setEvidenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingEvidence, setViewingEvidence] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getOrganization(id).then(data => { setOrg(data); setLoading(false); });
  }, [id]);

  const loadTab = useCallback(async (tab: Tab) => {
    if (!id) return;
    setTabLoading(true);
    try {
      if (tab === 'membres') setMembers(await getMembers(id));
      else if (tab === 'vehicules') setVehicles(await getVehicles(id));
      else if (tab === 'qg') setHq(await getHeadquarters(id));
      else if (tab === 'planques') setHideouts(await getHideouts(id));
      else if (tab === 'business') setBusinesses(await getBusinesses(id));
      else if (tab === 'proprietes') setTerritories(await getTerritories(id));
      else if (tab === 'arrestations') {
        const { data } = await supabase
          .from('arrests')
          .select('*, member:members(first_name, last_name, organization_id)')
          .order('arrest_date', { ascending: false });
        setArrests((data || []).filter((a: any) => a.member?.organization_id === id));
      } else if (tab === 'preuves') {
        const { data } = await supabase.from('evidence').select('*').order('created_at', { ascending: false }).limit(200);
        const filtered = (data || []).filter((e: any) => {
          try {
            const meta = e.metadata && typeof e.metadata === 'object' ? e.metadata : {};
            return meta?.organization_id === id;
          } catch { return false; }
        });
        setEvidence(filtered);
      }
    } finally {
      setTabLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setShowForm(false);
    setFormData({});
    setMediaData({ photos: [], videos: [], videoInput: '' });
    setViewingItem(null);
    setViewingEvidence(null);
    setEvidenceBlocks([]);
    setEvidenceTitle('');
    setEvidenceAuthor('');
    setEvidenceDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteOrganization(id);
    navigate('/');
  };

  const handleAddPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setMediaData(m => ({ ...m, photos: [...m.photos, url] }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddVideo = () => {
    if (mediaData.videoInput.trim()) {
      setMediaData(m => ({ ...m, videos: [...m.videos, m.videoInput.trim()], videoInput: '' }));
    }
  };

  // Store media as JSON in observations field since schema may not have separate columns
  const serializeMedia = (): string => {
    const media = { photos: mediaData.photos, videos: mediaData.videos };
    const obs = formData.observations || '';
    return obs + '\n[MEDIA]' + JSON.stringify(media);
  };

  const parseMedia = (raw?: string | null): { photos: string[]; videos: string[] } => {
    if (!raw) return { photos: [], videos: [] };
    try {
      const idx = raw.indexOf('[MEDIA]');
      if (idx === -1) return { photos: [], videos: [] };
      return JSON.parse(raw.slice(idx + 7));
    } catch { return { photos: [], videos: [] }; }
  };

  const stripMedia = (raw?: string | null): string => {
    if (!raw) return '';
    const idx = raw.indexOf('[MEDIA]');
    return idx === -1 ? raw : raw.slice(0, idx).trim();
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      if (activeTab === 'membres') {
        await supabase.from('members').insert({ organization_id: id, first_name: formData.first_name || null, last_name: formData.last_name || null, nickname: formData.nickname || null, phone: formData.phone || null, grade: formData.grade || 'inconnu', status: 'active', danger_level: 1 });
        await loadTab('membres');
      } else if (activeTab === 'vehicules') {
        const mediaJson = JSON.stringify({ photos: mediaData.photos, videos: mediaData.videos });
        await supabase.from('vehicles').insert({ organization_id: id, plate: formData.plate || null, make: formData.make || null, model: formData.model || null, color: formData.color || null, status: 'active', notes: mediaJson });
        await loadTab('vehicules');
      } else if (activeTab === 'business') {
        const mediaJson = JSON.stringify({ photos: mediaData.photos, videos: mediaData.videos });
        await supabase.from('businesses').insert({ organization_id: id, name: formData.name || null, address: formData.address || null, activity_type: formData.activity_type || null, status: 'active', notes: mediaJson });
        await loadTab('business');
      } else if (activeTab === 'qg') {
        const qgData = {
          organization_id: id,
          address: formData.address || null,
          observations: JSON.stringify({
            name: formData.name || null,
            description: formData.description || null,
            observations: formData.observations || null,
            photo_facade: formData.photo_facade || null,
            photo_angle2: formData.photo_angle2 || null,
            photo_gps: formData.photo_gps || null,
            photo_free: formData.photo_free || null,
            videos: mediaData.videos,
          }),
          status: 'active'
        };
        await supabase.from('headquarters').insert(qgData);
        await loadTab('qg');
      } else if (activeTab === 'planques') {
        const mediaJson = JSON.stringify({ photos: mediaData.photos, videos: mediaData.videos });
        await supabase.from('hideouts').insert({ organization_id: id, address: formData.address || null, type: formData.type || 'hideout', observations: (formData.observations || '') + '\n[MEDIA]' + mediaJson, status: 'active' });
        await loadTab('planques');
      } else if (activeTab === 'proprietes') {
        const mediaJson = JSON.stringify({ photos: mediaData.photos, videos: mediaData.videos });
        await supabase.from('territories').insert({ organization_id: id, name: formData.address || 'Propriété', description: (formData.description || '') + '\n[MEDIA]' + mediaJson, status: 'controlled' });
        await loadTab('proprietes');
      } else if (activeTab === 'arrestations') {
        const personName = formData.person_name?.trim() || 'Inconnu';
        const parts = personName.split(' ');
        const { data: existing } = await supabase.from('members').select('id').eq('organization_id', id).ilike('first_name', parts[0] || '').maybeSingle();
        let memberId = existing?.id;
        if (!memberId) {
          const { data: nm } = await supabase.from('members').insert({ organization_id: id, first_name: parts[0] || null, last_name: parts.slice(1).join(' ') || null, status: 'active', danger_level: 1 }).select('id').single();
          memberId = nm?.id;
        }
        if (memberId) {
          await supabase.from('arrests').insert({ member_id: memberId, arrest_date: formData.date || new Date().toISOString().split('T')[0], charges: formData.motif ? [formData.motif] : [], notes: formData.agent ? `Agent: ${formData.agent}` : null, judicial_outcome: formData.casier_url || null });
          await loadTab('arrestations');
        }
      } else if (activeTab === 'preuves') {
        const firstPhoto = evidenceBlocks.find(b => b.type === 'photo')?.content || null;
        await supabase.from('evidence').insert({
          type: 'photo',
          title: evidenceTitle || 'Preuve sans titre',
          description: evidenceBlocks.length > 0 ? evidenceBlocks.map(b => b.type === 'text' ? b.content : `[${b.type}]`).join('\n') : null,
          file_url: firstPhoto,
          metadata: {
            organization_id: id,
            author_name: evidenceAuthor || null,
            evidence_date: evidenceDate || null,
            blocks: evidenceBlocks,
          },
        });
        setEvidenceBlocks([]);
        setEvidenceTitle('');
        setEvidenceAuthor('');
        setEvidenceDate(new Date().toISOString().split('T')[0]);
        await loadTab('preuves');
      }
      setShowForm(false);
      setFormData({});
      setMediaData({ photos: [], videos: [], videoInput: '' });
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleDeleteItem = async (table: string, itemId: string) => {
    await supabase.from(table).delete().eq('id', itemId);
    await loadTab(activeTab);
  };

  const exportOrg = async (format: 'pdf' | 'html') => {
    // Generate HTML content for export
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dossier ${org.name} - DOA Mission Row</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #1a3a5c; border-bottom: 2px solid #22d3ee; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat { display: inline-block; background: #e0f2fe; padding: 5px 10px; border-radius: 4px; margin: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f3f4f6; font-weight: 600; }
    .threat-high { color: #dc2626; font-weight: bold; }
    .threat-medium { color: #f59e0b; }
    .threat-low { color: #22c55e; }
    img { max-width: 200px; margin: 5px; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Dossier: ${org.name}</h1>
  <div class="section">
    <p><strong>Catégorie:</strong> ${catLabel}</p>
    <p><strong>Niveau de menace:</strong> <span class="${org.threat_level >= 4 ? 'threat-high' : org.threat_level >= 3 ? 'threat-medium' : 'threat-low'}">${org.threat_level}/5</span></p>
    <p><strong>Statut:</strong> ${org.status === 'active' ? 'Actif' : org.status}</p>
    ${org.description ? `<p><strong>Description:</strong> ${org.description}</p>` : ''}
  </div>

  <h2>Membres (${members.length})</h2>
  <div class="section">
    ${members.length > 0 ? `
      <table>
        <tr><th>Nom</th><th>Fonction</th><th>Statut</th><th>Téléphone</th></tr>
        ${members.map(m => `
          <tr>
            <td>${[m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu'}</td>
            <td>${ORG_FUNCTIONS[m.grade || 'inconnu'] || 'Inconnu'}</td>
            <td>${m.status === 'active' ? 'Actif' : m.status === 'incarcerated' ? 'Incarcéré' : m.status}</td>
            <td>${m.phone || '-'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>Aucun membre enregistré</p>'}
  </div>

  <h2>Véhicules (${vehicles.length})</h2>
  <div class="section">
    ${vehicles.length > 0 ? `
      <table>
        <tr><th>Plaque</th><th>Marque</th><th>Modèle</th><th>Couleur</th></tr>
        ${vehicles.map(v => `
          <tr>
            <td>${v.plate || '-'}</td>
            <td>${v.make || '-'}</td>
            <td>${v.model || '-'}</td>
            <td>${v.color || '-'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>Aucun véhicule enregistré</p>'}
  </div>

  <h2>Business (${businesses.length})</h2>
  <div class="section">
    ${businesses.length > 0 ? `
      <table>
        <tr><th>Nom</th><th>Adresse</th><th>Type</th></tr>
        ${businesses.map(b => `
          <tr>
            <td>${b.name || '-'}</td>
            <td>${b.address || '-'}</td>
            <td>${b.activity_type || '-'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>Aucun business enregistré</p>'}
  </div>

  <h2>QG (${hq.length})</h2>
  <div class="section">
    ${hq.length > 0 ? hq.map(h => `
      <p><strong>Adresse:</strong> ${h.address || 'Non renseignée'}</p>
      ${h.observations ? `<p><strong>Observations:</strong> ${h.observations.split('[MEDIA]')[0]}</p>` : ''}
    `).join('') : '<p>Aucun QG enregistré</p>'}
  </div>

  <h2>Planques / Labos (${hideouts.length})</h2>
  <div class="section">
    ${hideouts.length > 0 ? `
      <table>
        <tr><th>Type</th><th>Adresse</th><th>Observations</th></tr>
        ${hideouts.map(h => `
          <tr>
            <td>${h.type === 'hideout' ? 'Planque' : h.type === 'lab' ? 'Laboratoire' : h.type === 'plantation_pots' ? 'Plantation' : 'Entrepôt'}</td>
            <td>${h.address || '-'}</td>
            <td>${(h.observations || '').split('[MEDIA]')[0] || '-'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>Aucune planque enregistrée</p>'}
  </div>

  <div class="footer">
    <p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p>DOA Mission Row - Registre des organisations criminelles</p>
  </div>
</body>
</html>
    `;

    if (format === 'html') {
      // Download as HTML file
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dossier-${org.name.toLowerCase().replace(/\s+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // For PDF, open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>;

  if (!org) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertTriangle className="w-12 h-12 text-gray-600" />
      <p className="text-gray-400">Organisation introuvable</p>
      <button onClick={() => navigate(-1)} className="text-cyan-400 text-sm">Retour</button>
    </div>
  );

  const catLabel = org.category === 'criminal_org' ? 'Org. criminelle' : org.category === 'gang' ? 'Gang' : 'Gang Bikers';

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="mt-1 p-1.5 rounded-lg text-gray-600 hover:text-gray-200 hover:bg-white/5 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: org.color || '#4d6fa8' }}>
              {org.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">{org.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <ThreatBadge level={org.threat_level} />
                <span className="text-xs text-gray-600">{catLabel}</span>
              </div>
            </div>
          </div>
          {org.description && <p className="text-sm text-gray-500 mt-2">{org.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => exportOrg('pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 transition-colors"
            title="Exporter en PDF"
          >
            <Download className="w-3.5 h-3.5" />PDF
          </button>
          <button
            onClick={() => exportOrg('html')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 transition-colors"
            title="Exporter en HTML"
          >
            <ExternalLink className="w-3.5 h-3.5" />HTML
          </button>
          <Link to={`/organizations/${org.id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 transition-colors">
            <Edit className="w-3.5 h-3.5" />Modifier
          </Link>
          {canDelete && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-lg text-red-700 hover:text-red-400 hover:bg-red-500/10 border border-red-900/30 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-100 mb-2">Supprimer {org.name} ?</h3>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-600 transition-colors">Annuler</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-lg text-sm text-white bg-red-700 hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 overflow-x-auto hide-scrollbar mb-6" style={{ borderBottom: '1px solid #1a2030' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-600 hover:text-gray-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
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

      {/* Content */}
      {tabLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 text-gray-600 animate-spin" /></div>
      ) : (
        <TabContent
          tab={activeTab} members={members} vehicles={vehicles} hq={hq} hideouts={hideouts}
          businesses={businesses} territories={territories} arrests={arrests} evidence={evidence} org={org}
          showForm={showForm} formData={formData} saving={saving} mediaData={mediaData}
          canDelete={canDelete}
          evidenceBlocks={evidenceBlocks} onEvidenceBlocksChange={setEvidenceBlocks}
          evidenceTitle={evidenceTitle} onEvidenceTitleChange={setEvidenceTitle}
          evidenceAuthor={evidenceAuthor} onEvidenceAuthorChange={setEvidenceAuthor}
          evidenceDate={evidenceDate} onEvidenceDateChange={setEvidenceDate}
          viewingEvidence={viewingEvidence} onViewEvidence={setViewingEvidence}
          viewingItem={viewingItem} onViewItem={setViewingItem}
          onShowForm={() => setShowForm(true)}
          onHideForm={() => { setShowForm(false); setFormData({}); setMediaData({ photos: [], videos: [], videoInput: '' }); }}
          onFormChange={(k, v) => setFormData(p => ({ ...p, [k]: v }))}
          onMediaChange={setMediaData}
          onSave={handleSave}
          onDeleteItem={handleDeleteItem}
          fileRef={fileRef}
          onAddPhoto={handleAddPhoto}
          onAddVideo={handleAddVideo}
          setLightbox={setLightbox}
        />
      )}
    </div>
  );
}

interface TCProps {
  tab: Tab; members: Member[]; vehicles: Vehicle[]; hq: Headquarters[]; hideouts: Hideout[];
  businesses: Business[]; territories: Territory[]; arrests: any[]; evidence: any[]; org: Organization;
  showForm: boolean; formData: FormDataType; saving: boolean; mediaData: MediaFormData;
  canDelete: boolean;
  evidenceBlocks: ContentBlock[]; onEvidenceBlocksChange: (b: ContentBlock[]) => void;
  evidenceTitle: string; onEvidenceTitleChange: (v: string) => void;
  evidenceAuthor: string; onEvidenceAuthorChange: (v: string) => void;
  evidenceDate: string; onEvidenceDateChange: (v: string) => void;
  viewingEvidence: any | null; onViewEvidence: (e: any | null) => void;
  viewingItem: any | null; onViewItem: (e: any | null) => void;
  onShowForm: () => void; onHideForm: () => void; onFormChange: (k: string, v: string) => void;
  onMediaChange: (m: MediaFormData) => void;
  onSave: () => void; onDeleteItem: (table: string, id: string) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  onAddPhoto: (file: File) => void;
  onAddVideo: () => void;
  setLightbox: (lb: { imgs: string[]; idx: number } | null) => void;
}

function TabContent(p: TCProps) {
  if (p.tab === 'dossier') return <DossierTab {...p} />;
  if (p.tab === 'journal_crime') return <JournalCrimeTab {...p} />;
  if (p.tab === 'relations') return <RelationsTab {...p} />;
  if (p.tab === 'membres') return <MembresTab {...p} />;
  if (p.tab === 'vehicules') return <VehiculesTab {...p} />;
  if (p.tab === 'business') return <BusinessTab {...p} />;
  if (p.tab === 'qg') return <QGTab {...p} />;
  if (p.tab === 'planques') return <PlanquesTab {...p} />;
  if (p.tab === 'proprietes') return <ProprietesTab {...p} />;
  if (p.tab === 'arrestations') return <ArrestationsTab {...p} />;
  if (p.tab === 'preuves') return <PreuvesTab {...p} />;
  return null;
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400 border border-cyan-900/40 hover:bg-cyan-400/10 transition-colors">{children}</button>;
}

function FWrap({ onSave, onCancel, saving, children }: { onSave: () => void; onCancel: () => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4">
      <div className="space-y-3">{children}</div>
      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
      </div>
    </div>
  );
}

function F({ label, name, value, onChange, type = 'text', opts, placeholder }: { label: string; name: string; value: string; onChange: (k: string, v: string) => void; type?: string; opts?: { value: string; label: string }[]; placeholder?: string }) {
  const cls = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors";
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {opts ? <select value={value} onChange={e => onChange(name, e.target.value)} className={cls}>{opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : type === 'textarea' ? <textarea value={value} onChange={e => onChange(name, e.target.value)} className={cls} rows={2} placeholder={placeholder} />
        : <input type={type} value={value} onChange={e => onChange(name, e.target.value)} className={cls} placeholder={placeholder} />}
    </div>
  );
}

function Empty({ icon: Icon, msg, onAdd, addLabel }: { icon: typeof Users; msg: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-9 h-9 text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm">{msg}</p>
      {onAdd && <button onClick={onAdd} className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-900/20 text-cyan-500 rounded-lg text-sm hover:bg-cyan-900/40 transition-colors"><Plus className="w-3.5 h-3.5" />{addLabel}</button>}
    </div>
  );
}

function Row({ children, table, id, onDeleteItem, canDelete }: { children: React.ReactNode; table?: string; id?: string; onDeleteItem?: (t: string, id: string) => void; canDelete?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-800/50 bg-gray-900/20 hover:border-gray-700/50 transition-colors group">
      <div className="flex-1 min-w-0">{children}</div>
      {canDelete && table && id && onDeleteItem && (
        <button onClick={() => onDeleteItem(table, id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Media section component for forms
function MediaSection({ mediaData, onMediaChange, fileRef, onAddVideo }: { mediaData: MediaFormData; onMediaChange: (m: MediaFormData) => void; fileRef: React.RefObject<HTMLInputElement>; onAddVideo: () => void }) {
  const setF = <K extends keyof MediaFormData>(k: K, v: MediaFormData[K]) =>
    onMediaChange({ ...mediaData, [k]: v });

  return (
    <div className="space-y-3">
      {/* Photos */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Photos</label>
        <div className="flex flex-wrap gap-2">
          {mediaData.photos.map((p, i) => (
            <div key={i} className="relative group">
              <img src={p} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
              <button
                onClick={() => onMediaChange({ ...mediaData, photos: mediaData.photos.filter((_, j) => j !== i) })}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 flex items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Videos */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Vidéos (URLs)</label>
        <div className="space-y-1.5">
          {mediaData.videos.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate flex-1">{v}</span>
              <button onClick={() => onMediaChange({ ...mediaData, videos: mediaData.videos.filter((_, j) => j !== i) })} className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 items-center">
            <Video className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
            <input
              type="url"
              value={mediaData.videoInput}
              onChange={e => setF('videoInput', e.target.value)}
              placeholder="Coller l'URL d'une vidéo..."
              className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-700 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddVideo(); } }}
            />
            {mediaData.videoInput && (
              <button onClick={onAddVideo} className="text-xs text-cyan-600 hover:text-cyan-400 transition-colors flex-shrink-0">
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Display media in item view
function MediaDisplay({ photos, videos, setLightbox }: { photos: string[]; videos: string[]; setLightbox: (lb: { imgs: string[]; idx: number } | null) => void }) {
  if (photos.length === 0 && videos.length === 0) return null;
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      {photos.map((p, i) => (
        <button key={i} onClick={() => setLightbox({ imgs: photos, idx: i })} className="block">
          <img src={p} alt="" className="w-12 h-12 object-cover rounded border border-gray-700 hover:border-cyan-700 transition-colors" />
        </button>
      ))}
      {videos.map((v, i) => (
        <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800/50 text-xs text-gray-500 hover:text-cyan-400 transition-colors">
          <Video className="w-3 h-3" />Vidéo
        </a>
      ))}
    </div>
  );
}

const funcOpts = Object.entries(ORG_FUNCTIONS).map(([v, l]) => ({ value: v, label: l }));

function MembresTab(p: TCProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.members.length} membre{p.members.length !== 1 ? 's' : ''}</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouveau membre</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Prénom" name="first_name" value={p.formData.first_name||''} onChange={p.onFormChange} />
          <F label="Nom" name="last_name" value={p.formData.last_name||''} onChange={p.onFormChange} />
          <F label="Surnom" name="nickname" value={p.formData.nickname||''} onChange={p.onFormChange} />
          <F label="Téléphone" name="phone" value={p.formData.phone||''} onChange={p.onFormChange} />
        </div>
        <F label="Fonction dans l'organisation" name="grade" value={p.formData.grade||'inconnu'} onChange={p.onFormChange} opts={funcOpts} />
      </FWrap>}
      {p.members.length === 0 && !p.showForm ? <Empty icon={Users} msg="Aucun membre enregistré" onAdd={p.onShowForm} addLabel="Ajouter un membre" /> : (
        <div className="space-y-2">
          {p.members.map(m => (
            <Row key={m.id} table="members" id={m.id} onDeleteItem={p.onDeleteItem} canDelete={p.canDelete}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-400 flex-shrink-0">
                  {(m.first_name?.[0] || m.nickname?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu'}
                    {m.nickname && (m.first_name || m.last_name) && <span className="text-gray-600 ml-1 text-xs">"{m.nickname}"</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[m.status]||'#6b7280' }} />
                    <span className="text-xs text-gray-500">{ORG_FUNCTIONS[m.grade||'inconnu']||'Inconnu'}</span>
                    {m.phone && <span className="text-xs text-gray-700">· {m.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-1 ml-11">
                <Link to={`/members/${m.id}`} className="text-xs text-gray-700 hover:text-cyan-400 transition-colors">Voir la fiche →</Link>
              </div>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function VehiculesTab(p: TCProps) {
  const parseMediaSafe = (notes?: string | null): { photos: string[]; videos: string[] } => {
    if (!notes) return { photos: [], videos: [] };
    try { return JSON.parse(notes); } catch { return { photos: [], videos: [] }; }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.vehicles.length} véhicule{p.vehicles.length!==1?'s':''}</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouveau véhicule</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Plaque" name="plate" value={p.formData.plate||''} onChange={p.onFormChange} />
          <F label="Couleur" name="color" value={p.formData.color||''} onChange={p.onFormChange} />
          <F label="Marque" name="make" value={p.formData.make||''} onChange={p.onFormChange} />
          <F label="Modèle" name="model" value={p.formData.model||''} onChange={p.onFormChange} />
        </div>
        <MediaSection mediaData={p.mediaData} onMediaChange={p.onMediaChange} fileRef={p.fileRef} onAddVideo={p.onAddVideo} />
      </FWrap>}
      {p.vehicles.length===0 && !p.showForm ? <Empty icon={Car} msg="Aucun véhicule enregistré" onAdd={p.onShowForm} addLabel="Ajouter un véhicule" /> : (
        <div className="space-y-2">
          {p.vehicles.map(v => {
            const media = parseMediaSafe(v.notes);
            return (
              <Row key={v.id} table="vehicles" id={v.id} onDeleteItem={p.onDeleteItem} canDelete={p.canDelete}>
                <div className="text-sm font-medium text-gray-200">{v.plate||'Plaque inconnue'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{[v.make,v.model,v.color].filter(Boolean).join(' · ')}</div>
                <MediaDisplay photos={media.photos} videos={media.videos} setLightbox={p.setLightbox} />
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BusinessTab(p: TCProps) {
  const parseMediaSafe = (notes?: string | null): { photos: string[]; videos: string[] } => {
    if (!notes) return { photos: [], videos: [] };
    try { return JSON.parse(notes); } catch { return { photos: [], videos: [] }; }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.businesses.length} business</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouveau business</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <F label="Nom" name="name" value={p.formData.name||''} onChange={p.onFormChange} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Adresse" name="address" value={p.formData.address||''} onChange={p.onFormChange} />
          <F label="Type d'activité" name="activity_type" value={p.formData.activity_type||''} onChange={p.onFormChange} />
        </div>
        <MediaSection mediaData={p.mediaData} onMediaChange={p.onMediaChange} fileRef={p.fileRef} onAddVideo={p.onAddVideo} />
      </FWrap>}
      {p.businesses.length===0 && !p.showForm ? <Empty icon={Briefcase} msg="Aucun business enregistré" onAdd={p.onShowForm} addLabel="Ajouter" /> : (
        <div className="space-y-2">
          {p.businesses.map(b => {
            const media = parseMediaSafe(b.notes);
            return (
              <Row key={b.id} table="businesses" id={b.id} onDeleteItem={p.onDeleteItem} canDelete={p.canDelete}>
                <div className="text-sm font-medium text-gray-200">{b.name||'Sans nom'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{[b.address,b.activity_type].filter(Boolean).join(' · ')}</div>
                <MediaDisplay photos={media.photos} videos={media.videos} setLightbox={p.setLightbox} />
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Completely rewritten QGTab with name, address, observations, 4 photo slots, videos
function QGTab(p: TCProps) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Parse QG data from observations (stored as JSON)
  const parseQGData = (obs?: string | null) => {
    try {
      if (!obs) return { name: null, description: null, observations: null, photo_facade: null, photo_angle2: null, photo_gps: null, photo_free: null, videos: [] };
      return JSON.parse(obs);
    } catch { return { name: null, description: null, observations: obs, photo_facade: null, photo_angle2: null, photo_gps: null, photo_free: null, videos: [] }; }
  };

  const handlePhotoUpload = (slot: 'photo_facade' | 'photo_angle2' | 'photo_gps' | 'photo_free') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        p.onFormChange(slot, url);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Detail view
  if (p.viewingItem) {
    const data = parseQGData(p.viewingItem.observations);
    const allPhotos = [data.photo_facade, data.photo_angle2, data.photo_gps, data.photo_free].filter(Boolean) as string[];
    return (
      <div>
        <button onClick={() => p.onViewItem(null)} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />Retour aux QG
        </button>
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100">{data.name || p.viewingItem.address || 'QG'}</h2>
                {data.description && <p className="text-sm text-gray-400 mt-1">{data.description}</p>}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.viewingItem.address || 'Adresse non renseignée'}
                </div>
              </div>
              {p.canDelete && (
                <button onClick={() => { p.onDeleteItem('headquarters', p.viewingItem.id); p.onViewItem(null); }} className="p-2 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Photo grid - 4 predefined slots */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {[
              { key: 'photo_facade', label: 'Façade' },
              { key: 'photo_angle2', label: 'Autre angle' },
              { key: 'photo_gps', label: 'GPS / Plan' },
              { key: 'photo_free', label: 'Libre' },
            ].map(({ key, label }) => {
              const url = data[key as keyof typeof data] as string | null;
              return (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1.5">{label}</label>
                  {url ? (
                <button
                      onClick={() => allPhotos.length > 0 && p.setLightbox({ imgs: allPhotos, idx: allPhotos.indexOf(url) })}
                      className="block w-full rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-700 transition-colors"
                    >
                      <img src={url} alt={label} className="w-full h-32 object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-32 rounded-lg border border-dashed border-gray-700 bg-gray-900/40 flex items-center justify-center text-gray-700">
                      <Image className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Videos */}
          {data.videos && data.videos.length > 0 && (
            <div className="px-6 pb-6">
              <label className="block text-xs text-gray-600 mb-2">Vidéos</label>
              <div className="flex flex-wrap gap-2">
                {data.videos.map((v: string, i: number) => (
                  <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-700 transition-colors">
                    <Video className="w-3.5 h-3.5" />Vidéo {i + 1}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Observations */}
          {data.observations && (
            <div className="px-6 pb-6">
              <label className="block text-xs text-gray-600 mb-2">Observations</label>
              <div className="bg-gray-800/30 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">{data.observations}</div>
            </div>
          )}
        </div>
        {lightboxImg && allPhotos.length > 0 && (
          <Lightbox images={allPhotos} initialIndex={allPhotos.indexOf(lightboxImg)} onClose={() => setLightboxImg(null)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.hq.length} QG</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouveau QG</Btn>}
      </div>
      {p.showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Nom / Description courte" name="name" value={p.formData.name||''} onChange={p.onFormChange} placeholder="Ex: QG Principal, Entrepôt..." />
            <F label="Adresse" name="address" value={p.formData.address||''} onChange={p.onFormChange} placeholder="Adresse du QG" />
          </div>
          <F label="Description" name="description" value={p.formData.description||''} onChange={p.onFormChange} type="textarea" placeholder="Description du QG..." />
          <F label="Observations" name="observations" value={p.formData.observations||''} onChange={p.onFormChange} type="textarea" placeholder="Observations supplémentaires..." />

          {/* 4 predefined photo slots */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Photos</label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'photo_facade', label: 'Façade' },
                { key: 'photo_angle2', label: 'Angle 2' },
                { key: 'photo_gps', label: 'GPS/Plan' },
                { key: 'photo_free', label: 'Libre' },
              ].map(({ key, label }) => {
                const url = p.formData[key as keyof typeof p.formData] as string | undefined;
                return (
                  <div key={key}>
                    <label className="block text-[10px] text-gray-600 mb-1">{label}</label>
                    {url ? (
                      <div className="relative group aspect-square">
                        <img src={url} alt={label} className="w-full h-full object-cover rounded-lg border border-gray-700" />
                        <button
                          type="button"
                          onClick={() => p.onFormChange(key, '')}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePhotoUpload(key as any)}
                        className="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        <Camera className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">{label}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Videos section */}
          <MediaSection mediaData={p.mediaData} onMediaChange={p.onMediaChange} fileRef={p.fileRef} onAddVideo={p.onAddVideo} />

          <div className="flex gap-2">
            <button onClick={p.onSave} disabled={p.saving} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              {p.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
            </button>
            <button onClick={p.onHideForm} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}
      {p.hq.length===0 && !p.showForm ? <Empty icon={Shield} msg="Aucun QG enregistré" onAdd={p.onShowForm} addLabel="Ajouter un QG" /> : (
        <div className="space-y-3">
          {p.hq.map(h => {
            const data = parseQGData(h.observations);
            const photos = [data.photo_facade, data.photo_angle2, data.photo_gps, data.photo_free].filter(Boolean) as string[];
            return (
              <div
                key={h.id}
                onClick={() => p.onViewItem(h)}
                className="flex gap-4 p-4 rounded-xl border border-gray-800/50 bg-gray-900/20 hover:border-cyan-900/40 hover:bg-gray-900/40 transition-all cursor-pointer group"
              >
                {/* Thumbnail */}
                {photos.length > 0 ? (
                  <img src={photos[0]} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-800 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-gray-800 bg-gray-900/60 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-gray-700" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-100 text-sm group-hover:text-white transition-colors">{data.name || h.address || 'QG'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{h.address || 'Adresse non renseignée'}</div>
                  {data.description && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{data.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {photos.length > 0 && <span className="text-xs text-gray-700 flex items-center gap-1"><Image className="w-3 h-3" />{photos.length}</span>}
                    {data.videos?.length > 0 && <span className="text-xs text-gray-700 flex items-center gap-1"><Video className="w-3 h-3" />{data.videos.length}</span>}
                  </div>
                </div>
                {p.canDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); p.onDeleteItem('headquarters', h.id); }}
                    className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-start mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanquesTab(p: TCProps) {
  const typeOpts = [
    { value:'hideout', label:'Planque' },
    { value:'lab', label:'Laboratoire' },
    { value:'warehouse', label:'Entrepôt' },
    { value:'plantation_pots', label:'Plantation de pots' },
  ];
  const typeLabels: Record<string,string> = {
    hideout:'Planque',
    lab:'Laboratoire',
    warehouse:'Entrepôt',
    plantation_pots:'Plantation de pots',
  };

  const parseMediaFromObs = (obs?: string | null): { photos: string[]; videos: string[] } => {
    if (!obs) return { photos: [], videos: [] };
    const idx = obs.indexOf('[MEDIA]');
    if (idx === -1) return { photos: [], videos: [] };
    try { return JSON.parse(obs.slice(idx + 7)); } catch { return { photos: [], videos: [] }; }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.hideouts.length} planque{p.hideouts.length!==1?'s':''}</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouvelle planque</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <F label="Type" name="type" value={p.formData.type||'hideout'} onChange={p.onFormChange} opts={typeOpts} />
        <F label="Adresse (optionnel)" name="address" value={p.formData.address||''} onChange={p.onFormChange} placeholder="Si connue..." />
        <F label="Observations" name="observations" value={p.formData.observations||''} onChange={p.onFormChange} type="textarea" />
        <MediaSection mediaData={p.mediaData} onMediaChange={p.onMediaChange} fileRef={p.fileRef} onAddVideo={p.onAddVideo} />
      </FWrap>}
      {p.hideouts.length===0 && !p.showForm ? <Empty icon={MapPin} msg="Aucune planque enregistrée" onAdd={p.onShowForm} addLabel="Ajouter" /> : (
        <div className="space-y-2">
          {p.hideouts.map(h => {
            const media = parseMediaFromObs(h.observations);
            const cleanObs = h.observations?.split('[MEDIA]')[0] || '';
            return (
              <Row key={h.id} table="hideouts" id={h.id} onDeleteItem={p.onDeleteItem} canDelete={p.canDelete}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{typeLabels[h.type]||h.type}</span>
                  {h.address && <span className="text-xs text-gray-500">— {h.address}</span>}
                </div>
                {cleanObs && <div className="text-xs text-gray-600 mt-0.5">{cleanObs}</div>}
                <MediaDisplay photos={media.photos} videos={media.videos} setLightbox={p.setLightbox} />
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProprietesTab(p: TCProps) {
  const parseMediaFromDesc = (desc?: string | null): { photos: string[]; videos: string[] } => {
    if (!desc) return { photos: [], videos: [] };
    const idx = desc.indexOf('[MEDIA]');
    if (idx === -1) return { photos: [], videos: [] };
    try { return JSON.parse(desc.slice(idx + 7)); } catch { return { photos: [], videos: [] }; }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.territories.length} propriété{p.territories.length!==1?'s':''}</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouvelle propriété</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <F label="Adresse / Localisation" name="address" value={p.formData.address||''} onChange={p.onFormChange} />
        <F label="Propriétaire (membre) / Description" name="description" value={p.formData.description||''} onChange={p.onFormChange} type="textarea" />
        <MediaSection mediaData={p.mediaData} onMediaChange={p.onMediaChange} fileRef={p.fileRef} onAddVideo={p.onAddVideo} />
      </FWrap>}
      {p.territories.length===0 && !p.showForm ? <Empty icon={Home} msg="Aucune propriété enregistrée" onAdd={p.onShowForm} addLabel="Ajouter" /> : (
        <div className="space-y-2">
          {p.territories.map(t => {
            const media = parseMediaFromDesc(t.description);
            const cleanDesc = t.description?.split('[MEDIA]')[0] || '';
            return (
              <Row key={t.id} table="territories" id={t.id} onDeleteItem={p.onDeleteItem} canDelete={p.canDelete}>
                <div className="text-sm font-medium text-gray-200">{t.name||'Propriété'}</div>
                {cleanDesc && <div className="text-xs text-gray-500 mt-0.5">{cleanDesc}</div>}
                <MediaDisplay photos={media.photos} videos={media.videos} setLightbox={p.setLightbox} />
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArrestationsTab(p: TCProps) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const localFileRef = useRef<HTMLInputElement>(null);

  const handleCasierFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result === 'string') p.onFormChange('casier_url', result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inpCls = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{p.arrests.length} arrestation{p.arrests.length!==1?'s':''}</span>
        {!p.showForm && <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouvelle arrestation</Btn>}
      </div>
      {p.showForm && <FWrap onSave={p.onSave} onCancel={p.onHideForm} saving={p.saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Nom de la personne" name="person_name" value={p.formData.person_name||''} onChange={p.onFormChange} />
          <F label="Date" name="date" value={p.formData.date||''} onChange={p.onFormChange} type="date" />
          <F label="Agent" name="agent" value={p.formData.agent||''} onChange={p.onFormChange} />
          <F label="Motif" name="motif" value={p.formData.motif||''} onChange={p.onFormChange} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Photo du casier judiciaire</label>
          {p.formData.casier_url ? (
            <div className="relative inline-block">
              <button type="button" onClick={() => setLightboxImg(p.formData.casier_url!)} className="block rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-700 transition-colors">
                <img src={p.formData.casier_url} alt="Casier" className="object-contain rounded-lg" style={{ maxHeight: '8rem', width: 'auto' }} />
              </button>
              <button type="button" onClick={() => p.onFormChange('casier_url', '')} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-700 flex items-center justify-center text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <button type="button" onClick={() => localFileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-xs text-gray-600 hover:text-gray-300 transition-colors">
                <Camera className="w-3.5 h-3.5" />Importer une photo
              </button>
              <span className="text-xs text-gray-700">ou</span>
              <input type="url" value={p.formData.casier_url||''} onChange={e => p.onFormChange('casier_url', e.target.value)} placeholder="Coller une URL..." className={inpCls} style={{ flex: 1 }} />
            </div>
          )}
          <input ref={localFileRef} type="file" accept="image/*" className="hidden" onChange={handleCasierFile} />
        </div>
      </FWrap>}
      {p.arrests.length===0 && !p.showForm ? <Empty icon={Gavel} msg="Aucune arrestation enregistrée" onAdd={p.onShowForm} addLabel="Ajouter une arrestation" /> : (
        <div className="space-y-3">
          {p.arrests.map(a => {
            const name = a.member ? [a.member.first_name,a.member.last_name].filter(Boolean).join(' ') : 'Inconnu';
            const agent = a.notes?.replace('Agent: ','') || '—';
            const motif = a.charges?.[0] || '—';
            return (
              <div key={a.id} className="rounded-xl border border-gray-800/50 bg-gray-900/20 hover:border-gray-700/50 transition-colors overflow-hidden group">
                <div className="flex gap-4 p-4">
                  {a.judicial_outcome && (
                    <button type="button" onClick={() => setLightboxImg(a.judicial_outcome)} className="flex-shrink-0 block rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors" style={{ height: '4.5rem' }}>
                      <img src={a.judicial_outcome} alt="Casier" className="h-full w-auto object-contain rounded-lg" style={{ background: '#111' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display='none'; }} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-100 text-sm">{name}</div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[['Date', a.arrest_date ? new Date(a.arrest_date+'T12:00:00').toLocaleDateString('fr-FR') : '—'], ['Agent', agent], ['Motif', motif]].map(([lbl, val]) => (
                        <div key={lbl as string}>
                          <div className="text-[10px] text-gray-600 uppercase tracking-wider">{lbl as string}</div>
                          <div className="text-xs text-gray-300 mt-0.5 truncate">{val as string}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {p.canDelete && (
                    <button onClick={() => p.onDeleteItem('arrests', a.id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {lightboxImg && <Lightbox images={[lightboxImg]} onClose={() => setLightboxImg(null)} />}
    </div>
  );
}

function PreuvesTab(p: TCProps) {
  const inp = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors";

  const getBlocks = (e: any): ContentBlock[] => {
    try {
      const meta = e.metadata && typeof e.metadata === 'object' ? e.metadata : {};
      return Array.isArray(meta.blocks) ? meta.blocks : [];
    } catch { return []; }
  };

  const getMeta = (e: any) => {
    try {
      return e.metadata && typeof e.metadata === 'object' ? e.metadata : {};
    } catch { return {}; }
  };

  const photoCount = (e: any) => getBlocks(e).filter((b: ContentBlock) => b.type === 'photo' && b.content).length;

  // Viewing a single evidence record
  if (p.viewingEvidence) {
    const ev = p.viewingEvidence;
    const meta = getMeta(ev);
    const blocks: ContentBlock[] = getBlocks(ev);
    return (
      <div>
        <button onClick={() => p.onViewEvidence(null)} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />Retour aux preuves
        </button>
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100">{ev.title || 'Sans titre'}</h2>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  {meta.evidence_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(meta.evidence_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {meta.author_name && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <FileText className="w-3.5 h-3.5" />{meta.author_name}
                    </span>
                  )}
                  <span className="text-xs text-gray-700">{new Date(ev.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              {p.canDelete && (
                <button onClick={() => { p.onDeleteItem('evidence', ev.id); p.onViewEvidence(null); }} className="p-2 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Content blocks */}
          <div className="px-6 py-6 space-y-6">
            {blocks.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Aucun contenu pour cette preuve</p>
            ) : (
              <EvidenceEditor blocks={blocks} onChange={() => {}} readonly />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Creation form
  if (p.showForm) {
    return (
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
          <h3 className="text-sm font-semibold text-gray-200">Nouvelle preuve</h3>
          <button onClick={p.onHideForm} className="text-gray-600 hover:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Meta fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Titre *</label>
              <input type="text" value={p.evidenceTitle} onChange={e => p.onEvidenceTitleChange(e.target.value)} placeholder="Titre de la preuve..." className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={p.evidenceDate} onChange={e => p.onEvidenceDateChange(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Auteur</label>
              <input type="text" value={p.evidenceAuthor} onChange={e => p.onEvidenceAuthorChange(e.target.value)} placeholder="Nom de l'agent..." className={inp} />
            </div>
          </div>

          {/* Rich content editor */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Contenu de la preuve</label>
            <EvidenceEditor blocks={p.evidenceBlocks} onChange={p.onEvidenceBlocksChange} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={p.onSave}
            disabled={p.saving || !p.evidenceTitle.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {p.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer la preuve
          </button>
          <button onClick={p.onHideForm} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-600">{p.evidence.length} preuve{p.evidence.length !== 1 ? 's' : ''}</span>
        <Btn onClick={p.onShowForm}><Plus className="w-3.5 h-3.5" />Nouvelle preuve</Btn>
      </div>

      {p.evidence.length === 0 ? (
        <Empty icon={Camera} msg="Aucune preuve enregistrée" onAdd={p.onShowForm} addLabel="Créer une preuve" />
      ) : (
        <div className="space-y-3">
          {p.evidence.map(ev => {
            const meta = getMeta(ev);
            const blocks = getBlocks(ev);
            const numPhotos = photoCount(ev);
            const firstPhoto = blocks.find((b: ContentBlock) => b.type === 'photo' && b.content)?.content;
            const firstText = blocks.find((b: ContentBlock) => b.type === 'text' && b.content)?.content;
            return (
              <div
                key={ev.id}
                onClick={() => p.onViewEvidence(ev)}
                className="flex gap-4 p-4 rounded-xl border border-gray-800/50 bg-gray-900/20 hover:border-cyan-900/40 hover:bg-gray-900/40 transition-all cursor-pointer group"
              >
                {/* Thumbnail */}
                {firstPhoto ? (
                  <img
                    src={firstPhoto}
                    alt=""
                    className="w-24 h-20 object-cover rounded-lg border border-gray-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-20 rounded-lg border border-gray-800 bg-gray-900/60 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-gray-700" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-100 text-sm group-hover:text-white transition-colors">{ev.title || 'Sans titre'}</div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {meta.evidence_date && (
                      <span className="text-xs text-gray-600">{new Date(meta.evidence_date + 'T12:00:00').toLocaleDateString('fr-FR')}</span>
                    )}
                    {meta.author_name && <span className="text-xs text-gray-600">{meta.author_name}</span>}
                    {numPhotos > 0 && <span className="text-xs text-gray-700">{numPhotos} photo{numPhotos > 1 ? 's' : ''}</span>}
                    <span className="text-xs text-gray-700">{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
                  </div>
                  {firstText && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{firstText}</p>}
                </div>
                {p.canDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); p.onDeleteItem('evidence', ev.id); }}
                    className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-start mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Journal de Crime - tracks criminal infractions for an organization
interface CrimeEntry {
  id: string;
  crime_types: string[];
  date: string;
  report: string;
  created_at: string;
}

function JournalCrimeTab({ org }: { org: Organization }) {
  const [entries, setEntries] = useState<CrimeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ crime_types: [] as string[], date: new Date().toISOString().split('T')[0], report: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<CrimeEntry | null>(null);

  const STORAGE_KEY = `doa_crime_journal_v1_${org.id}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CrimeEntry[] = JSON.parse(stored);
        // Migrate old single-crime_type entries to crime_types array
        setEntries(parsed.map(e => ({
          ...e,
          crime_types: e.crime_types || ((e as any).crime_type ? [(e as any).crime_type] : []),
        })));
      }
    } catch {}
  }, [STORAGE_KEY]);

  const saveEntries = (list: CrimeEntry[]) => {
    setEntries(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const toggleCrime = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const handleAdd = () => {
    if (formData.crime_types.length === 0) return;
    const newEntry: CrimeEntry = {
      id: `crime-${Date.now()}`,
      crime_types: formData.crime_types,
      date: formData.date,
      report: formData.report,
      created_at: new Date().toISOString(),
    };
    saveEntries([newEntry, ...entries]);
    logCreate('crime_journal', newEntry.id, formData.crime_types.map(getCrimeLabel).join(', '), { crime_types: formData.crime_types, date: formData.date });
    setShowForm(false);
    setFormData({ crime_types: [], date: new Date().toISOString().split('T')[0], report: '' });
  };

  const startEdit = (entry: CrimeEntry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const handleUpdateField = (field: 'crime_types' | 'date' | 'report', value: string | string[]) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const saveEdit = () => {
    if (!editData) return;
    const updated = entries.map(e => e.id === editData.id ? editData : e);
    saveEntries(updated);
    logUpdate('crime_journal', editData.id, editData.crime_types.map(getCrimeLabel).join(', '), {}, { crime_types: editData.crime_types });
    setEditingId(null);
    setEditData(null);
  };

  const handleDelete = (id: string) => {
    const entry = entries.find(e => e.id === id);
    saveEntries(entries.filter(e => e.id !== id));
    if (entry) logDelete('crime_journal', id, entry.crime_types.map(getCrimeLabel).join(', '), { crime_types: entry.crime_types });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{entries.length} infraction{entries.length !== 1 ? 's' : ''}</span>
        {!showForm && <Btn onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" />Nouvelle infraction</Btn>}
      </div>

      {showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1.5">Infractions * (sélection multiple)</label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2 space-y-1">
              {CRIME_TYPES.map(c => {
                const checked = formData.crime_types.includes(c.value);
                return (
                  <label key={c.value} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/60 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setFormData(f => ({ ...f, crime_types: toggleCrime(f.crime_types, c.value) }))}
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-cyan-600 focus:ring-cyan-700 focus:ring-offset-0"
                    />
                    <span className={checked ? 'text-gray-100' : 'text-gray-400'}>{c.label}</span>
                  </label>
                );
              })}
            </div>
            {formData.crime_types.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.crime_types.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-900/30 text-cyan-300 border border-cyan-900/40">
                    {getCrimeLabel(v)}
                    <button onClick={() => setFormData(f => ({ ...f, crime_types: f.crime_types.filter(x => x !== v) }))} className="text-cyan-500 hover:text-cyan-200">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Rapport</label>
            <textarea
              value={formData.report}
              onChange={e => setFormData(f => ({ ...f, report: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700"
              rows={3}
              placeholder="Détails de l'infraction..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={formData.crime_types.length === 0} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />Ajouter
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <Empty icon={BookMarked} msg="Aucune infraction enregistrée" onAdd={() => setShowForm(true)} addLabel="Ajouter une infraction" />
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-xl border border-gray-800/50 bg-gray-900/20 p-4 group">
              {editingId === entry.id && editData ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">Infractions</label>
                    <div className="max-h-40 overflow-y-auto rounded border border-gray-700 bg-gray-900 p-1.5 space-y-0.5">
                      {CRIME_TYPES.map(c => {
                        const checked = editData.crime_types.includes(c.value);
                        return (
                          <label key={c.value} className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-gray-800/60 cursor-pointer text-[11px] text-gray-300">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleUpdateField('crime_types', toggleCrime(editData.crime_types, c.value))}
                              className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-cyan-600 focus:ring-cyan-700 focus:ring-offset-0"
                            />
                            <span className={checked ? 'text-gray-100' : 'text-gray-400'}>{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={editData.date}
                      onChange={e => handleUpdateField('date', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">Rapport</label>
                    <textarea
                      value={editData.report}
                      onChange={e => handleUpdateField('report', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
                      rows={2}
                    />
                  </div>
                  <button onClick={saveEdit} className="text-xs text-cyan-400 hover:text-cyan-300">Terminé</button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.crime_types.map(ct => (
                        <span key={ct} className="inline-block text-xs font-medium text-gray-200 bg-gray-800/60 border border-gray-700/50 rounded px-2 py-0.5">
                          {getCrimeLabel(ct)}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR')}</span>
                    </div>
                    {entry.report && <p className="text-xs text-gray-400 mt-2">{entry.report}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(entry)} className="text-gray-600 hover:text-cyan-400"><FileText className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(entry.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Dossier Complet - structured case file
interface DossierData {
  opening_date: string;
  agent_in_charge: string;
  target_type: string;
  target_zone: string;
  illegal_activity: string;
  visual_description: string;
  context: string;
  observations: { id: string; date: string; event: string }[];
  analysis: string;
  intervention_justification: string;
  proof_synthesis: string;
  conclusion: string;
}

function DossierTab({ org }: { org: Organization }) {
  const [data, setData] = useState<DossierData>({
    opening_date: new Date().toISOString().split('T')[0],
    agent_in_charge: '',
    target_type: 'org_criminelle',
    target_zone: '',
    illegal_activity: '',
    visual_description: '',
    context: `Le dossier suivant a été ouvert par la Drug Observation Agency (DOA) dans le cadre d'une surveillance de l'organisation "${org.name}". Toute information contenue dans ce dossier est confidentielle et destinée exclusivement aux agents habilités. Ce dossier regroupe l'ensemble des observations, preuves et analyses collectées durant l'investigation.`,
    observations: [],
    analysis: '',
    intervention_justification: '',
    proof_synthesis: '',
    conclusion: '',
  });
  const [saving, setSaving] = useState(false);

  const STORAGE_KEY = `doa_dossier_v1_${org.id}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(d => ({ ...d, ...parsed }));
      }
    } catch {}
  }, [STORAGE_KEY]);

  const updateField = <K extends keyof DossierData>(key: K, value: DossierData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  };

  const addObservation = () => {
    const newObs = { id: `obs-${Date.now()}`, date: new Date().toISOString().split('T')[0], event: '' };
    updateField('observations', [...data.observations, newObs]);
  };

  const updateObservation = (id: string, field: 'date' | 'event', value: string) => {
    updateField('observations', data.observations.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const removeObservation = (id: string) => {
    updateField('observations', data.observations.filter(o => o.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    logUpdate('dossier', org.id, org.name, {}, data);
    setSaving(false);
  };

  const handleExport = () => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dossier DOA - ${org.name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #0e7490; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { font-size: 16px; color: #0e7490; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .section { margin-bottom: 25px; padding: 20px; background: #f8fafc; border-left: 4px solid #0e7490; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-size: 14px; color: #1a1a1a; }
    .observations li { margin-bottom: 10px; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; }
    .date { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header .logo { font-size: 28px; font-weight: bold; color: #0e7490; }
    .header .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">DOA - Drug Observation Agency</div>
    <div class="subtitle">Dossier d'Investigation</div>
  </div>
  <h1>${org.name}</h1>

  <h2>Section 1 - Ouverture du dossier</h2>
  <div class="section">
    <div class="label">Date d'ouverture</div>
    <div class="value">${new Date(data.opening_date + 'T12:00:00').toLocaleDateString('fr-FR')}</div>
    <div style="margin-top: 12px;">
      <div class="label">Agent responsable</div>
      <div class="value">${data.agent_in_charge || 'Non désigné'}</div>
    </div>
  </div>

  <h2>Section 2 - Cible de l'investigation</h2>
  <div class="section">
    <div><span class="label">Type:</span> <span class="value">${data.target_type === 'org_criminelle' ? 'Organisation criminelle' : data.target_type === 'gang' ? 'Gang' : data.target_type === 'gang_bikers' ? 'Gang bikers' : data.target_type}</span></div>
    <div style="margin-top: 10px;"><span class="label">Zone:</span> <span class="value">${data.target_zone || 'Non définie'}</span></div>
    <div style="margin-top: 10px;"><span class="label">Activité illégale suspectée:</span> <span class="value">${data.illegal_activity || 'Non définie'}</span></div>
    <div style="margin-top: 10px;"><div class="label">Description visuelle</div><div class="value">${data.visual_description || 'Aucune description'}</div></div>
  </div>

  <h2>Section 3 - Contexte</h2>
  <div class="section">
    <div class="value" style="white-space: pre-wrap;">${data.context || 'Aucun contexte défini'}</div>
  </div>

  <h2>Section 4 - Observations</h2>
  <div class="section">
    ${data.observations.length === 0 ? '<p class="value">Aucune observation enregistrée</p>' :
      `<ul class="observations" style="list-style: none; padding: 0;">${data.observations.map(o =>
        `<li><div class="date">${new Date(o.date + 'T12:00:00').toLocaleDateString('fr-FR')}</div><div class="value">${o.event || 'Pas de détails'}</div></li>`
      ).join('')}</ul>`}
  </div>

  <h2>Section 7 - Rapport final</h2>
  <div class="section">
    <div class="label">Analyse</div>
    <div class="value" style="white-space: pre-wrap; margin-bottom: 15px;">${data.analysis || 'Aucune analyse'}</div>
    <div class="label">Justification d'intervention</div>
    <div class="value" style="white-space: pre-wrap; margin-bottom: 15px;">${data.intervention_justification || 'Aucune justification'}</div>
    <div class="label">Synthèse des preuves</div>
    <div class="value" style="white-space: pre-wrap; margin-bottom: 15px;">${data.proof_synthesis || 'Aucune synthèse'}</div>
    <div class="label">Conclusion opérationnelle</div>
    <div class="value" style="white-space: pre-wrap;">${data.conclusion || 'Aucune conclusion'}</div>
  </div>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - DOA Registre
  </footer>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    logExport('dossier', org.id, org.name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Dossier complet</h2>
          <p className="text-xs text-gray-500 mt-0.5">Document d'investigation confidentiel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Enregistrer
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 border border-cyan-900/40 text-cyan-400 rounded-lg text-xs hover:bg-cyan-900/20 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Google Docs
          </button>
        </div>
      </div>

      {/* Section 1 */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Section 1 - Ouverture du dossier</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date d'ouverture</label>
            <input type="date" value={data.opening_date} onChange={e => updateField('opening_date', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Agent responsable</label>
            <input type="text" value={data.agent_in_charge} onChange={e => updateField('agent_in_charge', e.target.value)} placeholder="Matricule / Nom" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Section 2 - Cible de l'investigation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type de cible</label>
            <select value={data.target_type} onChange={e => updateField('target_type', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700">
              <option value="org_criminelle">Organisation criminelle</option>
              <option value="gang">Gang</option>
              <option value="gang_bikers">Gang bikers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zone géographique</label>
            <input type="text" value={data.target_zone} onChange={e => updateField('target_zone', e.target.value)} placeholder="Secteur, quartier..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-1">Activité illégale suspectée</label>
          <input type="text" value={data.illegal_activity} onChange={e => updateField('illegal_activity', e.target.value)} placeholder="Type d'activité criminelle..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
        </div>
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-1">Description visuelle</label>
          <textarea value={data.visual_description} onChange={e => updateField('visual_description', e.target.value)} placeholder="Signes distinctifs, véhicules fréquents, habitudes..." rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
        </div>
      </div>

      {/* Section 3 */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Section 3 - Contexte</h3>
        <textarea
          value={data.context}
          onChange={e => updateField('context', e.target.value)}
          rows={5}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700"
        />
      </div>

      {/* Section 4 - Observations */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Section 4 - Observations</h3>
          <button onClick={addObservation} className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 border border-cyan-900/40 rounded hover:bg-cyan-900/20 transition-colors">
            <Plus className="w-3 h-3" />Ajouter
          </button>
        </div>
        {data.observations.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">Aucune observation</p>
        ) : (
          <div className="space-y-2">
            {data.observations.map(obs => (
              <div key={obs.id} className="flex gap-3 items-start p-3 bg-gray-900/50 rounded-lg border border-gray-800/50 group">
                <input type="date" value={obs.date} onChange={e => updateObservation(obs.id, 'date', e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-700" />
                <textarea value={obs.event} onChange={e => updateObservation(obs.id, 'event', e.target.value)} placeholder="Événement observé..." rows={1} className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-700 resize-none" />
                <button onClick={() => removeObservation(obs.id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 7 - Rapport final */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Section 7 - Rapport final</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Analyse</label>
            <textarea value={data.analysis} onChange={e => updateField('analysis', e.target.value)} placeholder="Analyse de l'investigation..." rows={4} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Justification d'intervention</label>
            <textarea value={data.intervention_justification} onChange={e => updateField('intervention_justification', e.target.value)} placeholder="Éléments justifiant une intervention..." rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Synthèse des preuves</label>
            <textarea value={data.proof_synthesis} onChange={e => updateField('proof_synthesis', e.target.value)} placeholder="Résumé des preuves collectées..." rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Conclusion opérationnelle</label>
            <textarea value={data.conclusion} onChange={e => updateField('conclusion', e.target.value)} placeholder="Recommandations et conclusion..." rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Relations Tab - Organization relationships
function RelationsTab({ org }: { org: Organization }) {
  const [relations, setRelations] = useState<OrganizationRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ organization_id: '', relation_type: 'neutre', notes: '' });
  const { isReadOnly } = usePermissions();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    loadRelations();
    getOrganizations().then(data => setOrganizations(data.filter(o => o.status === 'active')));
  }, [org.id]);

  const loadRelations = async () => {
    setLoading(true);
    const data = await getOrganizationRelations(org.id);
    setRelations(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.organization_id || !formData.relation_type) return;
    setSaving(true);
    try {
      const newRel = await createRelation({
        organization_a_id: org.id,
        organization_b_id: formData.organization_id,
        relation_type: formData.relation_type,
        notes: formData.notes || undefined,
      });
      logCreate('organization_relations', newRel.id, `Relation ${org.name}`, { relation_type: formData.relation_type });
      await loadRelations();
      setShowForm(false);
      setFormData({ organization_id: '', relation_type: 'neutre', notes: '' });
    } catch (error) {
      console.error('Failed to create relation:', error);
      alert('Erreur lors de la création de la relation: ' + (error as any)?.message || 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rel: OrganizationRelation) => {
    if (!confirm('Supprimer cette relation ?')) return;
    try {
      await deleteRelation(rel.id);
      logDelete('organization_relations', rel.id, 'Relation', {});
      await loadRelations();
    } catch (error) {
      console.error('Failed to delete relation:', error);
      alert('Erreur lors de la suppression: ' + (error as any)?.message || 'Erreur inconnue');
    }
  };

  // Get the other organization in the relation
  const getOtherOrg = (rel: OrganizationRelation) => {
    return rel.organization_a_id === org.id ? rel.organization_b : rel.organization_a;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-600">{relations.length} relation{relations.length !== 1 ? 's' : ''}</span>
        {!showForm && !isReadOnly && (
          <Btn onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" />Nouvelle relation</Btn>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Ajouter une relation</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Organisation</label>
              <select
                value={formData.organization_id}
                onChange={e => setFormData(f => ({ ...f, organization_id: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                <option value="">Sélectionner...</option>
                {organizations.filter(o => o.id !== org.id && !relations.some(r => {
                  const otherId = r.organization_a_id === org.id ? r.organization_b_id : r.organization_a_id;
                  return otherId === o.id;
                })).map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type de relation</label>
              <select
                value={formData.relation_type}
                onChange={e => setFormData(f => ({ ...f, relation_type: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                {RELATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes (optionnel)</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600"
                placeholder="Contexte de la relation..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !formData.organization_id}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Ajouter
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-gray-600 animate-spin" /></div>
      ) : relations.length === 0 ? (
        <Empty icon={Users} msg="Aucune relation enregistrée" onAdd={() => setShowForm(true)} addLabel="Ajouter une relation" />
      ) : (
        <div className="space-y-2">
          {relations.map(rel => {
            const otherOrg = getOtherOrg(rel);
            const relColor = getRelationTypeColor(rel.relation_type);
            return (
              <div key={rel.id} className="rounded-xl border border-gray-800/50 bg-gray-900/20 p-4 group">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: otherOrg?.color || '#4d6fa8' }}
                  >
                    {(otherOrg?.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200">{otherOrg?.name || 'Organisation inconnue'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: `${relColor}20`, color: relColor }}
                      >
                        {getRelationTypeLabel(rel.relation_type)}
                      </span>
                      {rel.notes && (
                        <span className="text-xs text-gray-500 truncate">{rel.notes}</span>
                      )}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDelete(rel)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
