import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_STYLE = {
  pending:     { bg: '#F3F4F6', text: '#6B7280' },
  assigned:    { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved:    { bg: '#F0FDF4', text: '#16A34A' },
};

const REPORT_STATUS_STYLE = {
  new:       { bg: '#FEF2F2', text: '#DC2626' },
  reviewed:  { bg: '#FFFBEB', text: '#D97706' },
  converted: { bg: '#F0FDF4', text: '#16A34A' },
};

const ROLE_STYLE = {
  admin:         { bg: '#EFF6FF', text: '#2563EB' },
  ngo:           { bg: '#F0FDF4', text: '#16A34A' },
  social_worker: { bg: '#FFF7ED', text: '#EA580C' },
};

const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved'];

const INPUT = {
  width: '100%', padding: '9px 13px', border: '1.5px solid #D1D5DB',
  borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#FAFAFA', fontFamily: 'inherit',
};

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('cases');

  // ── Cases state ──────────────────────────────────────────────
  const [cases, setCases]         = useState([]);
  const [ngos, setNgos]           = useState([]);
  const [filter, setFilter]       = useState('all');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedNgo, setSelectedNgo] = useState('');
  const [caseBusy, setCaseBusy]   = useState(false);
  const [viewingCase, setViewingCase] = useState(null);

  // ── Users state ──────────────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'social_worker', organization_name: '' });
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Public reports state ─────────────────────────────────────
  const [reports, setReports]         = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);

  // Load cases + NGO list on mount
  useEffect(() => {
    api.getCases().then(setCases).catch(() => {});
    api.getProfiles('ngo').then(setNgos).catch(() => {});
  }, []);

  // Lazy-load users / reports when tab first opens
  useEffect(() => {
    if (activeTab === 'users' && !usersLoaded) {
      api.getUsers().then(u => { setUsers(u); setUsersLoaded(true); }).catch(() => {});
    }
    if (activeTab === 'reports' && !reportsLoaded) {
      api.getPublicReports().then(r => { setReports(r); setReportsLoaded(true); }).catch(() => {});
    }
  }, [activeTab]);

  // ── Case helpers ─────────────────────────────────────────────
  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending').length,
    assigned: cases.filter(c => c.status === 'assigned').length,
    in_progress: cases.filter(c => c.status === 'in_progress').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
  };
  const visible = filter === 'all' ? cases : cases.filter(c => c.status === filter);

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

  // ── User helpers ─────────────────────────────────────────────
  function setField(f, v) { setNewUser(prev => ({ ...prev, [f]: v })); }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.createUser(newUser);
      setShowCreateForm(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'social_worker', organization_name: '' });
      const fresh = await api.getUsers();
      setUsers(fresh);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user.');
    }
    setCreating(false);
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Remove ${userName} from the platform? This cannot be undone.`)) return;
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert(err.response?.data?.error || 'Delete failed.'); }
  }

  // ── Report helpers ────────────────────────────────────────────
  async function handleReportStatus(id, status) {
    try {
      const updated = await api.updatePublicReportStatus(id, status);
      setReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch (err) { alert(err.response?.data?.error || 'Update failed.'); }
  }

  // ── Tab bar ──────────────────────────────────────────────────
  const tabs = [
    { key: 'cases',   label: `Cases (${cases.length})` },
    { key: 'reports', label: `Public Reports${reportsLoaded ? ` (${reports.filter(r => r.status === 'new').length} new)` : ''}` },
    { key: 'users',   label: 'User Management' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>HopeConnect</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Admin Dashboard · {profile?.full_name}</div>
        </div>
        <button onClick={signOut} style={{ padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Sign Out</button>
      </header>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', gap: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '14px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none',
              color: activeTab === t.key ? '#2563EB' : '#6B7280',
              borderBottom: activeTab === t.key ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px' }}>

        {/* ══════════════════════════════════ CASES TAB */}
        {activeTab === 'cases' && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Total',       value: stats.total,       color: '#111827' },
                { label: 'Pending',     value: stats.pending,     color: STATUS_STYLE.pending.text },
                { label: 'Assigned',    value: stats.assigned,    color: STATUS_STYLE.assigned.text },
                { label: 'In Progress', value: stats.in_progress, color: STATUS_STYLE.in_progress.text },
                { label: 'Resolved',    value: stats.resolved,    color: STATUS_STYLE.resolved.text },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', ...STATUSES].map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: filter === s ? 'none' : '1px solid #E5E7EB',
                  background: filter === s ? '#2563EB' : '#fff',
                  color: filter === s ? '#fff' : '#374151',
                }}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Cases table */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['Child', 'Reported By', 'Needs', 'Status', 'Assigned NGO', '', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No cases match this filter.</td></tr>
                  ) : (
                    visible.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{c.children?.first_name} {c.children?.last_name}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{c.children?.date_of_birth}</div>
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 13, color: '#374151' }}>{c.profiles?.full_name ?? '—'}</td>
                        <td style={{ padding: '13px 16px', fontSize: 13, color: '#2563EB', maxWidth: 160 }}>
                          {c.needs?.length > 0 ? c.needs.join(', ') : <span style={{ color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <select
                            value={c.status}
                            onChange={e => handleStatus(c.id, e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, cursor: 'pointer', background: STATUS_STYLE[c.status].bg, color: STATUS_STYLE[c.status].text, fontWeight: 600 }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: 13, color: '#374151' }}>
                          {c.assigned_ngo_id ? ngoName(c.assigned_ngo_id) : <span style={{ color: '#D1D5DB' }}>Unassigned</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <button
                            onClick={() => setViewingCase(c)}
                            style={{ padding: '5px 12px', background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                          >
                            View
                          </button>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {assigningId === c.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={selectedNgo} onChange={e => setSelectedNgo(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, minWidth: 120 }}>
                                <option value="">Select NGO</option>
                                {ngos.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
                              </select>
                              <button onClick={() => handleAssign(c.id)} disabled={caseBusy || !selectedNgo}
                                style={{ padding: '5px 12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, opacity: caseBusy ? 0.7 : 1 }}>
                                {caseBusy ? '…' : 'Assign'}
                              </button>
                              <button onClick={() => setAssigningId(null)} style={{ padding: '5px 8px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAssigningId(c.id); setSelectedNgo(''); }}
                              style={{ padding: '5px 12px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                              {c.assigned_ngo_id ? 'Reassign' : 'Assign NGO'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════════════════════════════ PUBLIC REPORTS TAB */}
        {activeTab === 'reports' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: '#111827' }}>Public Reports</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Submitted by members of the public via the report form.</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['new', 'reviewed', 'converted'].map(s => (
                  <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: REPORT_STATUS_STYLE[s].bg, color: REPORT_STATUS_STYLE[s].text }}>
                    {reportsLoaded ? reports.filter(r => r.status === s).length : '—'} {s}
                  </span>
                ))}
              </div>
            </div>

            {!reportsLoaded ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>Loading…</div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>No public reports yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map(r => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 8, border: `1px solid ${r.status === 'new' ? '#FECACA' : '#E5E7EB'}` }}>
                    {/* Row */}
                    <div
                      onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                      style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{r.child_name}</span>
                        {r.child_age && <span style={{ marginLeft: 8, fontSize: 12, color: '#9CA3AF' }}>· Age: {r.child_age}</span>}
                        {r.location && <span style={{ marginLeft: 8, fontSize: 12, color: '#9CA3AF' }}>· {r.location}</span>}
                        <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: '#DC2626' }}>{r.concern_type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: REPORT_STATUS_STYLE[r.status].bg, color: REPORT_STATUS_STYLE[r.status].text }}>
                          {r.status}
                        </span>
                        <span style={{ fontSize: 11, color: '#C4C4C4' }}>{expandedReport === r.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded */}
                    {expandedReport === r.id && (
                      <div style={{ padding: '4px 18px 18px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ background: '#F9FAFB', borderRadius: 6, padding: '12px 14px', margin: '10px 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                          {r.description}
                        </div>
                        {(r.reporter_name || r.reporter_contact) && (
                          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
                            Reporter: <strong style={{ color: '#374151' }}>{r.reporter_name || 'Anonymous'}</strong>
                            {r.reporter_contact && <> · {r.reporter_contact}</>}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['new', 'reviewed', 'converted'].map(s => (
                            <button
                              key={s}
                              onClick={() => handleReportStatus(r.id, s)}
                              style={{
                                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                border: r.status === s ? 'none' : '1px solid #E5E7EB',
                                background: r.status === s ? REPORT_STATUS_STYLE[s].bg : '#fff',
                                color: r.status === s ? REPORT_STATUS_STYLE[s].text : '#6B7280',
                              }}
                            >
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
          </>
        )}

        {/* ══════════════════════════════════ USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: '#111827' }}>User Management</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Create and manage admin, NGO, and social worker accounts.</p>
              </div>
              <button
                onClick={() => { setShowCreateForm(v => !v); setCreateError(''); }}
                style={{ padding: '9px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {showCreateForm ? '✕ Cancel' : '+ Add User'}
              </button>
            </div>

            {/* Create user form */}
            {showCreateForm && (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '24px 24px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, color: '#111827' }}>Create New User</h3>
                <form onSubmit={handleCreateUser}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Full Name *</label>
                      <input required style={INPUT} value={newUser.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="e.g. Nimal Perera"
                        onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email Address *</label>
                      <input required type="email" style={INPUT} value={newUser.email} onChange={e => setField('email', e.target.value)} placeholder="user@hopeconnect.lk"
                        onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Password *</label>
                      <input required type="password" style={INPUT} value={newUser.password} onChange={e => setField('password', e.target.value)} placeholder="Min. 6 characters"
                        onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Role *</label>
                      <select required style={{ ...INPUT, cursor: 'pointer' }} value={newUser.role} onChange={e => setField('role', e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#D1D5DB'}>
                        <option value="social_worker">Social Worker</option>
                        <option value="ngo">NGO Organisation</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {newUser.role === 'ngo' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Organisation Name *</label>
                        <input required style={INPUT} value={newUser.organization_name} onChange={e => setField('organization_name', e.target.value)} placeholder="e.g. Hope Foundation Colombo"
                          onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                      </div>
                    )}
                  </div>

                  {createError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '9px 13px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>
                      ⚠️ {createError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={creating}
                      style={{ padding: '9px 24px', background: creating ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}>
                      {creating ? 'Creating…' : 'Create User'}
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)}
                      style={{ padding: '9px 20px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users table */}
            {!usersLoaded ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>Loading…</div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {['Name', 'Role', 'Organisation', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No users found.</td></tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '13px 16px', fontWeight: 600, color: '#111827', fontSize: 14 }}>{u.full_name}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ROLE_STYLE[u.role]?.bg ?? '#F3F4F6', color: ROLE_STYLE[u.role]?.text ?? '#6B7280' }}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: '#6B7280' }}>{u.organization_name || <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: '#9CA3AF' }}>
                            {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {u.id !== profile?.id ? (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.full_name)}
                                style={{ padding: '4px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                Remove
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: '#9CA3AF' }}>You</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Case Detail Drawer ───────────────────────────────────── */}
      {viewingCase && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setViewingCase(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
            background: '#fff', zIndex: 50, overflowY: 'auto',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  {viewingCase.children?.first_name} {viewingCase.children?.last_name}
                </h2>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                  DOB: {viewingCase.children?.date_of_birth} · Case #{viewingCase.id.slice(0, 8)}
                </div>
              </div>
              <button
                onClick={() => setViewingCase(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF', lineHeight: 1, padding: 4 }}
              >✕</button>
            </div>

            {/* Panel body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Status + NGO row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Status</div>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: STATUS_STYLE[viewingCase.status].bg, color: STATUS_STYLE[viewingCase.status].text }}>
                    {viewingCase.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Assigned NGO</div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                    {viewingCase.assigned_ngo_id ? ngoName(viewingCase.assigned_ngo_id) : <span style={{ color: '#D1D5DB' }}>Unassigned</span>}
                  </div>
                </div>
              </div>

              {/* Location */}
              {(viewingCase.district || viewingCase.location) && (
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Location</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    {[viewingCase.district, viewingCase.location].filter(Boolean).join(' · ')}
                  </div>
                </div>
              )}

              {/* Concern type */}
              {viewingCase.concern_type && (
                <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Type of Concern</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>{viewingCase.concern_type}</div>
                </div>
              )}

              {/* Description */}
              {viewingCase.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</div>
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, background: '#F9FAFB', borderRadius: 8, padding: '12px 14px' }}>
                    {viewingCase.description}
                  </div>
                </div>
              )}

              {/* Needs */}
              {viewingCase.needs?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Needs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {viewingCase.needs.map(n => (
                      <span key={n} style={{ padding: '4px 12px', background: '#EFF6FF', color: '#2563EB', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {viewingCase.image_urls?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Scene Photos ({viewingCase.image_urls.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {viewingCase.image_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`scene-${i}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, fontSize: 12, color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Reported by: <span style={{ color: '#6B7280' }}>{viewingCase.profiles?.full_name ?? '—'}</span></div>
                <div>Opened: <span style={{ color: '#6B7280' }}>{new Date(viewingCase.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
