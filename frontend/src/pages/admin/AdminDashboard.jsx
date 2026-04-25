import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DISTRICT_COORDS = {
  'Ampara':       [7.2833, 81.6742], 'Anuradhapura': [8.3114, 80.4037],
  'Badulla':      [6.9934, 81.0550], 'Batticaloa':   [7.7170, 81.7000],
  'Colombo':      [6.9271, 79.8612], 'Galle':        [6.0535, 80.2210],
  'Gampaha':      [7.0873, 79.9990], 'Hambantota':   [6.1429, 81.1212],
  'Jaffna':       [9.6615, 80.0255], 'Kalutara':     [6.5854, 79.9607],
  'Kandy':        [7.2906, 80.6337], 'Kegalle':      [7.2513, 80.3464],
  'Kilinochchi':  [9.3803, 80.4000], 'Kurunegala':   [7.4863, 80.3647],
  'Mannar':       [8.9784, 79.9044], 'Matale':       [7.4675, 80.6234],
  'Matara':       [5.9485, 80.5353], 'Monaragala':   [6.8728, 81.3507],
  'Mullaitivu':   [9.2671, 80.8128], 'Nuwara Eliya': [6.9497, 80.7891],
  'Polonnaruwa':  [7.9403, 81.0000], 'Puttalam':     [8.0362, 79.8283],
  'Ratnapura':    [6.6828, 80.3992], 'Trincomalee':  [8.5874, 81.2152],
  'Vavuniya':     [8.7515, 80.4971],
};
const SL_CENTER = [7.8731, 80.7718];

function heatColor(count, max) {
  if (max === 0) return '#3B82F6';
  const r = count / max;
  if (r <= 0.25) return '#60A5FA';
  if (r <= 0.5)  return '#F59E0B';
  if (r <= 0.75) return '#F97316';
  return '#EF4444';
}

const STATUS_STYLE = {
  pending:     { bg: '#F3F4F6', text: '#6B7280',  border: '#E5E7EB' },
  assigned:    { bg: '#EFF6FF', text: '#2563EB',  border: '#BFDBFE' },
  in_progress: { bg: '#FFFBEB', text: '#D97706',  border: '#FDE68A' },
  resolved:    { bg: '#F0FDF4', text: '#16A34A',  border: '#BBF7D0' },
};
const REPORT_STATUS_STYLE = {
  new:       { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  reviewed:  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  converted: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
};
const ROLE_STYLE = {
  admin:         { bg: '#EFF6FF', text: '#2563EB' },
  ngo:           { bg: '#F0FDF4', text: '#16A34A' },
  social_worker: { bg: '#FFF7ED', text: '#EA580C' },
};
const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved'];

const NAV_ITEMS = [
  { key: 'cases',   label: 'Cases' },
  { key: 'reports', label: 'Public Reports' },
  { key: 'users',   label: 'User Management' },
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab]   = useState('cases');
  const [darkMode, setDarkMode]     = useState(false);

  const [cases, setCases]     = useState([]);
  const [ngos, setNgos]       = useState([]);
  const [filter, setFilter]   = useState('all');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedNgo, setSelectedNgo] = useState('');
  const [caseBusy, setCaseBusy]       = useState(false);
  const [viewingCase, setViewingCase] = useState(null);
  const [drawerUpdates, setDrawerUpdates]           = useState([]);
  const [drawerUpdatesLoading, setDrawerUpdatesLoading] = useState(false);
  const [drawerDocuments, setDrawerDocuments]       = useState([]);
  const [drawerDocsLoading, setDrawerDocsLoading]   = useState(false);

  const [users, setUsers]           = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'social_worker', organization_name: '' });
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');

  const [reports, setReports]         = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [mapReady, setMapReady]       = useState(false);

  // ── Theme ─────────────────────────────────────────────────────
  const T = {
    bg:        darkMode ? '#0D1117' : '#F1F5F9',
    card:      darkMode ? '#161B22' : '#fff',
    cardAlt:   darkMode ? '#1C2333' : '#F9FAFB',
    border:    darkMode ? '#30363D' : '#E5E7EB',
    borderSub: darkMode ? '#21262D' : '#F3F4F6',
    thead:     darkMode ? '#1C2333' : '#F8FAFF',
    t1:        darkMode ? '#E6EDF3' : '#0F172A',
    t2:        darkMode ? '#C9D1D9' : '#374151',
    t3:        darkMode ? '#8B949E' : '#6B7280',
    t4:        darkMode ? '#6E7681' : '#9CA3AF',
    ts:        darkMode ? '#F0F6FC' : '#111827',
    inputBg:   darkMode ? '#0D1117' : '#fff',
    descBg:    darkMode ? '#1C2333' : '#F9FAFB',
    drawerBg:  darkMode ? '#161B22' : '#fff',
  };

  const INPUT = {
    width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`,
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    background: T.inputBg, color: T.t1, fontFamily: 'inherit', transition: 'border-color 0.15s',
  };

  useEffect(() => {
    api.getCases().then(setCases).catch(() => {});
    api.getProfiles('ngo').then(setNgos).catch(() => {});
    api.getPublicReports().then(r => { setReports(r); setReportsLoaded(true); }).catch(() => {});
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && !usersLoaded)
      api.getUsers().then(u => { setUsers(u); setUsersLoaded(true); }).catch(() => {});
  }, [activeTab]);

  // ── Derived data ──────────────────────────────────────────────
  const stats = {
    total:       cases.length,
    pending:     cases.filter(c => c.status === 'pending').length,
    assigned:    cases.filter(c => c.status === 'assigned').length,
    in_progress: cases.filter(c => c.status === 'in_progress').length,
    resolved:    cases.filter(c => c.status === 'resolved').length,
  };
  const visible    = filter === 'all' ? cases : cases.filter(c => c.status === filter);
  const newReports = reportsLoaded ? reports.filter(r => r.status === 'new').length : 0;

  const statusChartData = [
    { name: 'Pending',     value: stats.pending,     color: '#94A3B8' },
    { name: 'Assigned',    value: stats.assigned,    color: '#3B82F6' },
    { name: 'In Progress', value: stats.in_progress, color: '#F59E0B' },
    { name: 'Resolved',    value: stats.resolved,    color: '#22C55E' },
  ].filter(d => d.value > 0);

  const concernChartData = useMemo(() => {
    const counts = {};
    cases.forEach(c => { if (c.concern_type) counts[c.concern_type] = (counts[c.concern_type] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + '…' : name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [cases]);

  const districtChartData = useMemo(() => {
    const counts = {};
    cases.forEach(c => { if (c.district) counts[c.district] = (counts[c.district] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [cases]);

  const mapData = useMemo(() => {
    const counts = {};
    cases.forEach(c => {
      if (c.district && DISTRICT_COORDS[c.district]) {
        if (!counts[c.district]) counts[c.district] = { cases: 0, reports: 0 };
        counts[c.district].cases++;
      }
    });
    reports.forEach(r => {
      if (r.district && DISTRICT_COORDS[r.district]) {
        if (!counts[r.district]) counts[r.district] = { cases: 0, reports: 0 };
        counts[r.district].reports++;
      }
    });
    return counts;
  }, [cases, reports]);

  const maxMapCount = useMemo(() =>
    Math.max(1, ...Object.values(mapData).map(d => d.cases + d.reports)), [mapData]);

  // ── Handlers ──────────────────────────────────────────────────
  async function handleAssign(caseId) {
    if (!selectedNgo) return;
    setCaseBusy(true);
    try {
      const updated = await api.assignCase(caseId, selectedNgo);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updated } : c));
      setAssigningId(null); setSelectedNgo('');
    } catch (err) { alert(err.response?.data?.error || 'Assignment failed.'); }
    setCaseBusy(false);
  }

  async function handleStatus(caseId, status) {
    try {
      const updated = await api.updateCaseStatus(caseId, status);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updated } : c));
    } catch (err) { alert(err.response?.data?.error || 'Status update failed.'); }
  }

  function ngoName(id) { return ngos.find(n => n.id === id)?.full_name ?? '—'; }

  async function openCaseDrawer(c) {
    setViewingCase(c);
    setDrawerUpdates([]); setDrawerDocuments([]);
    setDrawerUpdatesLoading(true); setDrawerDocsLoading(true);
    const [u, d] = await Promise.all([
      api.getCaseUpdates(c.id).catch(() => []),
      api.getDocuments(c.id).catch(() => []),
    ]);
    setDrawerUpdates(u); setDrawerDocuments(d);
    setDrawerUpdatesLoading(false); setDrawerDocsLoading(false);
  }

  function setField(f, v) { setNewUser(prev => ({ ...prev, [f]: v })); }

  async function handleCreateUser(e) {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try {
      await api.createUser(newUser);
      setShowCreateForm(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'social_worker', organization_name: '' });
      setUsers(await api.getUsers());
    } catch (err) { setCreateError(err.response?.data?.error || 'Failed to create user.'); }
    setCreating(false);
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Remove ${userName}? This cannot be undone.`)) return;
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert(err.response?.data?.error || 'Delete failed.'); }
  }

  async function handleReportStatus(id, status) {
    try {
      const updated = await api.updatePublicReportStatus(id, status);
      setReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch (err) { alert(err.response?.data?.error || 'Update failed.'); }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes modalIn { from { transform: translate(-50%, calc(-50% + 16px)) scale(0.98); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        .tr-hover:hover { background: ${T.cardAlt} !important; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,${darkMode ? '0.4' : '0.1'}) !important; }
        .btn-h:hover { filter: brightness(0.9); }
        .nav-item { transition: all 0.15s; border-radius: 10px; cursor: pointer; }
        .nav-item:hover { background: rgba(255,255,255,0.08) !important; }
        .nav-item.active { background: rgba(255,255,255,0.14) !important; }
        .report-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,${darkMode ? '0.4' : '0.08'}); }
        .view-btn:hover { background: #EFF6FF !important; color: #2563EB !important; border-color: #BFDBFE !important; }
        .leaflet-container { border-radius: 10px; }
      `}</style>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside style={{
        width: 240, flexShrink: 0, height: '100vh', overflow: 'hidden',
        background: 'linear-gradient(175deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>HC</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' }}>HopeConnect</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const badge = item.key === 'cases' ? cases.length
              : item.key === 'reports' ? (newReports > 0 ? newReports : null) : null;
            const isActive = activeTab === item.key;
            return (
              <div key={item.key} className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => setActiveTab(item.key)}
                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                {badge != null && (
                  <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: item.key === 'reports' ? '#EF4444' : 'rgba(255,255,255,0.2)', color: '#fff' }}>{badge}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* User block */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(d => !d)} style={{
            width: '100%', marginBottom: 10, padding: '8px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
            background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
            fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500, transition: 'all 0.15s',
          }}>
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            <div style={{
              width: 32, height: 18, borderRadius: 9, background: darkMode ? '#3B82F6' : 'rgba(255,255,255,0.25)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: darkMode ? 17 : 3,
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#60A5FA,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {initials(profile?.full_name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Administrator</div>
            </div>
          </div>
          <button onClick={signOut} className="btn-h" style={{ width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500, transition: 'all 0.15s' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div style={{ flex: 1, overflow: 'auto', background: T.bg, transition: 'background 0.2s' }}>

        {/* ── CASES ── */}
        {activeTab === 'cases' && (
          <div style={{ padding: '28px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.t1, letterSpacing: '-0.5px' }}>Cases</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.t3 }}>All active child protection cases across Sri Lanka</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
              {[
                { label: 'Total',       value: stats.total,       color: '#1E3A8A', accent: '#2563EB' },
                { label: 'Pending',     value: stats.pending,     color: T.t3,      accent: '#9CA3AF' },
                { label: 'Assigned',    value: stats.assigned,    color: '#1D4ED8', accent: '#3B82F6' },
                { label: 'In Progress', value: stats.in_progress, color: '#B45309', accent: '#F59E0B' },
                { label: 'Resolved',    value: stats.resolved,    color: '#15803D', accent: '#22C55E' },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className="stat-card" style={{ background: T.card, borderRadius: 12, padding: '18px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}`, transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s', cursor: 'default' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-1px' }}>{value}</div>
                  <div style={{ fontSize: 12, color: T.t4, marginTop: 4, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            {cases.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div style={{ background: T.card, borderRadius: 12, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>Status Overview</div>
                  <div style={{ fontSize: 11, color: T.t4, marginBottom: 10 }}>Distribution by status</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
                        {statusChartData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={v => [v + ' cases']} contentStyle={{ borderRadius: 8, border: 'none', background: T.card, color: T.t1, boxShadow: '0 4px 12px rgba(0,0,0,0.18)', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {statusChartData.map(d => (
                      <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                          <span style={{ color: T.t3 }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: T.ts }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: T.card, borderRadius: 12, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>By Concern Type</div>
                  <div style={{ fontSize: 11, color: T.t4, marginBottom: 10 }}>Cases per concern category</div>
                  {concernChartData.length === 0
                    ? <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t4, fontSize: 13 }}>No data yet</div>
                    : <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={concernChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderSub} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: T.t4 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: T.t3 }} axisLine={false} tickLine={false} width={96} />
                          <Tooltip formatter={v => [v + ' cases']} contentStyle={{ borderRadius: 8, border: 'none', background: T.card, color: T.t1, boxShadow: '0 4px 12px rgba(0,0,0,0.18)', fontSize: 12 }} />
                          <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>

                <div style={{ background: T.card, borderRadius: 12, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>By District</div>
                  <div style={{ fontSize: 11, color: T.t4, marginBottom: 10 }}>Geographic distribution</div>
                  {districtChartData.length === 0
                    ? <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t4, fontSize: 13 }}>No district data yet</div>
                    : <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={districtChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderSub} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: T.t4 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: T.t3 }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip formatter={v => [v + ' cases']} contentStyle={{ borderRadius: 8, border: 'none', background: T.card, color: T.t1, boxShadow: '0 4px 12px rgba(0,0,0,0.18)', fontSize: 12 }} />
                          <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>
            )}

            {/* Incident Heatmap */}
            <div style={{ background: T.card, borderRadius: 12, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}`, marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Incident Heatmap</div>
                  <div style={{ fontSize: 11, color: T.t4 }}>Cases and public reports by district</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {[['#60A5FA', 'Low'], ['#F59E0B', 'Medium'], ['#F97316', 'High'], ['#EF4444', 'Critical']].map(([color, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 11, color: T.t3 }}>{label}</span>
                    </div>
                  ))}
                  <div style={{ width: 1, height: 14, background: T.border }} />
                  <span style={{ fontSize: 11, color: T.t4 }}>
                    {Object.keys(mapData).length} districts · {cases.length + reports.length} incidents
                  </span>
                </div>
              </div>
              {/* isolation: isolate prevents Leaflet z-index from bleeding over the drawer */}
              <div style={{ height: 380, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.borderSub}`, isolation: 'isolate' }}>
                {mapReady && (
                  <MapContainer center={SL_CENTER} zoom={7} style={{ width: '100%', height: '100%' }} scrollWheelZoom={true}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    />
                    {Object.entries(mapData).map(([district, counts]) => {
                      const coords = DISTRICT_COORDS[district];
                      if (!coords) return null;
                      const total  = counts.cases + counts.reports;
                      const radius = Math.max(12, Math.min(40, 12 + total * 6));
                      const color  = heatColor(total, maxMapCount);
                      return (
                        <CircleMarker key={district} center={coords} radius={radius}
                          pathOptions={{ fillColor: color, fillOpacity: 0.55, color, weight: 2, opacity: 0.9 }}>
                          <Popup>
                            <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 150 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>{district}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: '#6B7280' }}>Cases</span>
                                  <span style={{ fontWeight: 700, color: '#2563EB' }}>{counts.cases}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: '#6B7280' }}>Public Reports</span>
                                  <span style={{ fontWeight: 700, color: '#DC2626' }}>{counts.reports}</span>
                                </div>
                                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 4, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: '#374151', fontWeight: 600 }}>Total</span>
                                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{total}</span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                )}
              </div>
              {Object.keys(mapData).length === 0 && (
                <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: T.t4 }}>
                  No district data yet — add cases or reports with a district to see them on the map
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {['all', ...STATUSES].map(s => (
                <button key={s} onClick={() => setFilter(s)} className="btn-h" style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500, border: filter === s ? 'none' : `1px solid ${T.border}`, background: filter === s ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : T.card, color: filter === s ? '#fff' : T.t2, boxShadow: filter === s ? '0 2px 8px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.15s' }}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Cases Table */}
            <div style={{ background: T.card, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.thead, borderBottom: `1px solid ${T.border}` }}>
                    {['Child', 'Reported By', 'Needs', 'Status', 'Assigned NGO', '', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0
                    ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: T.t4, fontSize: 14 }}>No cases match this filter.</td></tr>
                    : visible.map(c => (
                        <tr key={c.id} className="tr-hover" style={{ borderBottom: `1px solid ${T.borderSub}`, transition: 'background 0.15s' }}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontWeight: 700, color: T.ts, fontSize: 14 }}>{c.children?.first_name} {c.children?.last_name}</div>
                            <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }}>{c.children?.date_of_birth}</div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: T.t2 }}>{c.profiles?.full_name ?? '—'}</td>
                          <td style={{ padding: '13px 16px', fontSize: 13, maxWidth: 160 }}>
                            {c.needs?.length > 0 ? <span style={{ color: '#2563EB', fontWeight: 500 }}>{c.needs.join(', ')}</span> : <span style={{ color: T.border }}>—</span>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <select value={c.status} onChange={e => handleStatus(c.id, e.target.value)} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 700, border: `1px solid ${STATUS_STYLE[c.status].border}`, background: STATUS_STYLE[c.status].bg, color: STATUS_STYLE[c.status].text }}>
                              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: T.t2 }}>
                            {c.assigned_ngo_id ? <span style={{ fontWeight: 500 }}>{ngoName(c.assigned_ngo_id)}</span> : <span style={{ color: T.border }}>Unassigned</span>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <button onClick={() => openCaseDrawer(c)} className="view-btn" style={{ padding: '5px 14px', background: T.cardAlt, color: T.t2, border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>View</button>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {assigningId === c.id ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <select value={selectedNgo} onChange={e => setSelectedNgo(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.inputBg, color: T.t1, fontSize: 12, minWidth: 130 }}>
                                  <option value="">Select NGO…</option>
                                  {ngos.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
                                </select>
                                <button onClick={() => handleAssign(c.id)} disabled={caseBusy || !selectedNgo} style={{ padding: '5px 12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, opacity: caseBusy ? 0.7 : 1 }}>{caseBusy ? '…' : 'Assign'}</button>
                                <button onClick={() => setAssigningId(null)} style={{ padding: '5px 8px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: 'pointer', fontSize: 12, color: T.t3 }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => { setAssigningId(c.id); setSelectedNgo(''); }} className="btn-h" style={{ padding: '5px 14px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                                {c.assigned_ngo_id ? 'Reassign' : 'Assign NGO'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PUBLIC REPORTS ── */}
        {activeTab === 'reports' && (
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.t1, letterSpacing: '-0.5px' }}>Public Reports</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.t3 }}>Submitted anonymously via the public report form.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['new', 'reviewed', 'converted'].map(s => (
                  <span key={s} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: REPORT_STATUS_STYLE[s].bg, color: REPORT_STATUS_STYLE[s].text, border: `1px solid ${REPORT_STATUS_STYLE[s].border}` }}>
                    {reportsLoaded ? reports.filter(r => r.status === s).length : '—'} {s}
                  </span>
                ))}
              </div>
            </div>

            {!reportsLoaded ? (
              <div style={{ textAlign: 'center', padding: 64, color: T.t4 }}>Loading…</div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: T.t4 }}>No public reports yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map(r => (
                  <div key={r.id} className="report-card" style={{ background: T.card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, borderLeft: `4px solid ${r.status === 'new' ? '#EF4444' : r.status === 'reviewed' ? '#F59E0B' : '#22C55E'}`, transition: 'box-shadow 0.2s' }}>
                    <div onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: T.ts, fontSize: 14 }}>{r.child_name || <span style={{ color: T.t4, fontStyle: 'italic' }}>Unknown child</span>}</span>
                        {r.child_age && <span style={{ marginLeft: 8, fontSize: 12, color: T.t4 }}>· Age {r.child_age}</span>}
                        {r.district && <span style={{ marginLeft: 8, fontSize: 12, color: T.t3 }}>· {r.district}</span>}
                        <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: 10 }}>{r.concern_type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: T.t4 }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: REPORT_STATUS_STYLE[r.status].bg, color: REPORT_STATUS_STYLE[r.status].text }}>{r.status}</span>
                        <span style={{ fontSize: 10, color: T.t4 }}>{expandedReport === r.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expandedReport === r.id && (
                      <div style={{ padding: '4px 18px 18px', borderTop: `1px solid ${T.borderSub}`, animation: 'fadeIn 0.2s ease' }}>
                        <div style={{ background: T.descBg, borderRadius: 8, padding: '12px 14px', margin: '12px 0', fontSize: 14, color: T.t2, lineHeight: 1.7 }}>{r.description}</div>
                        {r.evidence_urls?.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            {r.evidence_urls.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} /></a>)}
                          </div>
                        )}
                        {(r.reporter_name || r.reporter_contact) && (
                          <div style={{ fontSize: 13, color: T.t3, marginBottom: 14, padding: '8px 12px', background: T.descBg, borderRadius: 6 }}>
                            Reporter: <strong style={{ color: T.t2 }}>{r.reporter_name || 'Anonymous'}</strong>
                            {r.reporter_contact && <> · {r.reporter_contact}</>}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['new', 'reviewed', 'converted'].map(s => (
                            <button key={s} onClick={() => handleReportStatus(r.id, s)} className="btn-h" style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${r.status === s ? 'transparent' : T.border}`, background: r.status === s ? REPORT_STATUS_STYLE[s].bg : T.card, color: r.status === s ? REPORT_STATUS_STYLE[s].text : T.t3, transition: 'all 0.15s' }}>
                              Mark {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USER MANAGEMENT ── */}
        {activeTab === 'users' && (
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.t1, letterSpacing: '-0.5px' }}>User Management</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.t3 }}>Create and manage admin, NGO, and social worker accounts.</p>
              </div>
              <button onClick={() => { setShowCreateForm(v => !v); setCreateError(''); }} className="btn-h" style={{ padding: '10px 22px', background: showCreateForm ? T.cardAlt : 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: showCreateForm ? T.t2 : '#fff', border: showCreateForm ? `1px solid ${T.border}` : 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: showCreateForm ? 'none' : '0 2px 8px rgba(37,99,235,0.35)', transition: 'all 0.15s' }}>
                {showCreateForm ? '✕ Cancel' : '+ Add User'}
              </button>
            </div>

            {showCreateForm && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '28px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', animation: 'fadeIn 0.2s ease' }}>
                <h3 style={{ margin: '0 0 22px', fontSize: 16, fontWeight: 700, color: T.ts }}>Create New User</h3>
                <form onSubmit={handleCreateUser}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[
                      { label: 'Full Name',     field: 'full_name', placeholder: 'e.g. Nimal Perera',     type: 'text' },
                      { label: 'Email Address', field: 'email',     placeholder: 'user@hopeconnect.lk',   type: 'email' },
                      { label: 'Password',      field: 'password',  placeholder: 'Min. 6 characters',     type: 'password' },
                    ].map(({ label, field, placeholder, type }) => (
                      <div key={field}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} *</label>
                        <input required type={type} style={INPUT} value={newUser[field]} onChange={e => setField(field, e.target.value)} placeholder={placeholder}
                          onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = T.border} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role *</label>
                      <select required style={{ ...INPUT, cursor: 'pointer' }} value={newUser.role} onChange={e => setField('role', e.target.value)} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = T.border}>
                        <option value="social_worker">Social Worker</option>
                        <option value="ngo">NGO Organisation</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {newUser.role === 'ngo' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organisation Name *</label>
                        <input required style={INPUT} value={newUser.organization_name} onChange={e => setField('organization_name', e.target.value)} placeholder="e.g. Hope Foundation Colombo" onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = T.border} />
                      </div>
                    )}
                  </div>
                  {createError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{createError}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={creating} className="btn-h" style={{ padding: '10px 26px', background: creating ? '#93C5FD' : 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                      {creating ? 'Creating…' : 'Create User'}
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)} style={{ padding: '10px 22px', background: T.cardAlt, color: T.t2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {!usersLoaded ? (
              <div style={{ textAlign: 'center', padding: 64, color: T.t4 }}>Loading…</div>
            ) : (
              <div style={{ background: T.card, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.thead, borderBottom: `1px solid ${T.border}` }}>
                      {['Name', 'Role', 'Organisation', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0
                      ? <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: T.t4, fontSize: 14 }}>No users found.</td></tr>
                      : users.map(u => (
                          <tr key={u.id} className="tr-hover" style={{ borderBottom: `1px solid ${T.borderSub}`, transition: 'background 0.15s' }}>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_STYLE[u.role]?.bg ?? T.cardAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: ROLE_STYLE[u.role]?.text ?? T.t3, flexShrink: 0 }}>
                                  {initials(u.full_name)}
                                </div>
                                <span style={{ fontWeight: 600, color: T.ts, fontSize: 14 }}>{u.full_name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: ROLE_STYLE[u.role]?.bg ?? T.cardAlt, color: ROLE_STYLE[u.role]?.text ?? T.t3 }}>{u.role.replace('_', ' ')}</span>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: T.t3 }}>{u.organization_name || <span style={{ color: T.border }}>—</span>}</td>
                            <td style={{ padding: '13px 16px', fontSize: 12, color: T.t4 }}>{new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '13px 16px' }}>
                              {u.id !== profile?.id
                                ? <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="btn-h" style={{ padding: '5px 14px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>Remove</button>
                                : <span style={{ fontSize: 12, color: T.t4, fontStyle: 'italic' }}>You</span>
                              }
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Case Detail Modal ── */}
      {viewingCase && (
        <>
          <div onClick={() => setViewingCase(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.68)', zIndex: 100, animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', width: 'min(920px, calc(100vw - 48px))', maxHeight: 'min(860px, calc(100vh - 48px))', transform: 'translate(-50%, -50%)', background: T.drawerBg, zIndex: 101, overflowY: 'auto', boxShadow: '0 28px 90px rgba(0,0,0,0.35)', animation: 'modalIn 0.22s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', borderRadius: 18 }}>
            <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A8A)', padding: '24px', position: 'relative' }}>
              <button onClick={() => setViewingCase(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 14 }}>
                {initials((viewingCase.children?.first_name ?? '') + ' ' + (viewingCase.children?.last_name ?? ''))}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{viewingCase.children?.first_name} {viewingCase.children?.last_name}</h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>DOB: {viewingCase.children?.date_of_birth} · Case #{viewingCase.id.slice(0, 8).toUpperCase()}</div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Status', content: <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: STATUS_STYLE[viewingCase.status].bg, color: STATUS_STYLE[viewingCase.status].text, border: `1px solid ${STATUS_STYLE[viewingCase.status].border}` }}>{viewingCase.status.replace('_', ' ')}</span> },
                  { label: 'Assigned NGO', content: <span style={{ fontSize: 13, color: T.t2, fontWeight: 600 }}>{viewingCase.assigned_ngo_id ? ngoName(viewingCase.assigned_ngo_id) : <span style={{ color: T.border }}>Unassigned</span>}</span> },
                ].map(({ label, content }) => (
                  <div key={label} style={{ background: T.cardAlt, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                    {content}
                  </div>
                ))}
              </div>

              {(viewingCase.district || viewingCase.location) && (
                <div style={{ background: T.cardAlt, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Location</div>
                  <div style={{ fontSize: 13, color: T.t2, fontWeight: 500 }}>{[viewingCase.district, viewingCase.location].filter(Boolean).join(' · ')}</div>
                </div>
              )}
              {viewingCase.concern_type && (
                <div style={{ background: darkMode ? '#2A1215' : '#FFF1F1', borderRadius: 10, padding: '12px 14px', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Type of Concern</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>{viewingCase.concern_type}</div>
                </div>
              )}
              {viewingCase.description && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Description</div>
                  <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.75, background: T.descBg, borderRadius: 10, padding: '14px', border: `1px solid ${T.border}` }}>{viewingCase.description}</div>
                </div>
              )}
              {viewingCase.needs?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Needs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {viewingCase.needs.map(n => <span key={n} style={{ padding: '4px 12px', background: '#EFF6FF', color: '#2563EB', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid #BFDBFE' }}>{n}</span>)}
                  </div>
                </div>
              )}
              {viewingCase.image_urls?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Scene Photos ({viewingCase.image_urls.length})</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {viewingCase.image_urls.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: `2px solid ${T.border}`, cursor: 'pointer' }} /></a>)}
                  </div>
                </div>
              )}

              <div style={{ borderTop: `2px dashed ${T.border}` }} />

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Documents <span style={{ background: T.cardAlt, color: T.t3, padding: '1px 7px', borderRadius: 10, fontSize: 10 }}>{drawerDocsLoading ? '…' : drawerDocuments.length}</span>
                </div>
                {drawerDocsLoading
                  ? <p style={{ fontSize: 13, color: T.t4 }}>Loading…</p>
                  : drawerDocuments.length === 0
                    ? <p style={{ fontSize: 13, color: T.t4, margin: 0 }}>No documents uploaded.</p>
                    : drawerDocuments.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.borderSub}` }}>
                          <span style={{ color: T.t2, textTransform: 'capitalize', fontWeight: 600, fontSize: 13 }}>{doc.document_type.replace(/_/g, ' ')}</span>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: doc.verification_status === 'verified' ? '#16A34A' : T.t4 }}>{doc.verification_status}</span>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontSize: 12, fontWeight: 700, padding: '3px 10px', background: '#EFF6FF', borderRadius: 6 }}>View</a>
                          </div>
                        </div>
                      ))
                }
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Progress Updates <span style={{ background: T.cardAlt, color: T.t3, padding: '1px 7px', borderRadius: 10, fontSize: 10 }}>{drawerUpdatesLoading ? '…' : drawerUpdates.length}</span>
                </div>
                {drawerUpdatesLoading
                  ? <p style={{ fontSize: 13, color: T.t4 }}>Loading…</p>
                  : drawerUpdates.length === 0
                    ? <p style={{ fontSize: 13, color: T.t4, margin: 0 }}>No updates posted yet.</p>
                    : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {drawerUpdates.map(u => (
                            <div key={u.id} style={{ background: darkMode ? '#0D2137' : '#F0F9FF', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #2563EB' }}>
                              {u.update_date && <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 5 }}>{new Date(u.update_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                              <p style={{ margin: 0, fontSize: 13, color: T.t2, lineHeight: 1.65 }}>{u.update_text}</p>
                              {u.photo_urls?.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                                  {u.photo_urls.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}`, cursor: 'pointer' }} /></a>)}
                                </div>
                              )}
                              <p style={{ margin: '8px 0 0', fontSize: 11, color: T.t4 }}>{u.profiles?.full_name ?? 'NGO'} · {new Date(u.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )
                }
              </div>

              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, fontSize: 12, color: T.t4, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div>Reported by: <span style={{ color: T.t3, fontWeight: 600 }}>{viewingCase.profiles?.full_name ?? '—'}</span></div>
                <div>Opened: <span style={{ color: T.t3 }}>{new Date(viewingCase.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

