import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_COLOR = {
  pending:     { bg: '#F3F4F6', text: '#6B7280' },
  assigned:    { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved:    { bg: '#F0FDF4', text: '#16A34A' },
};

export default function NgoDashboard() {
  const { profile, signOut } = useAuth();
  const [cases, setCases] = useState([]);
  const [expandedCase, setExpandedCase] = useState(null);
  const [updates, setUpdates] = useState({});
  const [documents, setDocuments] = useState({});
  const [newUpdate, setNewUpdate] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => { api.getCases().then(setCases).catch(() => {}); }, []);

  async function toggleCase(caseId) {
    if (expandedCase === caseId) { setExpandedCase(null); return; }
    setExpandedCase(caseId);
    setNewUpdate('');
    if (!updates[caseId]) {
      const [u, d] = await Promise.all([
        api.getCaseUpdates(caseId).catch(() => []),
        api.getDocuments(caseId).catch(() => []),
      ]);
      setUpdates(prev => ({ ...prev, [caseId]: u }));
      setDocuments(prev => ({ ...prev, [caseId]: d }));
    }
  }

  async function handlePostUpdate(e, caseId) {
    e.preventDefault();
    if (!newUpdate.trim()) return;
    setPosting(true);
    try {
      await api.addCaseUpdate(caseId, newUpdate.trim());
      const u = await api.getCaseUpdates(caseId);
      setUpdates(prev => ({ ...prev, [caseId]: u }));
      setNewUpdate('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post update.');
    }
    setPosting(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>HopeConnect</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            NGO Dashboard · {profile?.full_name}
            {profile?.organization_name && <span style={{ color: '#9CA3AF' }}> · {profile.organization_name}</span>}
          </div>
        </div>
        <button onClick={signOut} style={{ padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Sign Out</button>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 17, color: '#111827' }}>
          Assigned Cases <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({cases.length})</span>
        </h2>

        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>No cases assigned to your organization yet.</div>
        ) : (
          cases.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 10 }}>
              {/* Case row */}
              <div
                onClick={() => toggleCase(c.id)}
                style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>
                    {c.children?.first_name} {c.children?.last_name}
                  </span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#9CA3AF' }}>DOB: {c.children?.date_of_birth}</span>
                  {c.needs?.length > 0 && (
                    <span style={{ marginLeft: 12, fontSize: 12, color: '#2563EB' }}>· {c.needs.join(', ')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS_COLOR[c.status].bg, color: STATUS_COLOR[c.status].text }}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 11, color: '#C4C4C4' }}>{expandedCase === c.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded panel */}
              {expandedCase === c.id && (
                <div style={{ padding: '4px 18px 18px', borderTop: '1px solid #F3F4F6' }}>
                  {/* Meta */}
                  <div style={{ background: '#F9FAFB', borderRadius: 6, padding: '8px 12px', margin: '10px 0 16px', fontSize: 13, color: '#6B7280' }}>
                    Reported by <strong style={{ color: '#374151' }}>{c.profiles?.full_name ?? 'Unknown'}</strong>
                    {' · '}
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>

                  {/* Documents */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Documents</div>
                    {!documents[c.id] ? (
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
                    ) : documents[c.id].length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>No documents uploaded.</p>
                    ) : (
                      documents[c.id].map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB', fontSize: 13 }}>
                          <span style={{ color: '#374151', textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <span style={{
                              fontSize: 12,
                              color: doc.verification_status === 'verified' ? '#16A34A' : doc.verification_status === 'rejected' ? '#DC2626' : '#9CA3AF'
                            }}>
                              {doc.verification_status}
                            </span>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none' }}>View ↗</a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Progress Updates */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Progress Updates</div>
                  {!updates[c.id] ? (
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
                  ) : updates[c.id].length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>No updates posted yet.</p>
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      {updates[c.id].map(u => (
                        <div key={u.id} style={{ padding: '10px 14px', background: '#F0F9FF', borderRadius: 6, marginBottom: 8, borderLeft: '3px solid #2563EB' }}>
                          <p style={{ margin: 0, fontSize: 14, color: '#111827', lineHeight: 1.5 }}>{u.update_text}</p>
                          <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                            {u.profiles?.full_name ?? 'NGO'} · {new Date(u.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add update */}
                  <form onSubmit={e => handlePostUpdate(e, c.id)} style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, outline: 'none' }}
                      value={newUpdate}
                      onChange={e => setNewUpdate(e.target.value)}
                      placeholder="Write a progress update…"
                    />
                    <button
                      type="submit"
                      disabled={posting || !newUpdate.trim()}
                      style={{ padding: '8px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: posting ? 0.7 : 1 }}
                    >
                      {posting ? '…' : 'Post'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
