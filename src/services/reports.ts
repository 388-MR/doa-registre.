// Periodic Reports Service — builds reports from audit_log data in Supabase.
// No localStorage, no simulated data. Everything is from the database.
import supabase from '../lib/supabase';
import { stampCreate } from '../lib/authorship';
import { getAuthorshipSession } from '../lib/authorship';

export const REPORT_TYPES = [
  { value: 'agent', label: "Activité d'un agent DOA" },
  { value: 'organization', label: "Activité d'une organisation" },
  { value: 'global', label: 'Activité globale' },
] as const;

export const PERIOD_PRESETS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'this_week', label: 'Cette semaine' },
  { value: 'last_week', label: 'Semaine dernière' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: 'custom', label: 'Personnalisée' },
] as const;

export interface PeriodicReport {
  id: string;
  report_type: string;
  date_from: string;
  date_to: string;
  content: Record<string, unknown>;
  generated_by: string | null;
  created_at: string;
  created_by_matricule?: string | null;
  created_by_codename?: string | null;
}

export interface ReportContent {
  report_kind: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  subject_name: string | null;
  subject_matricule: string | null;
  actions: {
    id: string;
    action: string;
    action_label: string;
    entity_type: string;
    entity_name: string | null;
    created_at: string;
  }[];
  summary: {
    total_actions: number;
    by_action: { action: string; label: string; count: number }[];
    by_entity: { entity_type: string; count: number }[];
  };
}

export function getPeriodRange(preset: string, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(today);
  to.setDate(to.getDate() + 1);
  const from = new Date(today);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
      break;
    case 'this_week': {
      const day = from.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      from.setDate(from.getDate() + diff);
      break;
    }
    case 'last_week': {
      const day = from.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      from.setDate(from.getDate() + diff - 7);
      to.setDate(from.getDate() + 7);
      break;
    }
    case 'this_month':
      from.setDate(1);
      break;
    case 'last_month':
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      to.setDate(1);
      break;
    case 'custom':
      return {
        from: customFrom || from.toISOString().split('T')[0],
        to: customTo || to.toISOString().split('T')[0],
      };
  }
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function mapActionLabel(action: string): string {
  const map: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    delete: 'Suppression',
    view: 'Consultation',
    export: 'Export',
    login: 'Connexion',
    logout: 'Déconnexion',
  };
  return map[action] || action;
}

function entityLabel(entityType: string): string {
  const map: Record<string, string> = {
    organizations: 'Organisation',
    members: 'Membre',
    vehicles: 'Véhicule',
    hideouts: 'Planque',
    headquarters: 'QG',
    businesses: 'Business',
    evidence: 'Preuve',
    arrests: 'Arrestation',
    notes: 'Note',
    cases: 'Dossier',
    informants: 'Indic',
    plantations: 'Plantation',
    map_points: 'Point de carte',
    surveillance: 'Surveillance',
    periodic_reports: 'Rapport',
    organization_relations: 'Relation',
    agent: 'Agent',
  };
  return map[entityType] || entityType;
}

export async function getPeriodicReports(): Promise<PeriodicReport[]> {
  const { data, error } = await supabase
    .from('periodic_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPeriodicReport(id: string): Promise<PeriodicReport | null> {
  const { data, error } = await supabase
    .from('periodic_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deletePeriodicReport(id: string): Promise<void> {
  const { error } = await supabase.from('periodic_reports').delete().eq('id', id);
  if (error) throw error;
}

export async function generateReportContent(
  reportKind: string,
  dateFrom: string,
  dateTo: string,
  subjectMatricule?: string,
  subjectOrgId?: string
): Promise<ReportContent> {
  const fromIso = new Date(dateFrom + 'T00:00:00').toISOString();
  const toIso = new Date(dateTo + 'T23:59:59').toISOString();

  let query = supabase
    .from('audit_log')
    .select('id, action, action_label, entity_type, entity_id, entity_name, agent_matricule, agent_codename, created_at')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true });

  if (reportKind === 'agent' && subjectMatricule) {
    query = query.eq('agent_matricule', subjectMatricule);
  }

  const { data: logs, error } = await query;
  if (error) throw error;

  let actions = (logs || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    action: String(row.action),
    action_label: (row.action_label as string) || mapActionLabel(String(row.action)),
    entity_type: String(row.entity_type),
    entity_name: (row.entity_name as string) || null,
    created_at: String(row.created_at),
  }));

  let subjectName: string | null = null;
  let subjectMat: string | null = subjectMatricule || null;

  if (reportKind === 'organization' && subjectOrgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', subjectOrgId)
      .maybeSingle();
    subjectName = org?.name || null;
    actions = actions.filter(
      (a) => a.entity_type === 'organizations' && a.entity_name?.includes(subjectName || '___')
    );
  } else if (reportKind === 'agent' && subjectMatricule) {
    const { data: agent } = await supabase
      .from('agents')
      .select('code_name, display_name')
      .ilike('matricule', subjectMatricule)
      .maybeSingle();
    subjectName = agent?.code_name || agent?.display_name || null;
  }

  const byActionMap: Record<string, { action: string; label: string; count: number }> = {};
  const byEntityMap: Record<string, { entity_type: string; count: number }> = {};

  for (const a of actions) {
    const key = a.action;
    if (!byActionMap[key]) {
      byActionMap[key] = { action: key, label: mapActionLabel(key), count: 0 };
    }
    byActionMap[key].count++;

    const ek = a.entity_type;
    if (!byEntityMap[ek]) {
      byEntityMap[ek] = { entity_type: ek, count: 0 };
    }
    byEntityMap[ek].count++;
  }

  return {
    report_kind: reportKind,
    period_start: dateFrom,
    period_end: dateTo,
    generated_at: new Date().toISOString(),
    subject_name: subjectName,
    subject_matricule: subjectMat,
    actions,
    summary: {
      total_actions: actions.length,
      by_action: Object.values(byActionMap).sort((a, b) => b.count - a.count),
      by_entity: Object.values(byEntityMap).sort((a, b) => b.count - a.count),
    },
  };
}

export async function createPeriodicReport(
  reportKind: string,
  dateFrom: string,
  dateTo: string,
  subjectMatricule?: string,
  subjectOrgId?: string
): Promise<PeriodicReport> {
  const { matricule } = getAuthorshipSession();
  const content = await generateReportContent(reportKind, dateFrom, dateTo, subjectMatricule, subjectOrgId);

  const report = {
    report_type: reportKind,
    date_from: dateFrom,
    date_to: dateTo,
    content: content as unknown as Record<string, unknown>,
    generated_by: matricule,
  };

  const { data, error } = await supabase
    .from('periodic_reports')
    .insert(stampCreate(report as Record<string, unknown>))
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function exportReportAsHtml(report: PeriodicReport): void {
  const content = report.content as unknown as ReportContent;
  const subjectLine = content.subject_name
    ? `${content.subject_name}${content.subject_matricule ? ` (${content.subject_matricule})` : ''}`
    : 'Tous les agents';

  const actionsHtml = content.actions
    .map((a) => {
      const date = new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const ent = entityLabel(a.entity_type);
      return `<tr><td>${date}</td><td>${a.action_label}</td><td>${ent}</td><td>${a.entity_name || ''}</td></tr>`;
    })
    .join('');

  const summaryByAction = content.summary.by_action
    .map((s) => `<tr><td>${s.label}</td><td>${s.count}</td></tr>`)
    .join('');

  const summaryByEntity = content.summary.by_entity
    .map((s) => `<tr><td>${entityLabel(s.entity_type)}</td><td>${s.count}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport DOA - ${subjectLine}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #0e7490; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { font-size: 16px; color: #0e7490; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 600; }
    .header { text-align: center; margin-bottom: 40px; }
    .header .logo { font-size: 28px; font-weight: bold; color: #0e7490; }
    .header .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">DOA - Drug Observation Agency</div>
    <div class="subtitle">Rapport d'activité</div>
  </div>

  <h1>Rapport du ${new Date(content.period_start).toLocaleDateString('fr-FR')} au ${new Date(content.period_end).toLocaleDateString('fr-FR')}</h1>

  <h2>Sujet</h2>
  <table>
    <tr><th>Sujet</th><td>${subjectLine}</td></tr>
    <tr><th>Total actions</th><td>${content.summary.total_actions}</td></tr>
  </table>

  <h2>Répartition par type d'action</h2>
  <table><tr><th>Action</th><th>Nombre</th></tr>${summaryByAction}</table>

  <h2>Répartition par type de ressource</h2>
  <table><tr><th>Ressource</th><th>Nombre</th></tr>${summaryByEntity}</table>

  <h2>Détail des actions</h2>
  <table><tr><th>Date</th><th>Action</th><th>Type</th><th>Détail</th></tr>${actionsHtml}</table>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - DOA Registre
  </footer>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function getReportTypeLabel(type: string): string {
  return REPORT_TYPES.find((t) => t.value === type)?.label || type;
}
