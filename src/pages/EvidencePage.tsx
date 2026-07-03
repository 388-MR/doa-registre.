import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, Search, FileText, Video, Music, Box, FolderOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { getEvidence } from '../services/cases';
import { canEdit } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Evidence } from '../types';

const typeIcons: Record<string, React.ReactNode> = {
  photo: <Camera className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  physical: <Box className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  photo: 'Photo',
  video: 'Vidéo',
  audio: 'Audio',
  document: 'Document',
  physical: 'Preuve physique',
};

export function EvidencePage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEvidence();
        setEvidence(data);
      } catch (error) {
        console.error('Failed to load evidence:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = evidence.filter((e) => {
    const matchesSearch = !search || (e.title && e.title.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return <LoadingState message="Chargement des preuves..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Preuves</h1>
          <p className="text-gray-500 mt-1">Éléments de preuve collectés</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/evidence/new')}>
            Ajouter une preuve
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher une preuve..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'photo', 'video', 'audio', 'document', 'physical'] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'Toutes' : typeLabels[t]}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Camera className="w-8 h-8" />}
          title="Aucune preuve"
          description="Aucun élément de preuve enregistré"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e) => (
            <Card key={e.id} className="cursor-pointer hover:border-dark-600 overflow-hidden group" onClick={() => navigate(`/evidence/${e.id}`)}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  e.type === 'photo' ? 'bg-primary-500/20 text-primary-400' :
                  e.type === 'video' ? 'bg-danger-500/20 text-danger-400' :
                  e.type === 'audio' ? 'bg-accent-500/20 text-accent-400' :
                  e.type === 'document' ? 'bg-success-500/20 text-success-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {typeIcons[e.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-100 truncate">{e.title || 'Sans titre'}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              {e.case_id && (
                <div className="mt-3 pt-3 border-t border-dark-700 flex items-center gap-1 text-xs text-gray-500">
                  <FolderOpen className="w-3 h-3" />
                  Affaire liée
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
