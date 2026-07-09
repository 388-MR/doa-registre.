import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Plus, Search, MapPin, User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { AuthorFooter } from '../components/ui/AuthorFooter';
import { getVehicles } from '../services/organizations';
import { getOrganizations } from '../services/organizations';
import { canEdit } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Vehicle, Organization } from '../types';

export function VehiclesPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgFilter = searchParams.get('org');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [vehiclesData, orgsData] = await Promise.all([
          getVehicles(orgFilter || undefined),
          getOrganizations(),
        ]);
        setVehicles(vehiclesData);
        setOrganizations(orgsData);
      } catch (error) {
        console.error('Failed to load vehicles:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [orgFilter]);

  const filtered = vehicles.filter((v) =>
    [v.plate, v.make, v.model, v.color].some(
      (field) => field && field.toLowerCase().includes(search.toLowerCase())
    )
  );

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return '-';
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || '-';
  };

  if (isLoading) {
    return <LoadingState message="Chargement des véhicules..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Véhicules</h1>
          <p className="text-gray-500 mt-1">Véhicules identifiés et suivis</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/vehicles/new')}>
            Nouveau véhicule
          </Button>
        )}
      </div>

      <Input
        placeholder="Rechercher par plaque, marque, modèle..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftElement={<Search className="w-4 h-4" />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Car className="w-8 h-8" />}
          title="Aucun véhicule"
          description="Aucun véhicule enregistré"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-800">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Véhicule</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Plaque</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Couleur</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Propriétaire</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Organisation</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <Fragment key={v.id}>
                <tr className="border-b border-dark-800 hover:bg-dark-800/50 cursor-pointer" onClick={() => navigate(`/vehicles/${v.id}`)}>
                  <td className="py-3 px-4 text-gray-100">
                    {v.make} {v.model}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400">{v.plate || '-'}</td>
                  <td className="py-3 px-4 text-gray-400">{v.color || '-'}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {v.owner ? `${v.owner.first_name} ${v.owner.last_name}` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {v.organization_id && (
                      <span className="text-primary-400 hover:text-primary-300 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/organizations/${v.organization_id}`); }}>
                        {getOrgName(v.organization_id)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={v.status} /></td>
                </tr>
                <tr>
                  <td colSpan={6} className="pt-0 pb-3 px-4">
                    <AuthorFooter createdAt={v.created_at} createdMatricule={v.created_by_matricule} createdCodename={v.created_by_codename} updatedAt={v.updated_at} updatedMatricule={v.updated_by_matricule} updatedCodename={v.updated_by_codename} />
                  </td>
                </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
