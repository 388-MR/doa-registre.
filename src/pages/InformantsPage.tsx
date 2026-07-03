import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Search, Phone, Briefcase, User, Loader2 } from 'lucide-react';
import { getLocalInformantsAsync, type LocalInformant } from '../services/storage';
import { AuthorTag } from '../components/ui/AuthorTag';

const FUNCTION_LABELS: Record<string, string> = {
  employee: 'Employé',
  gang_member: 'Gang',
  criminal_org: 'Org. criminelle',
  biker: 'Biker',
  unemployed: 'Sans emploi',
  other: 'Autre',
};

const RELIABILITY_COLORS: Record<string, string> = {
  fiable: '#22c55e',
  non_fiable: '#ef4444',
  inconnu: '#6b7280',
};

const RELIABILITY_LABELS: Record<string, string> = {
  fiable: 'Fiable',
  non_fiable: 'Non fiable',
  inconnu: 'Inconnu',
};

export function InformantsPage() {
  const navigate = useNavigate();
  const [informants, setInformants] = useState<LocalInformant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocalInformantsAsync().then(data => {
      setInformants(data);
      setLoading(false);
    });
  }, []);

  const filtered = informants.filter(i =>
    [i.first_name, i.last_name, i.phone, i.function_detail].some(
      f => f && f.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-500" />Indics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Registre des sources d'information confidentielles</p>
        </div>
        <button
          onClick={() => navigate('/informants/new')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />Nouvel indic
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          type="text"
          placeholder="Rechercher un indic..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900/40 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-800">
          <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun indic enregistré'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/informants/new')}
              className="mt-4 text-cyan-500 text-sm hover:underline"
            >
              Créer le premier indic
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(informant => (
            <InformantCard
              key={informant.id}
              informant={informant}
              onClick={() => navigate(`/informants/${informant.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InformantCard({ informant, onClick }: { informant: LocalInformant; onClick: () => void }) {
  const fullName = [informant.first_name, informant.last_name].filter(Boolean).join(' ') || 'Inconnu';
  const status = informant.reliability_status || 'inconnu';
  const statusColor = RELIABILITY_COLORS[status];
  const statusLabel = RELIABILITY_LABELS[status];

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-gray-800/60 bg-gray-900/20 p-4 hover:border-gray-600 hover:bg-gray-900/40 transition-all group"
    >
      <div className="flex items-start gap-3">
        {informant.photo_url ? (
          <img
            src={informant.photo_url}
            alt=""
            className="w-12 h-12 rounded-full object-cover border border-gray-700 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100 truncate group-hover:text-white transition-colors">
              {fullName}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${statusColor}20`, color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          {informant.function_type && (
            <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">
              {FUNCTION_LABELS[informant.function_type] ?? informant.function_type}
            </span>
          )}
          {informant.phone && (
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1.5">
              <Phone className="w-3 h-3" />{informant.phone}
            </div>
          )}
          {informant.function_detail && (
            <div className="flex items-center gap-1 text-xs text-gray-700 mt-0.5 truncate">
              <Briefcase className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{informant.function_detail}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AuthorTag matricule={(informant as Record<string, unknown>).created_by_matricule as string} />
          <span className="text-[10px] text-gray-700">
            {new Date(informant.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <span className="text-[10px] text-cyan-700 group-hover:text-cyan-500 transition-colors">
          Consulter →
        </span>
      </div>
    </button>
  );
}
