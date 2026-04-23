import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_STYLE = {
  pending:     { bg: '#F3F4F6', text: '#6B7280' },
  assigned:    { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved:    { bg: '#F0FDF4', text: '#16A34A' },
};

const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved'];

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [cases, setCases] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedNgo, setSelectedNgo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCases().then(setCases).catch(() => {});
    api.getProfiles('ngo').then(setNgos).catch(() => {});
  }, []);

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
    setBusy(true);
    try {
      const updated = await api.assignCase(caseId, selectedNgo);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updated } : c));
      setAssigningId(null);
      setSelectedNgo('');
    } catch (err) {
      alert(err.response?.data?.error || 'Assignment failed.');
    }
    setBusy(false);
  }

  async function handleStatus(caseId, status) {
    try {
      const updated = await api.updateCaseStatus(caseId, status);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updated } : c));
    } catch (err) {
      alert(err.response?.data?.error || 'Status update failed.');
    }
  }

  function ngoName(id) {
    return ngos.find(n => n.id === id)?.full_name ?? '—';
  }

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

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats row */}
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
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                border: filter === s ? 'none' : '1px solid #E5E7EB',
                background: filter === s ? '#2563EB' : '#fff',
                color: filter === s ? '#fff' : '#374151',
              }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Child', 'Reported By', 'Needs', 'Status', 'Assigned NGO', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No cases match this filter.</td>
                </tr>
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
                        style={{
                          padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, cursor: 'pointer',
                          background: STATUS_STYLE[c.status].bg,
                          color: STATUS_STYLE[c.status].text,
                          fontWeight: 600,
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#374151' }}>
                      {c.assigned_ngo_id ? ngoName(c.assigned_ngo_id) : <span style={{ color: '#D1D5DB' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {assigningId === c.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={selectedNgo} onChange={e => setSelectedNgo(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, minWidth: 120 }}>
                            <option value="">Select NGO</option>
                            {ngos.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
                          </select>
                          <button
                            onClick={() => handleAssign(c.id)}
                            disabled={busy || !selectedNgo}
                            style={{ padding: '5px 12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.7 : 1 }}
                          >
                            {busy ? '…' : 'Assign'}
                          </button>
                          <button onClick={() => setAssigningId(null)} style={{ padding: '5px 8px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningId(c.id); setSelectedNgo(''); }}
                          style={{ padding: '5px 12px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                        >
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
      </main>
    </div>
  );
}
