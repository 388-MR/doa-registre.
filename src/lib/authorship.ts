// Centralized authorship tracing — every service uses these helpers
// so that all create/update operations automatically stamp the
// matricule + codename of the currently connected agent.
//
// The session is set by AuthContext on login/refresh and read from
// Supabase, never from localStorage. This ensures multi-user correctness.

export interface AuthorStamp {
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
  updated_by_matricule?: string | null;
  updated_by_codename?: string | null;
}

interface SessionInfo {
  matricule: string | null;
  codename: string | null;
}

let currentSession: SessionInfo = { matricule: null, codename: null };

/** Called by AuthContext whenever the agent logs in or is refreshed. */
export function setAuthorshipSession(agent: { matricule: string; code_name: string | null; display_name: string | null } | null): void {
  if (agent) {
    currentSession = {
      matricule: agent.matricule,
      codename: agent.code_name || agent.display_name || null,
    };
  } else {
    currentSession = { matricule: null, codename: null };
  }
}

/** Returns the currently connected agent's matricule + codename. */
export function getAuthorshipSession(): SessionInfo {
  return currentSession;
}

/** Merge into an insert payload to stamp creation author + timestamps. */
export function stampCreate<T extends Record<string, unknown>>(payload: T): T & AuthorStamp {
  const { matricule, codename } = currentSession;
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
  const { matricule, codename } = currentSession;
  return {
    ...payload,
    updated_by_matricule: matricule,
    updated_by_codename: codename,
    updated_at: new Date().toISOString(),
  } as T & AuthorStamp;
}
