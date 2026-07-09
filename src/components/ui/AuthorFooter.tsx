import { User, Clock, Edit3 } from 'lucide-react';

interface AuthorFooterProps {
  createdAt?: string | null;
  createdMatricule?: string | null;
  createdCodename?: string | null;
  updatedAt?: string | null;
  updatedMatricule?: string | null;
  updatedCodename?: string | null;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

function agentLabel(matricule: string | null | undefined, codename: string | null | undefined): string {
  if (codename && matricule) return `Agent DOA N°${matricule} — ${codename}`;
  if (codename) return codename;
  if (matricule) return `Agent DOA N°${matricule}`;
  return 'Inconnu';
}

export function AuthorFooter({
  createdAt,
  createdMatricule,
  createdCodename,
  updatedAt,
  updatedMatricule,
  updatedCodename,
}: AuthorFooterProps) {
  const created = formatDate(createdAt);
  const updated = formatDate(updatedAt);

  // Only show "Dernière modification" if updated_at differs meaningfully from created_at
  const hasBeenModified = updated && updatedAt && createdAt &&
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 5000;

  if (!created && !updated) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-800/40 select-none">
      {created && (
        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <User className="w-3 h-3 text-gray-700" />
          <span>
            Créé par <span className="text-gray-500">{agentLabel(createdMatricule, createdCodename)}</span>
            <span className="text-gray-700"> — {created}</span>
          </span>
        </div>
      )}
      {hasBeenModified && (
        <div className="flex items-center gap-2 text-[11px] text-gray-600 mt-1.5">
          <Edit3 className="w-3 h-3 text-gray-700" />
          <span>
            Dernière modification par <span className="text-gray-500">{agentLabel(updatedMatricule, updatedCodename)}</span>
            <span className="text-gray-700"> — {updated}</span>
          </span>
        </div>
      )}
    </div>
  );
}
