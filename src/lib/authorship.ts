// Centralized authorship tracing — every service uses these helpers
// so that all create/update operations automatically stamp the
// matricule + codename of the currently connected agent.

export interface AuthorStamp {
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
}

function getSession(): { matricule: string | null; codename: string | null } {
  try {
    const raw = localStorage.getItem('doa_session_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      const agent = parsed.agent;
      if (agent) {
        return {
          matricule: agent.matricule || null,
          codename: agent.code_name || agent.display_name || null,
        };
      }
    }
  } catch { /* ignore */ }
  return { matricule: null, codename: null };
}

/** Merge into an insert payload to stamp creation author + timestamps. */
export function stampCreate<T extends Record<string, unknown>>(payload: T): T & AuthorStamp {
  const { matricule, codename } = getSession();
  const now = new Date().toISOString();
  return {
    ...payload,
    created_by_matricule: matricule,
    created_by_codename: codename,
    updated_by_matricule: matricule,
    updated_by_codename: codename,
    updated_at: now,
    created_at: (payload as Record<string, unknown>).created_at ?? now,
  } as T & AuthorStamp;
}

/** Merge into an update payload to stamp the last editor + timestamp. */
export function stampUpdate<T extends Record<string, unknown>>(payload: T): T & AuthorStamp {
  const { matricule, codename } = getSession();
  return {
    ...payload,
    updated_by_matricule: matricule,
    updated_by_codename: codename,
    updated_at: new Date().toISOString(),
  } as T & AuthorStamp;
}
