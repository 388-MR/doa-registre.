import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingState } from '../components/ui/Empty';
import { ImageUpload } from '../components/ui/ImageUpload';
import { getMember, createMember, updateMember, getOrganizations } from '../services/organizations';
import type { MemberInput, Organization } from '../types';

export function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberInput>({
    defaultValues: {
      organization_id: searchParams.get('org') || null,
      first_name: '',
      last_name: '',
      nickname: '',
      birth_date: '',
      phone: '',
      dna_profile: '',
      profession: '',
      role: '',
      grade: '',
      address: '',
      nationality: '',
      observations: '',
      status: 'active',
      is_wanted: false,
      danger_level: 1,
      photo_url: '',
      id_card_url: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);

        if (id) {
          const member = await getMember(id);
          if (member) {
            reset({
              organization_id: member.organization_id,
              first_name: member.first_name || '',
              last_name: member.last_name || '',
              nickname: member.nickname || '',
              birth_date: member.birth_date || '',
              phone: member.phone || '',
              dna_profile: member.dna_profile || '',
              profession: member.profession || '',
              role: member.role || '',
              grade: member.grade || '',
              address: member.address || '',
              nationality: member.nationality || '',
              observations: member.observations || '',
              status: member.status,
              is_wanted: member.is_wanted,
              danger_level: member.danger_level,
              photo_url: '',
              id_card_url: '',
            });
            setPhotoUrl(member.photo_url || null);
            setIdCardUrl(member.id_card_url || null);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, reset]);

  const onSubmit = async (data: MemberInput) => {
    setIsSaving(true);
    try {
      const input: MemberInput = {
        ...data,
        organization_id: (data.organization_id as string) || null,
        danger_level: Number(data.danger_level) || 1,
        is_wanted: Boolean(data.is_wanted),
        birth_date: (data.birth_date as string) || null,
        photo_url: photoUrl || null,
        id_card_url: idCardUrl || null,
      };
      if (id) {
        await updateMember(id, input);
      } else {
        await createMember(input);
      }
      navigate(-1 as any);
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Erreur lors de la sauvegarde: ' + (error as any)?.message || 'Erreur inconnue');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Chargement..." />;
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-100">
          {id ? 'Modifier le membre' : 'Nouveau membre'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">

          {/* Identité */}
          <Card>
            <CardHeader><CardTitle>Identité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Prénom" placeholder="Jean" error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Nom" placeholder="Dupont" error={errors.last_name?.message} {...register('last_name')} />
                <Input label="Surnom" placeholder="Le Jean" {...register('nickname')} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Date de naissance" type="date" {...register('birth_date')} />
                <Input label="Nationalité" placeholder="Française" {...register('nationality')} />
              </div>

              {/* Photo + ID card images */}
              <div className="grid sm:grid-cols-2 gap-6 pt-2">
                <ImageUpload
                  label="Photo du membre"
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  placeholder="Importer une photo"
                />
                <ImageUpload
                  label="Carte d'identité"
                  value={idCardUrl}
                  onChange={setIdCardUrl}
                  placeholder="Importer la carte d'identité"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Profession */}
          <Card>
            <CardHeader><CardTitle>Contact & Profession</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Téléphone" placeholder="0612345678" {...register('phone')} />
                <Input label="Profession déclarée" placeholder="Chauffeur" {...register('profession')} />
              </div>
              <Input label="Adresse" placeholder="123 Rue Example, Los Santos" {...register('address')} />
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">ADN</label>
                <input
                  type="text"
                  placeholder="DNA-XXXX-XXXX"
                  {...register('dna_profile')}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1">Profil ADN issu du fichier biométrique</p>
              </div>
            </CardContent>
          </Card>

          {/* Organisation */}
          <Card>
            <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Organisation"
                options={[
                  { value: '', label: 'Aucune organisation' },
                  ...organizations.map((o) => ({ value: o.id, label: o.name })),
                ]}
                {...register('organization_id')}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Fonction dans l'organisation"
                  options={[
                    { value: 'leader', label: 'Leader' },
                    { value: 'co_leader', label: 'Co-Leader' },
                    { value: 'haut_grade', label: 'Haut Gradé' },
                    { value: 'bas_grade', label: 'Bas Gradé' },
                    { value: 'inconnu', label: 'Inconnu' },
                  ]}
                  {...register('grade')}
                />
                <Input label="Rôle / Titre personnalisé" placeholder="Ex: Chef de secteur..." {...register('role')} />
              </div>
            </CardContent>
          </Card>

          {/* Statut */}
          <Card>
            <CardHeader><CardTitle>Statut & Dangerosité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Statut"
                  options={[
                    { value: 'active', label: 'Actif' },
                    { value: 'incarcerated', label: 'Incarcéré' },
                    { value: 'deceased', label: 'Décédé' },
                    { value: 'unknown', label: 'Inconnu' },
                  ]}
                  {...register('status')}
                />
                <Select
                  label="Niveau de danger"
                  options={[
                    { value: '1', label: '1 - Faible' },
                    { value: '2', label: '2 - Modéré' },
                    { value: '3', label: '3 - Élevé' },
                    { value: '4', label: '4 - Très élevé' },
                    { value: '5', label: '5 - Extrême' },
                  ]}
                  {...register('danger_level')}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_wanted"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  {...register('is_wanted')}
                />
                <label htmlFor="is_wanted" className="text-sm text-gray-400">
                  Cette personne est activement recherchée
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader><CardTitle>Observations</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Notes et observations sur ce membre..." rows={4} {...register('observations')} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Annuler</Button>
            <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
