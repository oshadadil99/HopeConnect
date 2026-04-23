import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_COLOR = {
  pending: { bg: '#F3F4F6', text: '#6B7280' },
  assigned: { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved: { bg: '#F0FDF4', text: '#16A34A' },
};

const s = {
  label: { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
};

export default function SocialWorkerPortal() {
  const { profile, signOut } = useAuth();
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedCase, setExpandedCase] = useState(null);
  const [documents, setDocuments] = useState({});
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', needs: '' });
  const [uploadForm, setUploadForm] = useState({ document_type: 'birth_certificate', file: null });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    try {
      const data = await api.getCases();
      setCases(data);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load cases.' });
    }
  }

  async function loadDocuments(caseId) {
    try {
      const data = await api.getDocuments(caseId);
      setDocuments(prev => ({ ...prev, [caseId]: data }));
    } catch {
      setDocuments(prev => ({ ...prev, [caseId]: [] }));
    }
  }

  function toggleCase(caseId) {
    if (expandedCase === caseId) { setExpandedCase(null); return; }
    setExpandedCase(caseId);
    if (!documents[caseId]) loadDocuments(caseId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const child = await api.createChild({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
      });
      const needs = form.needs ? form.needs.split(',').map(n => n.trim()).filter(Boolean) : [];
      await api.createCase({ child_id: child.id, needs });
      setMsg({ type: 'success', text: 'Case created successfully!' });
      setForm({ first_name: '', last_name: '', date_of_birth: '', needs: '' });
      setShowForm(false);
      loadCases();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error creating case.' });
    }
    setSubmitting(false);
  }

  async function handleUpload(e, caseId) {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      await api.uploadDocument(caseId, uploadForm.document_type, uploadForm.file);
      setUploadForm(p => ({ ...p, file: null }));
      e.target.reset();
      loadDocuments(caseId);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed.');
    }
    setUploading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>HopeConnect</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Social Worker Portal · {profile?.full_name}</div>
        </div>
        <button onClick={signOut} style={{ padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Sign Out</button>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#111827' }}>My Cases <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({cases.length})</span></h2>
          <button
            onClick={() => { setShowForm(v => !v); setMsg(null); }}
            style={{ padding: '9px 18px', background: showForm ? '#F3F4F6' : '#2563EB', color: showForm ? '#374151' : '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            {showForm ? 'Cancel' : '+ New Case'}
          </button>
        </div>

        {/* Flash message */}
        {msg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4', color: msg.type === 'error' ? '#DC2626' : '#16A34A', fontSize: 14 }}>
            {msg.text}
          </div>
        )}

        {/* New Case Form */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 15, color: '#111827' }}>Register New Case</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>First Name *</label>
                  <input style={s.input} required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Child's first name" />
                </div>
                <div>
                  <label style={s.label}>Last Name *</label>
                  <input style={s.input} required value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Child's last name" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Date of Birth *</label>
                <input style={s.input} type="date" required value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Needs <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(comma-separated)</span></label>
                <input style={s.input} value={form.needs} onChange={e => setForm(p => ({ ...p, needs: e.target.value }))} placeholder="e.g. food, shelter, medical care" />
              </div>
              <button type="submit" disabled={submitting} style={{ padding: '9px 22px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving…' : 'Create Case'}
              </button>
            </form>
          </div>
        )}

        {/* Cases list */}
        {cases.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>No cases yet. Click "+ New Case" to get started.</div>
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
                  <p style={{ margin: '10px 0 14px', fontSize: 12, color: '#9CA3AF' }}>Opened {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                  {/* Documents */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Documents</div>
                    {!documents[c.id] ? (
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
                    ) : documents[c.id].length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>No documents uploaded yet.</p>
                    ) : (
                      documents[c.id].map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F9FAFB', fontSize: 13 }}>
                          <span style={{ color: '#374151', textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ color: doc.verification_status === 'verified' ? '#16A34A' : doc.verification_status === 'rejected' ? '#DC2626' : '#9CA3AF', fontSize: 12 }}>
                              {doc.verification_status}
                            </span>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none' }}>View ↗</a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Upload form */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Upload Document</div>
                  <form onSubmit={e => handleUpload(e, c.id)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ ...s.label, fontSize: 12 }}>Type</label>
                      <select style={{ ...s.input, width: 'auto' }} value={uploadForm.document_type} onChange={e => setUploadForm(p => ({ ...p, document_type: e.target.value }))}>
                        <option value="birth_certificate">Birth Certificate</option>
                        <option value="medical_report">Medical Report</option>
                        <option value="police_report">Police Report</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <label style={{ ...s.label, fontSize: 12 }}>File</label>
                      <input type="file" style={{ ...s.input, paddingTop: 6 }} onChange={e => setUploadForm(p => ({ ...p, file: e.target.files[0] }))} />
                    </div>
                    <button type="submit" disabled={uploading || !uploadForm.file} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: uploading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                      {uploading ? 'Uploading…' : 'Upload'}
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
