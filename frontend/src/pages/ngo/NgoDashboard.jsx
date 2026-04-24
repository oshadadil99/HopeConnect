import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_COLOR = {
  pending:     { bg: '#F3F4F6', text: '#6B7280' },
  assigned:    { bg: '#EFF6FF', text: '#2563EB' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  resolved:    { bg: '#F0FDF4', text: '#16A34A' },
};

const today = () => new Date().toISOString().split('T')[0];

export default function NgoDashboard() {
  const { profile, signOut, supabase } = useAuth();
  const [cases, setCases] = useState([]);
  const [expandedCase, setExpandedCase] = useState(null);
  const [updates, setUpdates] = useState({});
  const [documents, setDocuments] = useState({});

  // Per-case update form state
  const [updateText, setUpdateText] = useState('');
  const [updateDate, setUpdateDate] = useState(today());
  const [updatePhotos, setUpdatePhotos] = useState([]);
  const [updatePreviews, setUpdatePreviews] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => { api.getCases().then(setCases).catch(() => {}); }, []);

  async function toggleCase(caseId) {
    if (expandedCase === caseId) { setExpandedCase(null); setShowUpdateForm(false); return; }
    setExpandedCase(caseId);
    setShowUpdateForm(false);
    resetUpdateForm();
    if (!updates[caseId]) {
      const [u, d] = await Promise.all([
        api.getCaseUpdates(caseId).catch(() => []),
        api.getDocuments(caseId).catch(() => []),
      ]);
      setUpdates(prev => ({ ...prev, [caseId]: u }));
      setDocuments(prev => ({ ...prev, [caseId]: d }));
    }
  }

  function resetUpdateForm() {
    setUpdateText('');
    setUpdateDate(today());
    setUpdatePhotos([]);
    setUpdatePreviews([]);
  }

  function handlePhotoChange(e) {
    const selected = Array.from(e.target.files).slice(0, 5);
    setUpdatePhotos(selected);
    Promise.all(
      selected.map(f => new Promise(resolve => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.readAsDataURL(f);
      }))
    ).then(setUpdatePreviews);
  }

  function removePhoto(idx) {
    setUpdatePhotos(prev => prev.filter((_, i) => i !== idx));
    setUpdatePreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadUpdatePhotos() {
    const urls = [];
    for (const file of updatePhotos) {
      const ext = file.name.split('.').pop();
      const path = `updates/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('evidence').upload(path, file, { upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handlePostUpdate(e, caseId) {
    e.preventDefault();
    if (!updateText.trim()) return;
    setPosting(true);
    try {
      const photo_urls = updatePhotos.length > 0 ? await uploadUpdatePhotos() : [];
      await api.addCaseUpdate(caseId, {
        update_text: updateText.trim(),
        update_date: updateDate || null,
        photo_urls,
      });
      const u = await api.getCaseUpdates(caseId);
      setUpdates(prev => ({ ...prev, [caseId]: u }));
      resetUpdateForm();
      setShowUpdateForm(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post update.');
    }
    setPosting(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' }}>
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

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 17, color: '#111827' }}>
          Assigned Cases <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({cases.length})</span>
        </h2>

        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>No cases assigned to your organization yet.</div>
        ) : (
          cases.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', marginBottom: 12, overflow: 'hidden' }}>

              {/* Case row */}
              <div
                onClick={() => toggleCase(c.id)}
                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{c.children?.first_name} {c.children?.last_name}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#9CA3AF' }}>DOB: {c.children?.date_of_birth}</span>
                  {c.concern_type && <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: '#DC2626' }}>· {c.concern_type}</span>}
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
                <div style={{ borderTop: '1px solid #F3F4F6' }}>

                  {/* ── Case Details ── */}
                  <div style={{ padding: '16px 20px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {c.district && (
                        <span style={{ fontSize: 12, background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>📍 {c.district}</span>
                      )}
                      {c.location && (
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{c.location}</span>
                      )}
                      {c.needs?.length > 0 && c.needs.map(n => (
                        <span key={n} style={{ fontSize: 12, background: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 20 }}>{n}</span>
                      ))}
                    </div>

                    {c.description && (
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                        {c.description}
                      </div>
                    )}

                    {c.image_urls?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Scene Photos</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {c.image_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      Reported by <strong style={{ color: '#6B7280' }}>{c.profiles?.full_name ?? 'Unknown'}</strong>
                      {' · '}{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── Documents ── */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Documents</div>
                      {!documents[c.id] ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
                      ) : documents[c.id].length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No documents uploaded.</p>
                      ) : (
                        documents[c.id].map(doc => (
                          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
                            <span style={{ color: '#374151', textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: doc.verification_status === 'verified' ? '#16A34A' : doc.verification_status === 'rejected' ? '#DC2626' : '#9CA3AF' }}>
                                {doc.verification_status}
                              </span>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontSize: 12 }}>View ↗</a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* ── Progress Updates ── */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Progress Updates</div>
                        <button
                          onClick={() => { setShowUpdateForm(v => !v); if (showUpdateForm) resetUpdateForm(); }}
                          style={{ padding: '5px 14px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {showUpdateForm ? 'Cancel' : '+ Add Update'}
                        </button>
                      </div>

                      {/* Update list */}
                      {!updates[c.id] ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
                      ) : updates[c.id].length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 12px' }}>No updates posted yet.</p>
                      ) : (
                        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {updates[c.id].map(u => (
                            <div key={u.id} style={{ background: '#F0F9FF', borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid #2563EB' }}>
                              {u.update_date && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 5 }}>
                                  {new Date(u.update_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              )}
                              <p style={{ margin: 0, fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{u.update_text}</p>
                              {u.photo_urls?.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                                  {u.photo_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                      <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #BAE6FD', cursor: 'pointer' }} />
                                    </a>
                                  ))}
                                </div>
                              )}
                              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                                {u.profiles?.full_name ?? 'NGO'} · {new Date(u.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add update form */}
                      {showUpdateForm && (
                        <form onSubmit={e => handlePostUpdate(e, c.id)} style={{ background: '#F9FAFB', borderRadius: 8, padding: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Update Date</label>
                            <input
                              type="date"
                              value={updateDate}
                              onChange={e => setUpdateDate(e.target.value)}
                              style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Progress Update *</label>
                            <textarea
                              required
                              rows={3}
                              value={updateText}
                              onChange={e => setUpdateText(e.target.value)}
                              placeholder="Describe what action was taken, current situation, next steps…"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Photos <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional, up to 5)</span></label>
                            <label style={{
                              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                              border: '1.5px dashed #D1D5DB', borderRadius: 6, cursor: 'pointer',
                              background: '#fff', fontSize: 12, color: '#6B7280',
                            }}>
                              📷 {updatePhotos.length > 0 ? `${updatePhotos.length} photo${updatePhotos.length > 1 ? 's' : ''} selected` : 'Upload photos'}
                              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
                            </label>
                            {updatePreviews.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                {updatePreviews.map((src, idx) => (
                                  <div key={idx} style={{ position: 'relative', width: 60, height: 60 }}>
                                    <img src={src} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E7EB' }} />
                                    <button type="button" onClick={() => removePhoto(idx)} style={{
                                      position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                                      borderRadius: '50%', background: '#EF4444', border: '2px solid #fff',
                                      color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                    }}>✕</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="submit"
                              disabled={posting || !updateText.trim()}
                              style={{ padding: '8px 20px', background: posting ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: posting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}
                            >
                              {posting ? 'Posting…' : 'Post Update'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
