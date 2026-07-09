import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderPlus, Search, Clock, Users, AlertCircle, Edit, Archive, Eye } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { AuthorFooter } from '../components/ui/AuthorFooter';
import { getCases, closeCase } from '../services/cases';
import { canEdit } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Case } from '../types';

const priorityColors: Record<number, string> = {
  1: 'text-gray-400',
  2: 'text-success-400',
  3: 'text-warning-400',
  4: 'text-orange-400',
  5: 'text-danger-400',
};

export function CasesPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCases(statusFilter !== 'all' ? statusFilter : undefined);
        setCases(data);
      } catch (error) {
        console.error('Failed to load cases:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [statusFilter]);

  const filtered = cases.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = async (caseId: string) => {
    await closeCase(caseId);
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status: 'closed' } : c)));
  };

  if (isLoading) {
    return <LoadingState message="Chargement des affaires..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Affaires</h1>
          <p className="text-gray-500 mt-1">Enquêtes et investigations en cours</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<FolderPlus className="w-4 h-4" />} onClick={() => navigate('/cases/new')}>
            Nouvelle affaire
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher une affaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'pending', 'closed', 'archived'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Toutes' : s === 'open' ? 'Ouvertes' : s === 'pending' ? 'En attente' : s === 'closed' ? 'Fermées' : 'Archivées'}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="w-8 h-8" />}
          title="Aucune affaire"
          description="Aucune affaire enregistrée"
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:border-dark-600" onClick={() => navigate(`/cases/${c.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-100">{c.name}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className={`flex items-center gap-1 ${priorityColors[c.priority]}`}>
                      <AlertCircle className="w-4 h-4" />
                      Priorité {c.priority}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    {c.lead_agent && (
                      <div className="flex items-center gap-2">
                        <Avatar src={c.lead_agent.avatar_url} name={c.lead_agent.display_name} size="xs" />
                        {c.lead_agent.display_name || c.lead_agent.matricule}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="p-1.5" onClick={() => navigate(`/cases/${c.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {canEdit(agent?.role) && c.status === 'open' && (
                    <Button variant="ghost" size="sm" className="p-1.5" onClick={() => handleClose(c.id)}>
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <AuthorFooter createdAt={c.created_at} createdMatricule={c.created_by_matricule} createdCodename={c.created_by_codename} updatedAt={c.updated_at} updatedMatricule={c.updated_by_matricule} updatedCodename={c.updated_by_codename} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
