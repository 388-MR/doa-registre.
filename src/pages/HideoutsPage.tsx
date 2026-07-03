import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Search, Warehouse, FlaskConical, Building, Sprout } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { getHideouts } from '../services/organizations';
import { getOrganizations } from '../services/organizations';
import { canEdit } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Hideout, Organization } from '../types';

const typeLabels: Record<string, string> = {
  hideout: 'Planque',
  lab: 'Laboratoire',
  warehouse: 'Entrepôt',
  plantation_pots: 'Plantation de pots',
};

const typeIcons: Record<string, React.ReactNode> = {
  hideout: <Building className="w-4 h-4" />,
  lab: <FlaskConical className="w-4 h-4" />,
  warehouse: <Warehouse className="w-4 h-4" />,
  plantation_pots: <Sprout className="w-4 h-4" />,
};

export function HideoutsPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [hideouts, setHideouts] = useState<Hideout[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [hideoutsData, orgsData] = await Promise.all([
          getHideouts(),
          getOrganizations(),
        ]);
        setHideouts(hideoutsData);
        setOrganizations(orgsData);
      } catch (error) {
        console.error('Failed to load hideouts:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = hideouts.filter((h) => {
    const matchesSearch = !search || (h.address && h.address.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || h.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return '-';
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || '-';
  };

  if (isLoading) {
    return <LoadingState message="Chargement des planques..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Planques / Labos</h1>
          <p className="text-gray-500 mt-1">Lieux identifiés et surveillés</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/hideouts/new')}>
            Nouvelle planque
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'hideout', 'lab', 'warehouse', 'plantation_pots'] as const).map((t) => (
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
          icon={<MapPin className="w-8 h-8" />}
          title="Aucune planque"
          description="Aucun lieu enregistré"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <Card key={h.id} className="cursor-pointer hover:border-dark-600" onClick={() => navigate(`/hideouts/${h.id}`)}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  h.type === 'lab' ? 'bg-danger-500/20 text-danger-400' :
                  h.type === 'warehouse' ? 'bg-warning-500/20 text-warning-400' :
                  'bg-primary-500/20 text-primary-400'
                }`}>
                  {typeIcons[h.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-100 truncate">{h.address || 'Adresse inconnue'}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="neutral">{typeLabels[h.type]}</Badge>
                    <StatusBadge status={h.status} />
                  </div>
                  {h.organization_id && (
                    <div className="text-xs text-primary-400 mt-2" onClick={(e) => { e.stopPropagation(); navigate(`/organizations/${h.organization_id}`); }}>
                      {getOrgName(h.organization_id)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
