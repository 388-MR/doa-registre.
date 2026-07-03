import { useEffect, useState } from 'react';
import {
  FileBarChart, Calendar, Plus, Loader2, Trash2, ExternalLink, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import {
  getPeriodicReports, createPeriodicReport, deletePeriodicReport, exportReportAsHtml,
  REPORT_TYPES, type PeriodicReport, type ReportContent
} from '../services/reports';
import { logCreate, logDelete } from '../services/logger';

export function PeriodicReportsPage() {
  const [reports, setReports] = useState<PeriodicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formType, setFormType] = useState('hebdomadaire');
  const [formDateFrom, setFormDateFrom] = useState('');
  const [formDateTo, setFormDateTo] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await getPeriodicReports();
    setReports(data);
    setLoading(false);
  };

  const getDateRange = (type: string) => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;

    if (type === 'hebdomadaire') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString().split('T')[0];
    } else if (type === 'mensuel') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      from = monthAgo.toISOString().split('T')[0];
    } else {
      from = formDateFrom || to;
    }

    return { from, to: type === 'personnalise' ? formDateTo || to : to };
  };

  const handleGenerate = async () => {
    const { from, to } = getDateRange(formType);
    if (!from || !to) return;

    setGenerating(true);
    try {
      const report = await createPeriodicReport(formType, from, to);
      logCreate('periodic_reports', report.id, `Rapport ${formType}`, { date_from: from, date_to: to });
      setReports([report, ...reports]);
      setShowForm(false);
      setFormType('hebdomadaire');
      setFormDateFrom('');
      setFormDateTo('');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (report: PeriodicReport) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    await deletePeriodicReport(report.id);
    logDelete('periodic_reports', report.id, `Rapport ${report.report_type}`, {});
    setReports(reports.filter(r => r.id !== report.id));
  };

  const handleExport = (report: PeriodicReport) => {
    exportReportAsHtml(report);
  };

  const getReportTypeLabel = (type: string) => REPORT_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-cyan-500" />
            Rapports périodiques
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Synthèse des journaux de crime par période</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Générer un rapport
        </button>
      </div>

      {/* Generation form */}
      {showForm && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Générer un nouveau rapport</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type de rapport</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-700"
              >
                {REPORT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {formType === 'personnalise' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date début</label>
                  <input
                    type="date"
                    value={formDateFrom}
                    onChange={e => setFormDateFrom(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={formDateTo}
                    onChange={e => setFormDateTo(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleGenerate}
              disabled={generating || (formType === 'personnalise' && (!formDateFrom || !formDateTo))}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
              Générer
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gray-600 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <FileBarChart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun rapport généré</p>
          <p className="text-xs text-gray-700 mt-1">Cliquez sur "Générer un rapport" pour créer une synthèse</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const content = report.content as ReportContent;
            const isExpanded = expandedId === report.id;

            return (
              <div key={report.id} className="rounded-xl border border-gray-800/50 bg-gray-900/20 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-800/20 transition-colors"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-900/30 text-cyan-400">
                        {getReportTypeLabel(report.report_type)}
                      </span>
                      <span className="text-sm text-gray-200">
                        {new Date(report.date_from + 'T12:00:00').toLocaleDateString('fr-FR')} → {new Date(report.date_to + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{content.summary?.total_organizations || 0} organisations</span>
                      <span>{content.summary?.total_crimes || 0} infractions</span>
                      <span>Généré le {new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 py-4 border-t border-gray-800/50 bg-gray-900/30">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Organisations analysées</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.total_organizations || 0}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Total infractions</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.total_crimes || 0}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Types d'infractions</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.top_crimes?.length || 0}</div>
                      </div>
                    </div>

                    {/* Top crimes */}
                    {content.summary?.top_crimes && content.summary.top_crimes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Top infractions</h4>
                        <div className="flex flex-wrap gap-2">
                          {content.summary.top_crimes.slice(0, 5).map((c, i) => (
                            <div key={i} className="bg-gray-900/50 rounded-lg px-3 py-2">
                              <div className="text-xs text-gray-200">{c.type}</div>
                              <div className="text-lg font-bold text-cyan-400">{c.count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Organizations detail */}
                    {content.organizations && content.organizations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Détail par organisation</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {content.organizations.map(org => (
                            <div key={org.id} className="bg-gray-900/50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-200">{org.name}</span>
                                <span className="text-xs text-gray-500">{org.total_entries} infractions</span>
                              </div>
                              {org.crimes && org.crimes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {org.crimes.slice(0, 4).map((c, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                                      {c.crime_type} ({c.count})
                                    </span>
                                  ))}
                                  {org.crimes.length > 4 && (
                                    <span className="text-[10px] text-gray-600">+{org.crimes.length - 4} autres</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                      <button
                        onClick={() => handleExport(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-cyan-900/40 text-cyan-400 rounded-lg text-xs hover:bg-cyan-900/20 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />Exporter
                      </button>
                      <button
                        onClick={() => handleDelete(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
