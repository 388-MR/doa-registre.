import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Filter, Download, Loader2, User, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { getLogsAsync, type LogEntry } from '../services/logger';

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  view: 'Consultation',
  export: 'Export',
  login: 'Connexion',
  logout: 'Déconnexion',
};

const ENTITY_LABELS: Record<string, string> = {
  organizations: 'Organisation',
  members: 'Membre',
  informants: 'Indic',
  cases: 'Affaire',
  vehicles: 'Véhicule',
  evidence: 'Preuve',
  hideouts: 'Planque',
  headquarters: 'QG',
  arrests: 'Arrestation',
  wanted: 'Avis de recherche',
  settings: 'Paramètres',
  roles: 'Rôle',
  session: 'Session',
  dossier: 'Dossier',
  crime_journal: 'Journal de crime',
  business: 'Business',
  territory: 'Propriété',
};

export function LogsPage() {
  const navigate = useNavigate();
  const { canViewLogs } = usePermissions();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    entity_type: '',
    user_matricule: '',
    date_from: '',
    date_to: '',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewLogs) {
      navigate('/');
      return;
    }
    loadLogsData();
  }, [canViewLogs, navigate]);

  const loadLogsData = () => {
    setLoading(true);
    getLogsAsync().then(data => { setLogs(data); setLoading(false); });
  };

  const filteredLogs = logs.filter(log => {
    if (filter.action && log.action !== filter.action) return false;
    if (filter.entity_type && log.entity_type !== filter.entity_type) return false;
    if (filter.user_matricule && !log.user_matricule?.toLowerCase().includes(filter.user_matricule.toLowerCase())) return false;
    if (filter.date_from) {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      if (logDate < filter.date_from) return false;
    }
    if (filter.date_to) {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      if (logDate > filter.date_to) return false;
    }
    return true;
  });

  const exportLogs = () => {
    const csv = [
      ['Date', 'Matricule', 'Action', 'Type', 'Entité', 'Details'].join(','),
      ...filteredLogs.map(l => [
        new Date(l.created_at).toLocaleString('fr-FR'),
        l.user_matricule || 'Système',
        ACTION_LABELS[l.action] || l.action,
        ENTITY_LABELS[l.entity_type] || l.entity_type,
        l.entity_name || l.entity_id || '-',
        l.new_values ? JSON.stringify(l.new_values).replace(/"/g, "'") : '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-doa-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!canViewLogs) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Logs système
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Historique complet des actions sur le registre</p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-400">Filtres</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] text-gray-600 mb-1">Action</label>
            <select
              value={filter.action}
              onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
            >
              <option value="">Toutes</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-600 mb-1">Type</label>
            <select
              value={filter.entity_type}
              onChange={e => setFilter(f => ({ ...f, entity_type: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
            >
              <option value="">Tous</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-600 mb-1">Matricule</label>
            <input
              type="text"
              value={filter.user_matricule}
              onChange={e => setFilter(f => ({ ...f, user_matricule: e.target.value }))}
              placeholder="Ex: 388"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-600 mb-1">Du</label>
            <input
              type="date"
              value={filter.date_from}
              onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-600 mb-1">Au</label>
            <input
              type="date"
              value={filter.date_to}
              onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
            />
          </div>
        </div>
        {(filter.action || filter.entity_type || filter.user_matricule || filter.date_from || filter.date_to) && (
          <button
            onClick={() => setFilter({ action: '', entity_type: '', user_matricule: '', date_from: '', date_to: '' })}
            className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gray-600 animate-spin" /></div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun log trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => (
            <div
              key={log.id}
              className="rounded-xl border border-gray-800/50 bg-gray-900/20 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-800/20 transition-colors"
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      log.action === 'create' ? 'bg-green-900/30 text-green-400' :
                      log.action === 'delete' ? 'bg-red-900/30 text-red-400' :
                      log.action === 'login' || log.action === 'logout' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-700/30 text-gray-400'
                    }`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-sm text-gray-200">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </span>
                    {log.entity_name && (
                      <span className="text-xs text-gray-500">· {log.entity_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    {log.user_matricule && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.user_name || log.user_matricule}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                {expandedId === log.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
              </button>

              {expandedId === log.id && (log.old_values || log.new_values) && (
                <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/30">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {log.old_values && Object.keys(log.old_values).length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Anciennes valeurs</span>
                        <pre className="mt-1 text-xs text-gray-500 bg-gray-900/50 rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && Object.keys(log.new_values).length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Nouvelles valeurs</span>
                        <pre className="mt-1 text-xs text-gray-400 bg-gray-900/50 rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-700 text-center pt-4">
        {filteredLogs.length} entrée{filteredLogs.length !== 1 ? 's' : ''} · Lecture seule
      </div>
    </div>
  );
}
