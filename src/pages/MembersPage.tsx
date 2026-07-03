import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Search, Filter, AlertTriangle, Eye, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, DangerBadge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { ConfirmModal } from '../components/ui/Modal';
import { getMembers, deleteMember } from '../services/organizations';
import { getOrganizations } from '../services/organizations';
import { canEdit, canDelete } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Member, Organization } from '../types';

export function MembersPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const organizationFilter = searchParams.get('org');

  const [members, setMembers] = useState<Member[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });

  useEffect(() => {
    async function loadData() {
      try {
        const [membersData, orgsData] = await Promise.all([
          getMembers(organizationFilter || undefined),
          getOrganizations(),
        ]);
        setMembers(membersData);
        setOrganizations(orgsData);
      } catch (error) {
        console.error('Failed to load members:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [organizationFilter]);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !search ||
      [m.first_name, m.last_name, m.nickname, m.phone].some(
        (field) => field && field.toLowerCase().includes(search.toLowerCase())
      );
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteModal.member) return;
    try {
      await deleteMember(deleteModal.member.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteModal.member!.id));
      setDeleteModal({ open: false, member: null });
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const getOrganizationName = (orgId: string | null) => {
    if (!orgId) return null;
    const org = organizations.find((o) => o.id === orgId);
    return org?.name;
  };

  if (isLoading) {
    return <LoadingState message="Chargement des membres..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Membres</h1>
          <p className="text-gray-500 mt-1">Gestion des individus identifiés</p>
        </div>
        {canEdit(agent?.role) && (
          <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/members/new')}>
            Nouveau membre
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, surnom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'incarcerated', 'deceased', 'unknown'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Tous' : s === 'incarcerated' ? 'Incarcérés' : s === 'deceased' ? 'Décédés' : s === 'unknown' ? 'Inconnus' : 'Actifs'}
            </Button>
          ))}
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="w-8 h-8" />}
          title="Aucun membre"
          description={search ? 'Aucun résultat trouvé' : 'Commencez par ajouter un membre'}
          action={
            canEdit(agent?.role) && (
              <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/members/new')}>
                Nouveau membre
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-800">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Membre</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Organisation</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Contact</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Rôle</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Statut</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Danger</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-4">
                    <Link to={`/members/${member.id}`} className="flex items-center gap-3 group">
                      <Avatar src={member.photo_url} name={`${member.first_name} ${member.last_name}`} size="md" />
                      <div>
                        <div className="font-medium text-gray-100 group-hover:text-primary-400 transition-colors">
                          {[member.first_name, member.last_name].filter(Boolean).join(' ')}
                        </div>
                        {member.nickname && <div className="text-xs text-gray-500">({member.nickname})</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    {member.organization_id && (
                      <Link to={`/organizations/${member.organization_id}`} className="text-gray-400 hover:text-gray-200">
                        {getOrganizationName(member.organization_id)}
                      </Link>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400">{member.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="text-gray-300">{member.role || '-'}</div>
                    {member.grade && <div className="text-xs text-gray-500">{member.grade}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={member.status} />
                      {member.is_wanted && <Badge variant="danger">Recherché</Badge>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <DangerBadge level={member.danger_level} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="p-1.5" onClick={() => navigate(`/members/${member.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit(agent?.role) && (
                        <Button variant="ghost" size="sm" className="p-1.5" onClick={() => navigate(`/members/${member.id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete(agent?.role) && (
                        <Button variant="ghost" size="sm" className="p-1.5 text-danger-400 hover:text-danger-300" onClick={() => setDeleteModal({ open: true, member })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, member: null })}
        onConfirm={handleDelete}
        title="Supprimer le membre"
        message={`Êtes-vous sûr de vouloir supprimer "${[deleteModal.member?.first_name, deleteModal.member?.last_name].filter(Boolean).join(' ')}" ?`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}
