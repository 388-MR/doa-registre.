import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Shield,
  FileText,
  Users,
  Gavel,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, DangerBadge, StatusBadge, ThreatBadge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Avatar } from '../components/ui/Avatar';
import { LoadingState, EmptyState } from '../components/ui/Empty';
import { ConfirmModal } from '../components/ui/Modal';
import { getMember, deleteMember, getOrganizationStats, getOrganization } from '../services/organizations';
import { getPersonRelations, type PersonRelation } from '../services/misc';
import { getArrests } from '../services/cases';
import { canEdit, canDelete } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import type { Member, Arrest } from '../types';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agent } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [relations, setRelations] = useState<PersonRelation[]>([]);
  const [arrests, setArrests] = useState<Arrest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    async function loadMember() {
      if (!id) return;
      try {
        const memberData = await getMember(id);
        setMember(memberData);

        const [relationsData, arrestsData] = await Promise.all([
          getPersonRelations(id),
          getArrests ? Promise.resolve([]) : Promise.resolve([]),
        ]);
        setRelations(relationsData);
        setArrests(arrestsData);
      } catch (error) {
        console.error('Failed to load member:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMember();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteMember(id);
    navigate('/members');
  };

  if (isLoading) {
    return <LoadingState message="Chargement du membre..." />;
  }

  if (!member) {
    return (
      <EmptyState
        title="Membre non trouvé"
        description="Ce membre n'existe pas ou a été supprimé"
        action={<Button variant="primary" onClick={() => navigate('/members')}>Retour</Button>}
      />
    );
  }

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')} className="mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <Avatar src={member.photo_url} name={fullName} size="xl" className="w-24 h-24 text-2xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">{fullName || 'Sans nom'}</h1>
                {member.nickname && <span className="text-gray-500 text-lg">({member.nickname})</span>}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {member.organization_id && member.organization && (
                  <Badge variant="primary" className="cursor-pointer" onClick={() => navigate(`/organizations/${member.organization_id}`)}>
                    {member.organization.name}
                  </Badge>
                )}
                {member.grade && <Badge variant="neutral">{member.grade}</Badge>}
                <StatusBadge status={member.status} />
                {member.is_wanted && <Badge variant="danger">Recherché</Badge>}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <DangerBadge level={member.danger_level} />
                {member.role && <span className="text-gray-500">{member.role}</span>}
              </div>
            </div>
            {canEdit(agent?.role) && (
              <div className="flex gap-2">
                <Button variant="secondary" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/members/${id}/edit`)}>
                  Modifier
                </Button>
                {canDelete(agent?.role) && (
                  <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setDeleteModal(true)}>
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick info */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {member.phone && (
          <Card padding="sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Téléphone</span>
            </div>
            <p className="font-mono text-gray-100 mt-1">{member.phone}</p>
          </Card>
        )}
        {member.birth_date && (
          <Card padding="sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Date de naissance</span>
            </div>
            <p className="text-gray-100 mt-1">{new Date(member.birth_date).toLocaleDateString('fr-FR')}</p>
          </Card>
        )}
        {member.address && (
          <Card padding="sm">
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Adresse</span>
            </div>
            <p className="text-gray-100 mt-1">{member.address}</p>
          </Card>
        )}
        {member.profession && (
          <Card padding="sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">Profession</span>
            </div>
            <p className="text-gray-100 mt-1">{member.profession}</p>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" icon={<FileText className="w-4 h-4" />}>Informations</TabsTrigger>
          <TabsTrigger value="relations" icon={<Users className="w-4 h-4" />}>Relations</TabsTrigger>
          <TabsTrigger value="arrests" icon={<Gavel className="w-4 h-4" />}>Arrestations</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Nationalité" value={member.nationality} />
                <InfoRow label="DNA" value={member.dna_profile} mono />
                <InfoRow label="Profession" value={member.profession} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rôle dans l'organisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Rôle" value={member.role} />
                <InfoRow label="Grade" value={member.grade} />
                {member.organization && (
                  <div className="pt-2">
                    <span className="text-sm text-gray-500">Organisation</span>
                    <Link to={`/organizations/${member.organization_id}`} className="block text-primary-400 hover:text-primary-300 mt-1">
                      {member.organization.name}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {member.observations && (
              <Card className="sm:col-span-2">
                <CardHeader>
                  <CardTitle>Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 whitespace-pre-wrap">{member.observations}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="relations" className="mt-4">
          {relations.length === 0 ? (
            <EmptyState title="Aucune relation" description="Aucune relation enregistrée pour ce membre" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {relations.map((r) => {
                const otherPerson = r.person_a_id === id ? r.person_b : r.person_a;
                const relationLabels: Record<string, string> = {
                  family: 'Famille',
                  associate: 'Associé',
                  enemy: 'Ennemi',
                  rival: 'Rival',
                  partner: 'Partenaire',
                  friend: 'Ami',
                };
                return (
                  <Card key={r.id} className="cursor-pointer hover:border-dark-600" onClick={() => navigate(`/members/${r.person_a_id === id ? r.person_b_id : r.person_a_id}`)}>
                    <div className="flex items-center gap-3">
                      <Avatar src={otherPerson?.photo_url} name={`${otherPerson?.first_name} ${otherPerson?.last_name}`} size="md" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-100">{otherPerson?.first_name} {otherPerson?.last_name}</p>
                        <p className="text-sm text-gray-500">{r.description}</p>
                      </div>
                      <Badge variant="neutral">{relationLabels[r.relation_type || ''] || r.relation_type}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="arrests" className="mt-4">
          {arrests.length === 0 ? (
            <EmptyState title="Aucune arrestation" description="Aucune arrestation enregistrée pour ce membre" />
          ) : (
            <div className="space-y-4">
              {arrests.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-100">{new Date(a.arrest_date).toLocaleDateString('fr-FR')}</p>
                      <div className="flex gap-2 mt-1">
                        {a.charges?.map((c, i) => <Badge key={i} variant="neutral">{c}</Badge>)}
                      </div>
                      {a.judicial_outcome && <p className="text-sm text-gray-500 mt-2">{a.judicial_outcome}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Agent: {a.arresting_agent?.display_name || a.arresting_agent_id}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer le membre"
        message={`Êtes-vous sûr de vouloir supprimer "${fullName}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-gray-100 ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}
