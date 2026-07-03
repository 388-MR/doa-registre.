import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Target, Car, Camera, MapPin, Shield,
  AlertTriangle, ArrowRight, Activity, FileText, Gavel,
  Clock, StickyNote, Edit3, FolderOpen,
} from 'lucide-react';
import { ThreatBadge } from '../components/ui/Badge';
import { getDashboardStats, getRecentActivity, getDangerousOrganizations, getRecentCases } from '../services/dashboard';
import { getLocalNotes, getLocalDrafts, type LocalNote, type LocalDraft } from '../services/storage';
import supabase from '../lib/supabase';
import type { DashboardStats, RecentActivity, Organization } from '../types';

const ORBIT_SHORTCUTS = [
  { key: 'organizations', label: 'Organisations', icon: Building2, color: '#60a5fa', href: '/organizations' },
  { key: 'members', label: 'Membres', icon: Users, color: '#22d3ee', href: '/members' },
  { key: 'informants', label: 'Indics', icon: Target, color: '#fbbf24', href: '/informants' },
  { key: 'cases', label: 'Affaires', icon: FolderOpen, color: '#f472b6', href: '/cases' },
];

const STATS_BAR = [
  { key: 'evidence', label: 'Preuves', icon: Camera, color: '#34d399', href: '/evidence' },
  { key: 'hideouts', label: 'Planques', icon: MapPin, color: '#fb923c', href: '/hideouts' },
  { key: 'headquarters', label: 'QG', icon: Shield, color: '#a78bfa', href: '/organizations' },
  { key: 'vehicles', label: 'Véhicules', icon: Car, color: '#94a3b8', href: '/vehicles' },
];

const ACTION_LABELS: Record<string, string> = {
  create: 'Ajouté', update: 'Modifié', delete: 'Supprimé', view: 'Consulté', export: 'Exporté',
};
const ENTITY_LABELS: Record<string, string> = {
  organizations: 'Organisation', members: 'Membre', informants: 'Indic',
  cases: 'Affaire', vehicles: 'Véhicule', evidence: 'Preuve',
  hideouts: 'Planque', headquarters: 'QG', arrests: 'Arrestation',
};

const REALTIME_TABLES = ['organizations', 'members', 'informants', 'vehicles', 'evidence', 'hideouts', 'headquarters', 'arrests'];

interface RecentArrest {
  id: string;
  arrest_date: string;
  charges: string[];
  notes: string | null;
  member: { first_name: string | null; last_name: string | null; } | null;
}

interface RecentEvidence {
  id: string;
  title: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface TimelineEntry {
  id: string;
  type: 'member' | 'arrest' | 'evidence' | 'case' | 'note' | 'draft' | 'activity';
  icon: typeof Users;
  color: string;
  title: string;
  subtitle: string;
  date: string;
  href: string;
}

function safeFormatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function safeFormatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Logo with 3D tilt + radial glow ──
function HubLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ rx: (py - 0.5) * -16, ry: (px - 0.5) * 16 });
    setGlow({ x: px * 100, y: py * 100, opacity: 0.7 });
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setGlow({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative"
      style={{ perspective: '800px' }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(96,165,250,${glow.opacity}) 0%, transparent 60%)`,
          filter: 'blur(40px)',
          transform: 'scale(1.8)',
        }}
      />
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          src="/DOA_logo_GTA_V.webp"
          alt="DOA Logo"
          className="w-40 h-40 md:w-48 md:h-48 object-contain select-none pointer-events-none"
          draggable={false}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}
        />
      </div>
    </div>
  );
}

// ── Orbit shortcut ──
function OrbitShortcut({ shortcut, value, angle, radius }: {
  shortcut: typeof ORBIT_SHORTCUTS[number];
  value: number | string;
  angle: number;
  radius: number;
}) {
  const Icon = shortcut.icon;
  const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
  const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

  return (
    <Link
      to={shortcut.href}
      className="absolute group"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        left: '50%',
        top: '50%',
        marginLeft: '-40px',
        marginTop: '-40px',
      }}
    >
      <div className="flex flex-col items-center gap-1 w-20 transition-transform duration-200 group-hover:scale-110">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all duration-200 group-hover:border-white/25"
          style={{
            background: `${shortcut.color}12`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: shortcut.color }} />
        </div>
        <span className="text-lg font-bold text-gray-100 leading-none">{value}</span>
        <span className="text-[10px] text-gray-500 leading-none">{shortcut.label}</span>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dangerousOrgs, setDangerousOrgs] = useState<Organization[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [recentArrests, setRecentArrests] = useState<RecentArrest[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<RecentEvidence[]>([]);
  const [recentNotes, setRecentNotes] = useState<LocalNote[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<LocalDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const loadStats = useCallback(async () => {
    const [s, a, o, cases, membersData, arrestsData, evidenceData] = await Promise.all([
      getDashboardStats(),
      getRecentActivity(8),
      getDangerousOrganizations(10),
      getRecentCases(5),
      supabase.from('members').select('id, first_name, last_name, nickname, status, created_at, organization:organizations(name, color)').order('created_at', { ascending: false }).limit(8),
      supabase.from('arrests').select('id, arrest_date, charges, notes, member:members(first_name, last_name)').order('arrest_date', { ascending: false }).limit(5),
      supabase.from('evidence').select('id, title, created_at, metadata').order('created_at', { ascending: false }).limit(5),
    ]);

    setStats(s);
    setRecentActivity(a);
    setDangerousOrgs(o);
    setRecentCases(cases);
    setRecentMembers(membersData.data || []);
    setRecentArrests((arrestsData.data || []) as RecentArrest[]);
    setRecentEvidence((evidenceData.data || []) as RecentEvidence[]);
    setRecentNotes(getLocalNotes().slice(0, 3));
    setRecentDrafts(getLocalDrafts().slice(0, 3));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadStats().finally(() => setIsLoading(false));
  }, [loadStats]);

  useEffect(() => {
    const channel = supabase.channel('dashboard-realtime');
    REALTIME_TABLES.forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { loadStats(); });
    });
    channel.subscribe(status => { setRealtimeConnected(status === 'SUBSCRIBED'); });
    return () => { supabase.removeChannel(channel); };
  }, [loadStats]);

  // ── Unified timeline ──
  const timeline = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    recentMembers.forEach(m => {
      items.push({
        id: `m-${m.id}`,
        type: 'member',
        icon: Users,
        color: '#22d3ee',
        title: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.nickname || 'Inconnu',
        subtitle: m.organization?.name || 'Nouveau membre',
        date: m.created_at,
        href: `/members/${m.id}`,
      });
    });

    recentArrests.forEach(a => {
      const name = a.member ? [a.member.first_name, a.member.last_name].filter(Boolean).join(' ') || 'Inconnu' : 'Inconnu';
      items.push({
        id: `a-${a.id}`,
        type: 'arrest',
        icon: Gavel,
        color: '#f87171',
        title: name,
        subtitle: a.charges?.[0] || 'Arrestation',
        date: a.arrest_date,
        href: '/arrests',
      });
    });

    recentEvidence.forEach(e => {
      const meta = e.metadata && typeof e.metadata === 'object' ? e.metadata as Record<string, unknown> : {};
      items.push({
        id: `e-${e.id}`,
        type: 'evidence',
        icon: Camera,
        color: '#34d399',
        title: e.title || 'Sans titre',
        subtitle: meta.author_name ? `Par ${meta.author_name}` : 'Nouvelle preuve',
        date: (meta.evidence_date as string) || e.created_at,
        href: '/evidence',
      });
    });

    recentCases.forEach(c => {
      items.push({
        id: `c-${c.id}`,
        type: 'case',
        icon: FileText,
        color: '#fbbf24',
        title: c.title || 'Sans titre',
        subtitle: 'Affaire ouverte',
        date: c.updated_at || c.created_at,
        href: `/cases/${c.id}`,
      });
    });

    recentNotes.forEach(n => {
      items.push({
        id: `n-${n.id}`,
        type: 'note',
        icon: StickyNote,
        color: '#facc15',
        title: n.title || 'Sans titre',
        subtitle: n.content?.slice(0, 60) || 'Note',
        date: n.updated_at,
        href: '/notes',
      });
    });

    recentDrafts.forEach(d => {
      items.push({
        id: `d-${d.id}`,
        type: 'draft',
        icon: Edit3,
        color: '#60a5fa',
        title: d.title || 'Sans titre',
        subtitle: d.content?.slice(0, 60) || 'Brouillon',
        date: d.updated_at,
        href: '/brouillons',
      });
    });

    recentActivity.forEach(a => {
      items.push({
        id: `act-${a.id}`,
        type: 'activity',
        icon: Activity,
        color: '#94a3b8',
        title: `${ACTION_LABELS[a.action] || a.action} ${ENTITY_LABELS[a.entity_type] || a.entity_type}`,
        subtitle: a.user?.display_name || a.user?.matricule || 'Système',
        date: a.created_at,
        href: '/logs',
      });
    });

    return items
      .filter(i => i.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [recentMembers, recentArrests, recentEvidence, recentCases, recentNotes, recentDrafts, recentActivity]);

  const orbitRadius = 150;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vue d'ensemble — DOA Mission Row</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-gray-600">{realtimeConnected ? 'Temps réel actif' : 'Connexion...'}</span>
        </div>
      </div>

      {/* ── Hub central ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/40 min-h-[420px] flex items-center justify-center">
        {/* Radial background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, rgba(15,23,42,0) 70%)',
          }}
        />

        {/* Logo + orbit */}
        <div className="relative flex items-center justify-center" style={{ width: `${orbitRadius * 2 + 120}px`, height: `${orbitRadius * 2 + 120}px` }}>
          <HubLogo />

          {ORBIT_SHORTCUTS.map((shortcut, i) => {
            const angle = (360 / ORBIT_SHORTCUTS.length) * i;
            const value = stats?.[shortcut.key as keyof DashboardStats] ?? (isLoading ? '—' : 0);
            return (
              <OrbitShortcut
                key={shortcut.key}
                shortcut={shortcut}
                value={value}
                angle={angle}
                radius={orbitRadius}
              />
            );
          })}
        </div>
      </div>

      {/* ── Stats bar (secondary) ── */}
      <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
        {STATS_BAR.map(stat => {
          const Icon = stat.icon;
          const value = stats?.[stat.key as keyof DashboardStats] ?? (isLoading ? '—' : 0);
          return (
            <Link key={stat.key} to={stat.href} className="group flex items-center gap-2 transition-transform hover:scale-105">
              <Icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-lg font-bold text-gray-200">{value}</span>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Organisations à risque (carousel) ── */}
      {dangerousOrgs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-300">Organisations à risque</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {dangerousOrgs.map(org => (
              <Link
                key={org.id}
                to={`/organizations/${org.id}`}
                className="group flex-shrink-0 w-36 rounded-xl border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-3 hover:border-gray-700 hover:bg-gray-900/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: org.color || '#4d6fa8' }}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-200 group-hover:text-gray-100 truncate">{org.name}</div>
                  </div>
                </div>
                <ThreatBadge level={org.threat_level} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Unified timeline ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-cyan-500" />
          <h2 className="text-sm font-semibold text-gray-300">Activité récente</h2>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">Aucune activité récente</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-800" />
            <div className="space-y-3">
              {timeline.map(entry => {
                const Icon = entry.icon;
                return (
                  <Link
                    key={entry.id}
                    to={entry.href}
                    className="group flex items-start gap-3 relative"
                  >
                    {/* Icon node */}
                    <div
                      className="absolute -left-4 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-gray-900"
                      style={{ background: entry.color }}
                    >
                      <Icon className="w-2 h-2 text-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0 ml-2 py-1.5 px-3 rounded-lg hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-200 truncate group-hover:text-gray-100">{entry.title}</span>
                        <span className="text-xs text-gray-600 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {safeFormatDate(entry.date)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">{entry.subtitle}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
