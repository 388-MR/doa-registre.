import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { LoadingState } from '../components/ui/Empty';
import { getOrganization, createOrganization, updateOrganization } from '../services/organizations';
import type { OrganizationInput, OrganizationCategory } from '../types';

const colors = [
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Jaune' },
  { value: '#22c55e', label: 'Vert' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#1a1a2e', label: 'Noir' },
  { value: '#374151', label: 'Gris' },
  { value: '#ffffff', label: 'Blanc' },
];

export function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrganizationInput>({
    defaultValues: {
      name: '',
      category: (searchParams.get('category') as OrganizationCategory) || 'criminal_org',
      color: '#4d6fa8',
      threat_level: 3,
      status: 'active',
      description: '',
      notes: '',
      logo_url: null,
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    async function loadOrganization() {
      if (!id) return;
      setIsLoading(true);
      try {
        const org = await getOrganization(id);
        if (org) {
          reset({
            name: org.name,
            category: org.category,
            logo_url: null,
            color: org.color || '#4d6fa8',
            threat_level: org.threat_level,
            status: org.status,
            description: org.description || '',
            notes: org.notes || '',
          });
        }
      } catch (error) {
        console.error('Failed to load organization:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrganization();
  }, [id, reset]);

  const onSubmit = async (data: OrganizationInput) => {
    setIsSaving(true);
    try {
      const payload = { ...data, threat_level: Number(data.threat_level) || 1 };
      if (id) {
        await updateOrganization(id, payload);
      } else {
        await createOrganization(payload);
      }
      navigate('/organizations');
    } catch (error) {
      console.error('Failed to save organization:', error);
      alert('Erreur lors de la sauvegarde: ' + (error as any)?.message || 'Erreur inconnue');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Chargement..." />;
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-100">
          {id ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nom de l'organisation"
                placeholder="Ex: Renskaia"
                error={errors.name?.message}
                {...register('name', { required: 'Le nom est requis' })}
              />
              <Select
                label="Catégorie"
                options={[
                  { value: 'bikers', label: 'Bikers' },
                  { value: 'criminal_org', label: 'Organisation criminelle' },
                  { value: 'gang', label: 'Gang' },
                ]}
                {...register('category')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => reset((prev) => ({ ...prev, color: c.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === c.value ? 'border-white scale-110' : 'border-dark-600'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Niveau de menace"
                options={[
                  { value: '1', label: '1 - Très faible' },
                  { value: '2', label: '2 - Faible' },
                  { value: '3', label: '3 - Moyen' },
                  { value: '4', label: '4 - Élevé' },
                  { value: '5', label: '5 - Critique' },
                ]}
                {...register('threat_level')}
              />
              <Select
                label="Statut"
                options={[
                  { value: 'active', label: 'Actif' },
                  { value: 'archived', label: 'Archivé' },
                  { value: 'dissolved', label: 'Dissous' },
                ]}
                {...register('status')}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Description de l'organisation..."
              rows={3}
              {...register('description')}
            />

            <Textarea
              label="Notes internes"
              placeholder="Notes sécurisées visibles uniquement par la DOA..."
              rows={3}
              {...register('notes')}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
