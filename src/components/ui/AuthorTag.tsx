import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import supabase from '../../lib/supabase';

const cache = new Map<string, string>();

export function AuthorTag({ matricule }: { matricule: string | null | undefined }) {
  const [codename, setCodename] = useState<string | null>(null);

  useEffect(() => {
    if (!matricule) return;
    if (cache.has(matricule)) {
      setCodename(cache.get(matricule)!);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('agents')
          .select('code_name, display_name')
          .ilike('matricule', matricule)
          .maybeSingle();
        if (!cancelled && data) {
          const name = data.code_name || data.display_name || matricule;
          cache.set(matricule, name);
          setCodename(name);
        } else if (!cancelled) {
          cache.set(matricule, matricule);
          setCodename(matricule);
        }
      } catch {
        if (!cancelled) setCodename(matricule);
      }
    })();
    return () => { cancelled = true; };
  }, [matricule]);

  if (!matricule) return null;

  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-600">
      <User className="w-2.5 h-2.5" />
      {codename || matricule}
    </span>
  );
}
