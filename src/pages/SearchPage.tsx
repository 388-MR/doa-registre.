import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, Car, Target, Loader2, ArrowRight } from 'lucide-react';
import supabase from '../lib/supabase';

interface SearchResult {
  type: 'member' | 'organization' | 'vehicle' | 'informant';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  meta?: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Users; color: string }> = {
  member: { label: 'Membre', icon: Users, color: '#22d3ee' },
  organization: { label: 'Organisation', icon: Building2, color: '#60a5fa' },
  vehicle: { label: 'Véhicule', icon: Car, color: '#94a3b8' },
  informant: { label: 'Indic', icon: Target, color: '#fbbf24' },
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const term = `%${q.trim()}%`;
    try {
      const [members, orgs, vehicles, informants] = await Promise.all([
        supabase.from('members')
          .select('id, first_name, last_name, nickname, phone, dna_profile, grade, organization:organizations(name)')
          .or(`first_name.ilike.${term},last_name.ilike.${term},nickname.ilike.${term},phone.ilike.${term},dna_profile.ilike.${term}`)
          .limit(10),
        supabase.from('organizations')
          .select('id, name, category, threat_level')
          .ilike('name', term)
          .limit(8),
        supabase.from('vehicles')
          .select('id, plate, make, model, color, organization:organizations(name)')
          .or(`plate.ilike.${term},make.ilike.${term},model.ilike.${term}`)
          .limit(8),
        supabase.from('informants')
          .select('id, first_name, last_name, nickname, phone')
          .or(`first_name.ilike.${term},last_name.ilike.${term},nickname.ilike.${term},phone.ilike.${term}`)
          .limit(8),
      ]);

      const all: SearchResult[] = [
        ...(members.data || []).map((m: any) => ({
          type: 'member' as const,
          id: m.id,
          title: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu',
          subtitle: m.organization?.name || 'Sans organisation',
          url: `/members/${m.id}`,
          meta: [m.phone, m.dna_profile].filter(Boolean).join(' · '),
        })),
        ...(orgs.data || []).map((o: any) => ({
          type: 'organization' as const,
          id: o.id,
          title: o.name,
          subtitle: o.category === 'criminal_org' ? 'Org. criminelle' : o.category === 'gang' ? 'Gang' : 'Bikers',
          url: `/organizations/${o.id}`,
          meta: `Menace ${o.threat_level}/5`,
        })),
        ...(vehicles.data || []).map((v: any) => ({
          type: 'vehicle' as const,
          id: v.id,
          title: v.plate || 'Plaque inconnue',
          subtitle: [v.make, v.model, v.color].filter(Boolean).join(' '),
          url: `/vehicles`,
          meta: v.organization?.name || undefined,
        })),
        ...(informants.data || []).map((i: any) => ({
          type: 'informant' as const,
          id: i.id,
          title: [i.first_name, i.last_name].filter(Boolean).join(' ') || i.nickname || 'Inconnu',
          subtitle: 'Informateur',
          url: `/informants`,
          meta: i.phone || undefined,
        })),
      ];

      setResults(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (v: string) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      runSearch(query);
    }
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-500" />Recherche globale
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Membres, organisations, véhicules, indics, téléphone, DNA...</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom, prénom, plaque, téléphone, ADN..."
          className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-base text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 animate-spin" />}
      </div>

      {/* Results */}
      {!searched && !query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-800 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Commencez à saisir pour rechercher</p>
          <p className="text-gray-700 text-xs mt-1">Minimum 2 caractères</p>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Aucun résultat pour <span className="text-gray-300">"{query}"</span></p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-5">
          {(Object.keys(grouped) as string[]).map(type => {
            const group = grouped[type];
            const meta = TYPE_LABELS[type];
            if (!meta || !group?.length) return null;
            const Icon = meta.icon;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}s</span>
                  <span className="text-xs text-gray-700">({group.length})</span>
                </div>
                <div className="space-y-1.5">
                  {group.map(result => (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.url)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800/60 bg-gray-900/20 hover:border-gray-700 hover:bg-gray-900/40 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}18` }}>
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-gray-100 transition-colors">{result.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{result.subtitle}{result.meta ? ` · ${result.meta}` : ''}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
