import { useEffect, useState, useCallback } from 'react';
import {
  FileBarChart, Calendar, Plus, Loader2, Trash2, ExternalLink, ChevronDown, ChevronUp, X, Search
} from 'lucide-react';
import {
  getPeriodicReports, createPeriodicReport, deletePeriodicReport, exportReportAsHtml,
  REPORT_TYPES, PERIOD_PRESETS, getPeriodRange,
  type PeriodicReport, type ReportContent
} from '../services/reports';
import { logCreate, logDelete } from '../services/logger';
import supabase from '../lib/supabase';
import type { Agent, Organization } from '../types';

interface AgentOption { matricule: string; code_name: string | null; display_name: string | null; }

export function PeriodicReportsPage() {
  const [reports, setReports] = useState<PeriodicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formKind, setFormKind] = useState('global');
  const [formPreset, setFormPreset] = useState('this_week');
  const [formDateFrom, setFormDateFrom] = useState('');
  const [formDateTo, setFormDateTo] = useState('');
  const [formAgentMatricule, setFormAgentMatricule] = useState('');
  const [formOrgId, setFormOrgId] = useState('');

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [agentSearch, setAgentSearch] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPeriodicReports();
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    supabase.from('agents').select('matricule, code_name, display_name').order('matricule').then(({ data }) => {
      setAgents(data || []);
    });
    supabase.from('organizations').select('*').eq('status', 'active').order('name').then(({ data }) => {
      setOrganizations(data || []);
    });
  }, [loadReports]);

  const filteredAgents = agents.filter(a => {
    const q = agentSearch.toLowerCase();
    return a.matricule.toLowerCase().includes(q) ||
      (a.code_name || '').toLowerCase().includes(q) ||
      (a.display_name || '').toLowerCase().includes(q);
  });

  const handleGenerate = async () => {
    const { from, to } = getPeriodRange(formPreset, formDateFrom, formDateTo);
    if (!from || !to) return;

    setGenerating(true);
    try {
      const report = await createPeriodicReport(
        formKind,
        from,
        to,
        formKind === 'agent' ? formAgentMatricule : undefined,
        formKind === 'organization' ? formOrgId : undefined
      );
      logCreate('periodic_reports', report.id, `Rapport ${formKind}`, { date_from: from, date_to: to });
      await loadReports();
      setShowForm(false);
    } catch (e) {
      console.error('Failed to generate report:', e);
      alert('Erreur lors de la génération: ' + (e as Error)?.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (report: PeriodicReport) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    try {
      await deletePeriodicReport(report.id);
      logDelete('periodic_reports', report.id, `Rapport ${report.report_type}`, {});
      await loadReports();
    } catch (e) {
      alert('Erreur: ' + (e as Error)?.message);
    }
  };

  const getKindLabel = (kind: string) => REPORT_TYPES.find(t => t.value === kind)?.label || kind;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-cyan-500" />
            Rapports périodiques
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Génération automatique à partir du journal d'audit</p>
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
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">Générer un nouveau rapport</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Report type */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Type de rapport</label>
              <div className="grid grid-cols-3 gap-2">
                {REPORT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setFormKind(t.value)}
                    className={`px-3 py-2.5 rounded-lg text-xs transition-all border ${
                      formKind === t.value
                        ? 'bg-cyan-900/40 border-cyan-700 text-cyan-300'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Période</label>
              <div className="grid grid-cols-4 gap-2">
                {PERIOD_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setFormPreset(p.value)}
                    className={`px-2 py-2 rounded-lg text-xs transition-all border ${
                      formPreset === p.value
                        ? 'bg-cyan-900/40 border-cyan-700 text-cyan-300'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom dates */}
            {formPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            )}

            {/* Agent selector */}
            {formKind === 'agent' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Agent DOA</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un agent..."
                    value={agentSearch}
                    onChange={e => setAgentSearch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 pl-9"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-800/50">
                  {filteredAgents.slice(0, 20).map(a => (
                    <button
                      key={a.matricule}
                      onClick={() => setFormAgentMatricule(a.matricule)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        formAgentMatricule === a.matricule
                          ? 'bg-cyan-900/30 text-cyan-300'
                          : 'text-gray-300 hover:bg-gray-800/40'
                      }`}
                    >
                      <span>{a.code_name || a.display_name || 'Inconnu'}</span>
                      <span className="text-xs text-gray-500">N°{a.matricule}</span>
                    </button>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-600">Aucun agent trouvé</div>
                  )}
                </div>
                {formAgentMatricule && (
                  <div className="mt-2 text-xs text-cyan-400">
                    Sélectionné: {agents.find(a => a.matricule === formAgentMatricule)?.code_name || 'Inconnu'} (N°{formAgentMatricule})
                  </div>
                )}
              </div>
            )}

            {/* Organization selector */}
            {formKind === 'organization' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Organisation</label>
                <select
                  value={formOrgId}
                  onChange={e => setFormOrgId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  <option value="">Sélectionner...</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-2 border-t border-gray-800/50">
              <button
                onClick={handleGenerate}
                disabled={generating || (formPreset === 'custom' && (!formDateFrom || !formDateTo)) || (formKind === 'agent' && !formAgentMatricule) || (formKind === 'organization' && !formOrgId)}
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
        </div>
      )}

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gray-600 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <FileBarChart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun rapport généré</p>
          <p className="text-xs text-gray-700 mt-1">Cliquez sur "Générer un rapport" pour créer une synthèse d'activité</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const content = report.content as unknown as ReportContent;
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
                        {getKindLabel(report.report_type)}
                      </span>
                      {content.subject_name && (
                        <span className="text-sm text-gray-200">{content.subject_name}</span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(report.date_from + 'T12:00:00').toLocaleDateString('fr-FR')} → {new Date(report.date_to + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{content.summary?.total_actions || 0} actions</span>
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
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Total actions</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.total_actions || 0}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Types d'action</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.by_action?.length || 0}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-600 uppercase">Types de ressource</div>
                        <div className="text-xl font-bold text-gray-100 mt-1">{content.summary?.by_entity?.length || 0}</div>
                      </div>
                    </div>

                    {/* By action breakdown */}
                    {content.summary?.by_action && content.summary.by_action.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Répartition par type d'action</h4>
                        <div className="flex flex-wrap gap-2">
                          {content.summary.by_action.map((s, i) => (
                            <div key={i} className="bg-gray-900/50 rounded-lg px-3 py-1.5">
                              <span className="text-xs text-gray-300">{s.label}</span>
                              <span className="text-sm font-bold text-cyan-400 ml-2">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions list */}
                    {content.actions && content.actions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Détail des actions</h4>
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                          {content.actions.map((a) => {
                            const date = new Date(a.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={a.id} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2 text-xs">
                                <span className="text-gray-500 w-24">{date}</span>
                                <span className="text-gray-300 w-24">{a.action_label}</span>
                                <span className="text-gray-400">{a.entity_name || a.entity_type}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                      <button
                        onClick={() => exportReportAsHtml(report)}
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
