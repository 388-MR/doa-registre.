import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  FileText,
  Eye,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Bike,
  Plus,
  BookOpen,
  Settings,
  AlertTriangle,
  Activity,
  Map,
  Leaf,
  FileBarChart,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel } from '../../services/auth';
import { getOrganizations } from '../../services/organizations';
import type { Organization } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  criminal_org: 'Organisations criminelles',
  gang: 'Gangs',
  bikers: 'Gangs Bikers',
};

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  criminal_org: Building2,
  gang: Users,
  bikers: Bike,
};

const CATEGORY_ORDER = ['criminal_org', 'gang', 'bikers'];

export function Sidebar({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange: (v: boolean) => void }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['criminal_org', 'gang', 'bikers']));
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const { agent, logout } = useAuth();
  const { isCommandant, canViewLogs } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getOrganizations().then(orgs => setOrganizations(orgs.filter(o => o.status === 'active')));
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const orgsByCategory = CATEGORY_ORDER.reduce<Record<string, Organization[]>>((acc, cat) => {
    acc[cat] = organizations.filter(o => o.category === cat);
    return acc;
  }, {});

  const isOrgActive = (orgId: string) => location.pathname.startsWith(`/organizations/${orgId}`);

  const agentNum = agent?.matricule ? (isNaN(Number(agent.matricule)) ? agent.matricule : `N°${agent.matricule}`) : '';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: '#080b0f', borderRight: '1px solid #141922' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 flex-shrink-0" style={{ borderBottom: '1px solid #141922' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <img
              src="/DOA_logo_GTA_V.png"
              alt="DOA"
              className="w-8 h-8 object-contain flex-shrink-0 rounded-full"
              style={{ filter: 'invert(1)', background: '#000' }}
            />
            <div>
              <div className="text-xs font-bold text-gray-100 tracking-widest uppercase">Registre DOA</div>
              <div className="text-[9px] text-cyan-600 tracking-widest uppercase">Mission Row</div>
            </div>
          </div>
        ) : (
          <img
            src="/DOA_logo_GTA_V.png"
            alt="DOA"
            className="w-8 h-8 object-contain mx-auto rounded-full"
            style={{ filter: 'invert(1)', background: '#000' }}
          />
        )}
      </div>

      {/* Agent info */}
      {!collapsed && agent && (
        <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #141922' }}>
          <div className="text-xs font-semibold text-gray-200">{agent.display_name || agentNum}</div>
          <div className="text-[10px] text-gray-600">{getRoleLabel(agent.role)} · {agentNum}</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {/* Dashboard */}
        <NavItem to="/" icon={LayoutDashboard} label="Tableau de bord" collapsed={collapsed} exact />

        {/* Search */}
        <NavItem to="/search" icon={Search} label="Recherche" collapsed={collapsed} />

        {/* AFFAIRES section */}
        <div className="mt-3">
          {!collapsed && (
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Affaires</span>
            </div>
          )}
          {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: '#141922' }} />}

          {CATEGORY_ORDER.map(cat => {
            const Icon = CATEGORY_ICONS[cat];
            const orgs = orgsByCategory[cat] || [];
            const isExpanded = expandedCategories.has(cat);

            return (
              <div key={cat}>
                {/* Category header */}
                <button
                  onClick={() => { if (!collapsed) toggleCategory(cat); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group"
                  style={{ color: '#6b7890' }}
                  title={collapsed ? CATEGORY_LABELS[cat] : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-gray-300" style={{ color: '#4a5568' }} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">{CATEGORY_LABELS[cat]}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Orgs list */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 pl-3 border-l" style={{ borderColor: '#1a2030' }}>
                    {orgs.map(org => (
                      <NavLink
                        key={org.id}
                        to={`/organizations/${org.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group"
                        style={({ isActive }) => ({
                          color: isActive || isOrgActive(org.id) ? '#60a5fa' : '#6b7890',
                          background: isActive || isOrgActive(org.id) ? 'rgba(59,130,246,0.08)' : 'transparent',
                        })}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: org.color || '#4d6fa8' }}
                        />
                        <span className="truncate group-hover:text-gray-200">{org.name}</span>
                      </NavLink>
                    ))}
                    <button
                      onClick={() => navigate(`/organizations/new?category=${cat}`)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:text-gray-400 transition-colors w-full"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carte */}
        <div className="mt-3">
          {!collapsed && (
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Carte</span>
            </div>
          )}
          {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: '#141922' }} />}
          <NavItem to="/map" icon={Map} label="Carte Los Santos" collapsed={collapsed} />
        </div>

        {/* OTHER sections */}
        <div className="mt-3">
          {!collapsed && (
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Renseignement</span>
            </div>
          )}
          {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: '#141922' }} />}

          <NavItem to="/informants" icon={Target} label="Indics" collapsed={collapsed} />
          <NavItem to="/wanted" icon={AlertTriangle} label="Avis de recherche" collapsed={collapsed} />
          <NavItem to="/surveillance" icon={Eye} label="Surveillance" collapsed={collapsed} />
          <NavItem to="/plantations" icon={Leaf} label="Plantations" collapsed={collapsed} />
        </div>

        <div className="mt-3">
          {!collapsed && (
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Documents</span>
            </div>
          )}
          {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: '#141922' }} />}

          <NavItem to="/reports" icon={FileBarChart} label="Rapports périodiques" collapsed={collapsed} />
          <NavItem to="/notes" icon={FileText} label="Notes" collapsed={collapsed} />
          <NavItem to="/brouillons" icon={BookOpen} label="Brouillons" collapsed={collapsed} />
        </div>

        {isCommandant && (
          <div className="mt-3">
            {!collapsed && (
              <div className="px-3 mb-1">
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Administration</span>
              </div>
            )}
            {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: '#141922' }} />}
            <NavItem to="/settings" icon={Settings} label="Paramètres" collapsed={collapsed} />
            {canViewLogs && <NavItem to="/logs" icon={Activity} label="Logs" collapsed={collapsed} />}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid #141922' }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 mt-1 text-gray-700 hover:text-gray-400 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to, icon: Icon, label, collapsed, exact,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  collapsed: boolean;
  exact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 mx-1 rounded-lg text-sm transition-colors group ${
          isActive
            ? 'text-cyan-400'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
        }`
      }
      style={({ isActive }) => ({ background: isActive ? 'rgba(34,211,238,0.07)' : undefined })}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}
