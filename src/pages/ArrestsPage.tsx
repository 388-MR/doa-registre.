import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Plus, Search, Calendar, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { AuthorFooter } from '../components/ui/AuthorFooter';
import { getArrests } from '../services/cases';
import { canEdit } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Arrest } from '../types';

export function ArrestsPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [arrests, setArrests] = useState<Arrest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getArrests();
        setArrests(data);
      } catch (error) {
        console.error('Failed to load arrests:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = arrests.filter((a) =>
    a.member && `${a.member.first_name} ${a.member.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <LoadingState message="Chargement des arrestations..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Arrestations</h1>
          <p className="text-gray-500 mt-1">Historique des arrestations effectuées</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/arrests/new')}>
            Nouvelle arrestation
          </Button>
        )}
      </div>

      <Input
        placeholder="Rechercher par nom..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftElement={<Search className="w-4 h-4" />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="Aucune arrestation"
          description="Aucune arrestation enregistrée"
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-dark-600" onClick={() => navigate(`/arrests/${a.id}`)}>
              <div className="flex items-start gap-4">
                <Avatar src={a.member?.photo_url} name={`${a.member?.first_name} ${a.member?.last_name}`} size="lg" />
                <div className="flex-1">
                  <div className="font-medium text-gray-100">
                    {a.member?.first_name} {a.member?.last_name}
                    {a.member?.nickname && <span className="text-gray-500"> ({a.member.nickname})</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.arrest_date).toLocaleDateString('fr-FR')}
                    </div>
                    {a.arresting_agent && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {a.arresting_agent.display_name || a.arresting_agent.matricule}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {a.charges?.slice(0, 3).map((c, i) => (
                      <Badge key={i} variant="neutral">{c}</Badge>
                    ))}
                    {a.charges && a.charges.length > 3 && (
                      <Badge variant="neutral">+{a.charges.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </div>
              {a.judicial_outcome && (
                <div className="mt-3 pt-3 border-t border-dark-700 text-sm text-gray-400">
                  {a.judicial_outcome}
                </div>
              )}
              <AuthorFooter createdAt={a.created_at} createdMatricule={a.created_by_matricule} createdCodename={a.created_by_codename} updatedAt={a.updated_at} updatedMatricule={a.updated_by_matricule} updatedCodename={a.updated_by_codename} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
