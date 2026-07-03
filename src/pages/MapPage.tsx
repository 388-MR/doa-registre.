import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MapPin, Plus, X, Save, Loader2, Filter, Trash2, Edit, ChevronRight, TreeDeciduous,
} from 'lucide-react';
import {
  getMapPoints, createMapPoint, updateMapPoint, deleteMapPoint,
  MAP_POINT_TYPES, getPointTypeEmoji, type MapPoint,
} from '../services/map';
import { getOrganizations, type Organization } from '../services/organizations';
import { logCreate, logUpdate, logDelete } from '../services/logger';

// ─── Coordinate helpers ───────────────────────────────────────────────────────
// Keeps full compatibility with existing marker data (Leaflet CRS.Simple space).
// lat ∈ [-1000, 1000]: positive = up (low imageY), negative = down (high imageY)
// lng ∈ [-1000, 1000]: positive = right (high imageX), negative = left (low imageX)

function latLngToFrac(lat: number, lng: number) {
  return { fx: (lng + 1000) / 2000, fy: (1000 - lat) / 2000 };
}
function fracToLatLng(fx: number, fy: number) {
  return { lat: 1000 - fy * 2000, lng: fx * 2000 - 1000 };
}

const LS_CENTER   = { lat: 0,    lng: 0 };
const CAYO_CENTER = { lat: -850, lng: 850 };

// ─── Custom pan/zoom viewport ─────────────────────────────────────────────────
// transform: translate(panX, panY) scale(zoom)  — origin: top-left (0 0)
// A point at image-fraction (fx, fy) appears on screen at:
//   screenX = panX + fx * imgW * zoom
//   screenY = panY + fy * imgH * zoom
interface Viewport { zoom: number; panX: number; panY: number }

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ANIM_MS   = 500;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// easeInOutCubic
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MapPage() {
  const [points, setPoints]             = useState<MapPoint[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [placingMode, setPlacingMode]   = useState(false);
  const [editingPoint, setEditingPoint] = useState<MapPoint | null>(null);
  const [hoveredId, setHoveredId]       = useState<string | null>(null);
  const [showFilters, setShowFilters]   = useState(false);
  const [imgReady, setImgReady]         = useState(false);
  const [formData, setFormData]         = useState({
    name: '', type: 'qg', organization_id: '',
    latitude: 0, longitude: 0, color: '', notes: '',
  });
  const [filters, setFilters]           = useState({ types: [] as string[], organization_id: '' });
  const [viewport, setViewport]         = useState<Viewport>({ zoom: 1, panX: 0, panY: 0 });

  // Refs for event handlers (avoid stale closures)
  const vpRef        = useRef<Viewport>(viewport);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const animRef      = useRef<number>(0);
  const dragRef      = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const pinchRef     = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  const setVp = useCallback((v: Viewport) => {
    vpRef.current = v;
    setViewport(v);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pts, orgs] = await Promise.all([getMapPoints(), getOrganizations()]);
      setPoints(pts);
      setOrganizations(orgs.filter(o => o.status === 'active'));
      setLoading(false);
    })();
  }, []);

  // Fit image to container on first load
  const initViewport = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img || !img.naturalWidth) return;
    const scaleX = c.clientWidth  / img.naturalWidth;
    const scaleY = c.clientHeight / img.naturalHeight;
    const zoom   = Math.min(scaleX, scaleY, 1);
    const panX   = (c.clientWidth  - img.naturalWidth  * zoom) / 2;
    const panY   = (c.clientHeight - img.naturalHeight * zoom) / 2;
    setVp({ zoom, panX, panY });
    setImgReady(true);
  }, [setVp]);

  // ─── Pan / Zoom math ──────────────────────────────────────────────────────
  const getImgSize = () => ({
    w: imgRef.current?.naturalWidth  ?? 1000,
    h: imgRef.current?.naturalHeight ?? 1000,
  });

  const applyZoom = useCallback((factor: number, originX: number, originY: number) => {
    const { zoom, panX, panY } = vpRef.current;
    const newZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (newZoom === zoom) return;
    const newPanX = originX - (originX - panX) * (newZoom / zoom);
    const newPanY = originY - (originY - panY) * (newZoom / zoom);
    setVp({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }, [setVp]);

  const clampPan = useCallback((vp: Viewport): Viewport => {
    const c = containerRef.current;
    if (!c) return vp;
    const { w, h } = getImgSize();
    const maxPanX = c.clientWidth  * 0.9;
    const maxPanY = c.clientHeight * 0.9;
    const minPanX = c.clientWidth  - w * vp.zoom - c.clientWidth  * 0.1;
    const minPanY = c.clientHeight - h * vp.zoom - c.clientHeight * 0.1;
    return {
      ...vp,
      panX: clamp(vp.panX, minPanX, maxPanX),
      panY: clamp(vp.panY, minPanY, maxPanY),
    };
  }, []);

  // Animated fly-to
  const flyTo = useCallback((lat: number, lng: number, targetZoom = 3) => {
    const c = containerRef.current;
    if (!c) return;
    const { w, h } = getImgSize();
    const { fx, fy } = latLngToFrac(lat, lng);
    const tz = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);

    cancelAnimationFrame(animRef.current);

    const from = { ...vpRef.current };
    const toPanX = c.clientWidth  / 2 - fx * w * tz;
    const toPanY = c.clientHeight / 2 - fy * h * tz;
    const to: Viewport = { zoom: tz, panX: toPanX, panY: toPanY };

    const start = performance.now();
    const tick = (now: number) => {
      const t = ease(clamp((now - start) / ANIM_MS, 0, 1));
      const cur: Viewport = {
        zoom: lerp(from.zoom, to.zoom, t),
        panX: lerp(from.panX, to.panX, t),
        panY: lerp(from.panY, to.panY, t),
      };
      setVp(cur);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [setVp]);

  // ─── Mouse events ──────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const ox = e.clientX - rect.left;
    const oy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    applyZoom(factor, ox, oy);
  }, [applyZoom]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: vpRef.current.panX, startPanY: vpRef.current.panY };
    cancelAnimationFrame(animRef.current);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setVp(clampPan({ ...vpRef.current, panX: dragRef.current.startPanX + dx, panY: dragRef.current.startPanY + dy }));
  }, [setVp, clampPan]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);

    // Treat as click if barely moved
    if (dx < 5 && dy < 5 && placingMode) {
      const rect = containerRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const { w, h } = getImgSize();
      const fx = (cx - vpRef.current.panX) / (w * vpRef.current.zoom);
      const fy = (cy - vpRef.current.panY) / (h * vpRef.current.zoom);
      const { lat, lng } = fracToLatLng(fx, fy);
      setFormData(f => ({ ...f, latitude: lat, longitude: lng }));
      setPlacingMode(false);
    }

    dragRef.current = null;
  }, [placingMode]);

  // ─── Touch events ──────────────────────────────────────────────────────────
  function touchDist(t: React.TouchList) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startPanX: vpRef.current.panX, startPanY: vpRef.current.panY };
    } else if (e.touches.length === 2) {
      dragRef.current = null;
      const rect = containerRef.current!.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      pinchRef.current = { dist: touchDist(e.touches), midX, midY };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current) {
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      setVp(clampPan({ ...vpRef.current, panX: dragRef.current.startPanX + dx, panY: dragRef.current.startPanY + dy }));
    } else if (e.touches.length === 2 && pinchRef.current) {
      const rect = containerRef.current!.getBoundingClientRect();
      const newDist = touchDist(e.touches);
      const factor  = newDist / pinchRef.current.dist;
      applyZoom(factor, pinchRef.current.midX, pinchRef.current.midY);
      pinchRef.current.dist = newDist;
    }
  }, [setVp, clampPan, applyZoom]);

  const onTouchEnd = useCallback(() => {
    dragRef.current  = null;
    pinchRef.current = null;
  }, []);

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const openAddForm = () => {
    setFormData({ name: '', type: 'qg', organization_id: '', latitude: 0, longitude: 0, color: MAP_POINT_TYPES.find(t => t.value === 'qg')?.defaultColor || '#4d6fa8', notes: '' });
    setEditingPoint(null);
    setShowForm(true);
    setPlacingMode(true);
  };

  const openEditForm = (point: MapPoint) => {
    setFormData({ name: point.name, type: point.type, organization_id: point.organization_id || '', latitude: point.latitude, longitude: point.longitude, color: point.color, notes: point.notes || '' });
    setEditingPoint(point);
    setShowForm(true);
    setPlacingMode(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || (formData.latitude === 0 && formData.longitude === 0)) return;
    setSaving(true);
    const org   = organizations.find(o => o.id === formData.organization_id);
    const color = org?.color || MAP_POINT_TYPES.find(t => t.value === formData.type)?.defaultColor || '#4d6fa8';
    try {
      if (editingPoint) {
        const updated = await updateMapPoint(editingPoint.id, { ...formData, organization_id: formData.organization_id || null, color, notes: formData.notes || null });
        if (updated) {
          logUpdate('map_points', updated.id, updated.name, {}, {});
          setPoints(ps => ps.map(p => p.id === updated.id ? updated : p));
        }
      } else {
        const created = await createMapPoint({ name: formData.name, type: formData.type, icon: formData.type, organization_id: formData.organization_id || null, latitude: formData.latitude, longitude: formData.longitude, color, notes: formData.notes || null });
        logCreate('map_points', created.id, created.name, { type: created.type });
        setPoints(ps => [created, ...ps]);
      }
      setShowForm(false);
      setEditingPoint(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (point: MapPoint) => {
    if (!confirm(`Supprimer le point "${point.name}" ?`)) return;
    await deleteMapPoint(point.id);
    logDelete('map_points', point.id, point.name, {});
    setPoints(ps => ps.filter(p => p.id !== point.id));
    setShowForm(false);
    setEditingPoint(null);
  };

  const pointColor = (p: MapPoint) => (p.organization_id && p.organization?.color) ? p.organization.color : p.color || MAP_POINT_TYPES.find(t => t.value === p.type)?.defaultColor || '#4d6fa8';

  const filteredPoints = points.filter(p => {
    if (filters.types.length > 0 && !filters.types.includes(p.type)) return false;
    if (filters.organization_id && p.organization_id !== filters.organization_id) return false;
    return true;
  });

  const typeLabel = (type: string) => MAP_POINT_TYPES.find(t => t.value === type)?.label || type;

  const pointsByOrg = organizations.map(org => ({ org, pts: filteredPoints.filter(p => p.organization_id === org.id) })).filter(g => g.pts.length > 0);
  const unassigned  = filteredPoints.filter(p => !p.organization_id);

  // Marker screen position
  const markerScreenPos = (p: MapPoint) => {
    const { w, h } = getImgSize();
    const { fx, fy } = latLngToFrac(p.latitude, p.longitude);
    return {
      x: viewport.panX + fx * w * viewport.zoom,
      y: viewport.panY + fy * h * viewport.zoom,
    };
  };

  return (
    <div className="h-[calc(100vh-56px)] flex" style={{ userSelect: 'none' }}>
      {/* ─── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#080b0f', borderRight: '1px solid #141922' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid #141922' }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-500" />Los Santos
            </h1>
            <button onClick={openAddForm} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors">
              <Plus className="w-3.5 h-3.5" />Ajouter
            </button>
          </div>
          <p className="text-[10px] text-gray-600">{filteredPoints.length} point{filteredPoints.length !== 1 ? 's' : ''} enregistré{filteredPoints.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Zone toggle */}
        <div className="px-3 py-2 flex gap-2" style={{ borderBottom: '1px solid #141922' }}>
          <button onClick={() => flyTo(LS_CENTER.lat, LS_CENTER.lng, 1)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors">
            <MapPin className="w-3 h-3" />Los Santos
          </button>
          <button onClick={() => flyTo(CAYO_CENTER.lat, CAYO_CENTER.lng, 3)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors">
            <TreeDeciduous className="w-3 h-3" />Cayo Perico
          </button>
        </div>

        {/* Filters */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid #141922' }}>
          <button onClick={() => setShowFilters(v => !v)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-200 transition-colors w-full">
            <Filter className="w-3 h-3" />Filtres
            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${showFilters ? 'rotate-90' : ''}`} />
          </button>
          {showFilters && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {MAP_POINT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setFilters(f => ({ ...f, types: f.types.includes(t.value) ? f.types.filter(x => x !== t.value) : [...f.types, t.value] }))} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${filters.types.includes(t.value) ? 'bg-cyan-800 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-200'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <select value={filters.organization_id} onChange={e => setFilters(f => ({ ...f, organization_id: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300">
                <option value="">Toutes les organisations</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {(filters.types.length > 0 || filters.organization_id) && (
                <button onClick={() => setFilters({ types: [], organization_id: '' })} className="text-xs text-gray-600 hover:text-gray-400">Réinitialiser</button>
              )}
            </div>
          )}
        </div>

        {/* Points list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-gray-700 animate-spin" /></div>
          ) : (
            <>
              {pointsByOrg.map(({ org, pts }) => (
                <div key={org.id} className="mb-1">
                  <div className="flex items-center gap-2 px-3 py-1 mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: org.color || '#4d6fa8' }} />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{org.name}</span>
                    <span className="text-[10px] text-gray-700">({pts.length})</span>
                  </div>
                  {pts.map(p => (
                    <SidebarPointRow key={p.id} point={p} color={pointColor(p)} emoji={getPointTypeEmoji(p.type)} label={typeLabel(p.type)} isHovered={hoveredId === p.id}
                      onClick={() => flyTo(p.latitude, p.longitude, 4)}
                      onEdit={() => openEditForm(p)} />
                  ))}
                </div>
              ))}
              {unassigned.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center gap-2 px-3 py-1 mt-1">
                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Sans organisation</span>
                    <span className="text-[10px] text-gray-700">({unassigned.length})</span>
                  </div>
                  {unassigned.map(p => (
                    <SidebarPointRow key={p.id} point={p} color={pointColor(p)} emoji={getPointTypeEmoji(p.type)} label={typeLabel(p.type)} isHovered={hoveredId === p.id}
                      onClick={() => flyTo(p.latitude, p.longitude, 4)}
                      onEdit={() => openEditForm(p)} />
                  ))}
                </div>
              )}
              {filteredPoints.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Aucun point enregistré</p>
                  <button onClick={openAddForm} className="mt-2 text-xs text-cyan-600 hover:text-cyan-400 transition-colors">Ajouter le premier point</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Map area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden" style={{ background: '#0d1320' }}>
        {/* Form overlay */}
        {showForm && (
          <div className="absolute top-4 right-4 z-30 w-72 rounded-xl shadow-2xl p-4" style={{ background: 'rgba(8,11,15,0.97)', border: '1px solid #1e2938' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-100">
                {editingPoint ? 'Modifier' : placingMode ? '📍 Cliquer sur la carte' : 'Nouveau point'}
              </h3>
              <button onClick={() => { setShowForm(false); setPlacingMode(false); setEditingPoint(null); }}>
                <X className="w-4 h-4 text-gray-600 hover:text-gray-200" />
              </button>
            </div>
            {placingMode ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 animate-pulse">📍</div>
                <p className="text-xs text-gray-400">Cliquez à l'endroit voulu sur la carte</p>
                <p className="text-[10px] text-gray-600 mt-1">Le formulaire s'ouvrira automatiquement</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Nom *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-cyan-700" placeholder="Nom du point..." autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value, color: MAP_POINT_TYPES.find(t => t.value === e.target.value)?.defaultColor || f.color }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
                    {MAP_POINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Organisation (optionnel)</label>
                  <select value={formData.organization_id} onChange={e => { const org = organizations.find(o => o.id === e.target.value); setFormData(f => ({ ...f, organization_id: e.target.value, color: org?.color || f.color })); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
                    <option value="">Aucune (LSPD / EMS / Neutre)</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 resize-none" placeholder="Observations..." />
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-white" style={{ background: formData.color }}>{getPointTypeEmoji(formData.type)}</div>
                  <div>
                    <div className="text-xs text-gray-400">{formData.name || 'Sans nom'}</div>
                    <div className="text-[10px] text-gray-600">{typeLabel(formData.type)}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={saving || !formData.name.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs transition-colors disabled:opacity-40">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {editingPoint ? 'Mettre à jour' : 'Placer le point'}
                  </button>
                  {editingPoint && (
                    <button onClick={() => handleDelete(editingPoint)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placing mode indicator */}
        {placingMode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs text-white pointer-events-none" style={{ background: 'rgba(8,11,15,0.85)', border: '1px solid #22d3ee' }}>
            Cliquez sur la carte pour placer le point
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
          <button onClick={() => applyZoom(1.3, containerRef.current ? containerRef.current.clientWidth / 2 : 0, containerRef.current ? containerRef.current.clientHeight / 2 : 0)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white transition-colors text-lg font-bold" style={{ background: 'rgba(8,11,15,0.9)', border: '1px solid #1e2938' }}>+</button>
          <button onClick={() => applyZoom(1 / 1.3, containerRef.current ? containerRef.current.clientWidth / 2 : 0, containerRef.current ? containerRef.current.clientHeight / 2 : 0)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white transition-colors text-lg font-bold" style={{ background: 'rgba(8,11,15,0.9)', border: '1px solid #1e2938' }}>−</button>
          <button onClick={initViewport} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 transition-colors text-xs" style={{ background: 'rgba(8,11,15,0.9)', border: '1px solid #1e2938' }} title="Réinitialiser">⊙</button>
        </div>

        {/* ─── Pan/Zoom container ─────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="w-full h-full relative"
          style={{ cursor: placingMode ? 'crosshair' : 'grab', overflow: 'hidden', touchAction: 'none' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Image + markers inside one transformed container */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              transformOrigin: '0 0',
              transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
              willChange: 'transform',
            }}
          >
            <img
              ref={imgRef}
              src="/imCARFTELSage.png"
              alt="Carte Los Santos"
              draggable={false}
              onLoad={initViewport}
              style={{
                display: 'block',
                maxWidth: 'none',
                imageRendering: 'auto',
              }}
            />

            {/* Markers — positioned in image pixel space (no zoom math needed, they scale with the container) */}
            {imgReady && filteredPoints.map(point => {
              const { w, h } = getImgSize();
              const { fx, fy } = latLngToFrac(point.latitude, point.longitude);
              const px = fx * w;
              const py = fy * h;
              const isHov = hoveredId === point.id;
              const col   = pointColor(point);

              return (
                <div
                  key={point.id}
                  style={{
                    position: 'absolute',
                    left: px,
                    top:  py,
                    transform: `translate(-50%, -50%) scale(${(isHov ? 1.25 : 1) / viewport.zoom})`,
                    transformOrigin: '50% 50%',
                    transition: 'transform 0.15s ease',
                    cursor: 'pointer',
                    zIndex: isHov ? 10 : 1,
                  }}
                  onMouseEnter={() => setHoveredId(point.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={e => { e.stopPropagation(); setHoveredId(point.id); openEditForm(point); }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: col,
                    border: `2px solid ${isHov ? 'white' : 'rgba(255,255,255,0.7)'}`,
                    boxShadow: isHov ? `0 0 10px ${col}aa, 0 3px 8px rgba(0,0,0,0.6)` : '0 2px 5px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    lineHeight: 1,
                  }}>
                    {getPointTypeEmoji(point.type)}
                  </div>

                  {/* Tooltip on hover */}
                  {isHov && (
                    <div style={{
                      position: 'absolute',
                      bottom: '110%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(8,11,15,0.95)',
                      border: '1px solid #1e2938',
                      borderRadius: 8,
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}>
                      <div style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>{point.name}</div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>{getPointTypeEmoji(point.type)} {typeLabel(point.type)}</div>
                      {point.organization && (
                        <div style={{ color: '#64748b', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: point.organization.color || col, display: 'inline-block' }} />
                          {point.organization.name}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, background: 'rgba(8,11,15,0.95)', borderRight: '1px solid #1e2938', borderBottom: '1px solid #1e2938', rotate: '45deg' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar row ──────────────────────────────────────────────────────────────
function SidebarPointRow({ point, color, emoji, label, isHovered, onClick, onEdit }: {
  point: MapPoint; color: string; emoji: string; label: string;
  isHovered: boolean; onClick: () => void; onEdit: () => void;
}) {
  return (
    <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors group cursor-pointer ${isHovered ? 'bg-gray-800/70' : 'hover:bg-gray-800/40'}`}
      onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: color, border: '1.5px solid rgba(255,255,255,0.25)' }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{point.name}</div>
        <div className="text-[10px] text-gray-600">{label}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); onEdit(); }} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-cyan-400 transition-all p-0.5">
        <Edit className="w-3 h-3" />
      </button>
    </div>
  );
}
