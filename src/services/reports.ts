// Periodic Reports Service
import supabase from '../lib/supabase';
import { stampCreate, stampUpdate } from '../lib/authorship';
import { getOrganization } from './organizations';

export const REPORT_TYPES = [
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'personnalise', label: 'Personnalisé' },
] as const;

export interface PeriodicReport {
  id: string;
  report_type: string;
  date_from: string;
  date_to: string;
  content: Record<string, unknown>;
  generated_by: string | null;
  created_at: string;
}

export interface ReportContent {
  period_start: string;
  period_end: string;
  generated_at: string;
  organizations: {
    id: string;
    name: string;
    category: string;
    total_entries: number;
    crimes: { crime_type: string; count: number; latest_date: string }[];
    timeline: { date: string; crime_type: string; report: string | null }[];
  }[];
  summary: {
    total_organizations: number;
    total_crimes: number;
    top_crimes: { type: string; count: number }[];
    most_active_organizations: { name: string; count: number }[];
  };
}

const STORAGE_KEY = 'doa_periodic_reports_v1';
const CRIME_JOURNAL_PREFIX = 'doa_crime_journal_v1_';

// Get session helper
function getSessionInfo(): { matricule: string | null; name: string | null } {
  try {
    const session = localStorage.getItem('doa_session_v3');
    if (session) {
      const parsed = JSON.parse(session);
      return {
        matricule: parsed.agent?.matricule || null,
        name: parsed.agent?.display_name || null,
      };
    }
  } catch {}
  return { matricule: null, name: null };
}

// Get all reports
export async function getPeriodicReports(): Promise<PeriodicReport[]> {
  try {
    const { data, error } = await supabase
      .from('periodic_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  }
}

// Get single report
export async function getPeriodicReport(id: string): Promise<PeriodicReport | null> {
  try {
    const { data, error } = await supabase
      .from('periodic_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    const reports = await getPeriodicReports();
    return reports.find(r => r.id === id) || null;
  }
}

// Generate report content
export async function generateReportContent(dateFrom: string, dateTo: string): Promise<ReportContent> {
  // Get all organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, category')
    .eq('status', 'active');

  const organizations: ReportContent['organizations'] = [];

  for (const org of orgs || []) {
    // Get crime journal for this org
    const storageKey = `${CRIME_JOURNAL_PREFIX}${org.id}`;
    let entries: { id: string; crime_type: string; date: string; report: string | null; created_at: string }[] = [];

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) entries = JSON.parse(stored);
    } catch {}

    // Filter by date range
    const filtered = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= new Date(dateFrom) && entryDate <= new Date(dateTo);
    });

    if (filtered.length === 0) continue;

    // Aggregate crimes
    const crimeCounts: Record<string, { count: number; latest_date: string }> = {};
    for (const entry of filtered) {
      if (!crimeCounts[entry.crime_type]) {
        crimeCounts[entry.crime_type] = { count: 0, latest_date: entry.date };
      }
      crimeCounts[entry.crime_type].count++;
      if (new Date(entry.date) > new Date(crimeCounts[entry.crime_type].latest_date)) {
        crimeCounts[entry.crime_type].latest_date = entry.date;
      }
    }

    const crimes = Object.entries(crimeCounts).map(([crime_type, data]) => ({
      crime_type,
      count: data.count,
      latest_date: data.latest_date,
    }));

    // Timeline
    const timeline = filtered
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => ({ date: e.date, crime_type: e.crime_type, report: e.report }));

    organizations.push({
      id: org.id,
      name: org.name,
      category: org.category,
      total_entries: filtered.length,
      crimes,
      timeline,
    });
  }

  // Summary
  let totalCrimes = 0;
  const crimeTypeCounts: Record<string, number> = {};
  const orgCounts: Record<string, number> = {};

  for (const org of organizations) {
    totalCrimes += org.total_entries;
    orgCounts[org.name] = org.total_entries;
    for (const crime of org.crimes) {
      crimeTypeCounts[crime.crime_type] = (crimeTypeCounts[crime.crime_type] || 0) + crime.count;
    }
  }

  const topCrimes = Object.entries(crimeTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const mostActive = Object.entries(orgCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    period_start: dateFrom,
    period_end: dateTo,
    generated_at: new Date().toISOString(),
    organizations,
    summary: {
      total_organizations: organizations.length,
      total_crimes: totalCrimes,
      top_crimes: topCrimes,
      most_active_organizations: mostActive,
    },
  };
}

// Create and save report
export async function createPeriodicReport(
  reportType: string,
  dateFrom: string,
  dateTo: string
): Promise<PeriodicReport> {
  const session = getSessionInfo();
  const content = await generateReportContent(dateFrom, dateTo);

  const report = {
    report_type: reportType,
    date_from: dateFrom,
    date_to: dateTo,
    content: content as unknown as Record<string, unknown>,
    generated_by: session.matricule,
  };

  try {
    const { data, error } = await supabase
      .from('periodic_reports')
      .insert(stampCreate(report as Record<string, unknown>))
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch {
    const reports = await getPeriodicReports();
    const newReport: PeriodicReport = {
      id: `report-${Date.now()}`,
      ...report,
      created_at: new Date().toISOString(),
    };
    reports.unshift(newReport);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return newReport;
  }
}

// Delete report
export async function deletePeriodicReport(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('periodic_reports').delete().eq('id', id);
    if (error) throw error;
  } catch {
    const reports = await getPeriodicReports();
    const filtered = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

// Export report as HTML
export function exportReportAsHtml(report: PeriodicReport): void {
  const content = report.content as ReportContent;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport ${report.report_type} - DOA</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #0e7490; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { font-size: 16px; color: #0e7490; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .section { margin-bottom: 25px; padding: 20px; background: #f8fafc; border-left: 4px solid #0e7490; }
    .org { margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
    .org-name { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; }
    .count { background: #dbeafe; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
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
    <div class="subtitle">Rapport ${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}</div>
  </div>

  <h1>Rapport du ${new Date(content.period_start).toLocaleDateString('fr-FR')} au ${new Date(content.period_end).toLocaleDateString('fr-FR')}</h1>

  <h2>Synthèse</h2>
  <div class="section">
    <table>
      <tr><th>Organisations analysées</th><td>${content.summary.total_organizations}</td></tr>
      <tr><th>Total infractions</th><td>${content.summary.total_crimes}</td></tr>
    </table>

    <h3 style="margin-top: 15px;">Top infractions</h3>
    <table>
      <tr><th>Type</th><th>Nombre</th></tr>
      ${content.summary.top_crimes.map(c => `<tr><td>${c.type}</td><td>${c.count}</td></tr>`).join('')}
    </table>

    <h3 style="margin-top: 15px;">Organisations les plus actives</h3>
    <table>
      <tr><th>Organisation</th><th>Infractions</th></tr>
      ${content.summary.most_active_organizations.map(o => `<tr><td>${o.name}</td><td>${o.count}</td></tr>`).join('')}
    </table>
  </div>

  <h2>Détail par organisation</h2>
  ${content.organizations.map(org => `
    <div class="org">
      <div class="org-name">${org.name}</div>
      <p><span class="badge count">${org.total_entries} infractions</span></p>
      ${org.crimes.length > 0 ? `
        <table>
          <tr><th>Infraction</th><th>Nombre</th><th>Dernière date</th></tr>
          ${org.crimes.map(c => `<tr><td>${c.crime_type}</td><td>${c.count}</td><td>${new Date(c.latest_date).toLocaleDateString('fr-FR')}</td></tr>`).join('')}
        </table>
      ` : ''}
    </div>
  `).join('')}

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
  return REPORT_TYPES.find(t => t.value === type)?.label || type;
}
