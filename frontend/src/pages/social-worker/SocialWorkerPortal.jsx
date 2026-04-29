import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import DocumentUploadForm from '../../components/DocumentUploadForm';

const CONCERN_TYPES = [
  'Physical Abuse', 'Sexual Abuse', 'Emotional Abuse', 'Neglect',
  'Abandonment', 'Child Labour', 'Trafficking', 'Domestic Violence', 'Other',
];

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const STATUS_COLOR = {
  pending: { bg: '#F8FAFC', text: '#64748B', border: '#CBD5E1' },
  assigned: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  in_progress: { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' },
  resolved: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
};

const FILTERS = ['all', 'pending', 'assigned', 'in_progress', 'resolved'];
const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  needs: '',
  district: '',
  location: '',
  concern_type: '',
  description: '',
};

const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  border: '1px solid #BFDBFE',
  borderRadius: 12,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  background: '#fff',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 800,
  color: '#1E3A8A',
};

function prettyStatus(status) {
  return status?.replace('_', ' ') ?? 'unknown';
}

function childName(c) {
  return `${c.children?.first_name ?? ''} ${c.children?.last_name ?? ''}`.trim() || 'Unnamed child';
}

export default function SocialWorkerPortal() {
  const { profile, signOut, supabase } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedCase, setExpandedCase] = useState(null);
  const [documents, setDocuments] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadForm, setUploadForm] = useState({ document_type: 'birth_certificate', file: null });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showDocVerify, setShowDocVerify] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      setCases(await api.getCases());
    } catch {
      setMsg({ type: 'error', text: 'Failed to load cases.' });
    }
    setLoading(false);
  }

  const stats = useMemo(() => ({
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending').length,
    active: cases.filter(c => ['assigned', 'in_progress'].includes(c.status)).length,
    resolved: cases.filter(c => c.status === 'resolved').length,
  }), [cases]);

  const visibleCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter(c => {
      const matchesFilter = filter === 'all' || c.status === filter;
      const haystack = [
        childName(c),
        c.district,
        c.location,
        c.concern_type,
        ...(c.needs ?? []),
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [cases, filter, query]);

  async function loadDocuments(caseId) {
    try {
      const caseDocuments = await api.getDocuments(caseId);
      setDocuments(prev => ({ ...prev, [caseId]: caseDocuments }));
    } catch {
      setDocuments(prev => ({ ...prev, [caseId]: [] }));
    }
  }

  function toggleCase(caseId) {
    if (expandedCase === caseId) {
      setExpandedCase(null);
      return;
    }
    setExpandedCase(caseId);
    if (!documents[caseId]) loadDocuments(caseId);
  }

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleImageChange(e) {
    const selected = Array.from(e.target.files).slice(0, 5);
    setImages(selected);
    Promise.all(
      selected.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(file);
      }))
    ).then(setImagePreviews);
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadImages() {
    const urls = [];
    for (const file of images) {
      const ext = file.name.split('.').pop();
      const path = `case-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('evidence').upload(path, file, { upsert: false });
      if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  function handleDocSaved(_child, extracted) {
    setForm(prev => ({
      ...prev,
      first_name: extracted.firstName || prev.first_name,
      last_name: extracted.lastName || prev.last_name,
      date_of_birth: extracted.dateOfBirth || prev.date_of_birth,
      district: extracted.district || prev.district,
    }));
    setShowDocVerify(false);
    setShowForm(true);
    setMsg({ type: 'success', text: 'Document verified — child details have been filled in. Complete the case form below.' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const image_urls = images.length > 0 ? await uploadImages() : [];
      const child = await api.createChild({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
      });
      await api.createCase({
        child_id: child.id,
        needs: form.needs ? form.needs.split(',').map(n => n.trim()).filter(Boolean) : [],
        district: form.district || null,
        location: form.location.trim() || null,
        concern_type: form.concern_type || null,
        description: form.description.trim() || null,
        image_urls,
      });
      setMsg({ type: 'success', text: 'Case created successfully.' });
      setForm(EMPTY_FORM);
      setImages([]);
      setImagePreviews([]);
      setShowForm(false);
      loadCases();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Error creating case.' });
    }
    setSubmitting(false);
  }

  async function handleUpload(e, caseId) {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      await api.uploadDocument(caseId, uploadForm.document_type, uploadForm.file);
      setUploadForm({ document_type: 'birth_certificate', file: null });
      e.target.reset();
      loadDocuments(caseId);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed.');
    }
    setUploading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#EFF6FF 0%,#F8FBFF 42%,#FFFFFF 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      <header style={{ background: 'rgba(255,255,255,0.88)', borderBottom: '1px solid #DBEAFE', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#BFDBFE,#60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1E3A8A' }}>SW</div>
            <div>
              <div style={{ fontWeight: 850, fontSize: 18 }}>HopeConnect</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Social Worker Workspace · {profile?.full_name}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ padding: '9px 16px', border: '1px solid #BFDBFE', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Sign Out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 24px 56px' }}>
        <section style={{ background: 'linear-gradient(135deg,#DBEAFE,#F8FBFF)', border: '1px solid #BFDBFE', borderRadius: 18, padding: 24, boxShadow: '0 18px 46px rgba(37,99,235,0.12)', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 850, color: '#2563EB', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Field case registration</div>
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15 }}>Create cases, attach evidence, follow progress.</h1>
              <p style={{ margin: '10px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.7, maxWidth: 650 }}>Register children, record concern details, upload scene photos, and manage supporting documents from one workspace.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowDocVerify(v => !v); setShowForm(false); setMsg(null); }}
                style={{ padding: '12px 18px', border: '1px solid #BFDBFE', borderRadius: 12, background: showDocVerify ? '#E2E8F0' : '#fff', color: '#1E40AF', fontWeight: 850, cursor: 'pointer', fontSize: 14 }}
              >
                {showDocVerify ? 'Close Verifier' : 'Verify Document'}
              </button>
              <button onClick={() => { setShowForm(v => !v); setShowDocVerify(false); setMsg(null); }} style={{ padding: '12px 18px', border: 'none', borderRadius: 12, background: showForm ? '#E2E8F0' : '#93C5FD', color: '#0F172A', fontWeight: 850, cursor: 'pointer' }}>{showForm ? 'Close Form' : '+ New Case'}</button>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            ['My Cases', stats.total, '#1E3A8A'],
            ['Pending', stats.pending, '#64748B'],
            ['Active', stats.active, '#0369A1'],
            ['Resolved', stats.resolved, '#1E40AF'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 750 }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </section>

        {showDocVerify && (
          <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #BFDBFE', padding: 22, marginBottom: 22, boxShadow: '0 14px 40px rgba(15,23,42,0.06)' }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Verify Document</h2>
              <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 13 }}>
                Upload a birth certificate (image or PDF). AI will extract child details and auto-fill the new case form.
              </p>
            </div>
            <DocumentUploadForm onSaved={handleDocSaved} />
          </section>
        )}

        {msg && (
          <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 12, background: msg.type === 'error' ? '#FEF2F2' : '#EFF6FF', color: msg.type === 'error' ? '#B91C1C' : '#1E40AF', border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#BFDBFE'}`, fontSize: 14, fontWeight: 650 }}>
            {msg.text}
          </div>
        )}

        {showForm && (
          <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #DBEAFE', padding: 22, marginBottom: 22, boxShadow: '0 14px 40px rgba(15,23,42,0.06)' }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Register New Case</h2>
              <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 13 }}>Capture the core child, location, need, concern, and evidence details.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>
                <Field label="First Name *"><input style={inputStyle} required value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="Child's first name" /></Field>
                <Field label="Last Name *"><input style={inputStyle} required value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Child's last name" /></Field>
                <Field label="Date of Birth *"><input style={inputStyle} type="date" required value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} /></Field>
                <Field label="District"><select style={inputStyle} value={form.district} onChange={e => setField('district', e.target.value)}><option value="">Select district...</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></Field>
                <Field label="Location / Area"><input style={inputStyle} value={form.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. Galle Road, Colombo 3" /></Field>
                <Field label="Needs"><input style={inputStyle} value={form.needs} onChange={e => setField('needs', e.target.value)} placeholder="food, shelter, medical care" /></Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Type of Concern *"><select required style={inputStyle} value={form.concern_type} onChange={e => setField('concern_type', e.target.value)}><option value="">Select concern type...</option>{CONCERN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="Describe the Situation *"><textarea required rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Describe what happened, current situation, and immediate risks." /></Field>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Scene Photos <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional, up to 5)</span></label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 14px', border: '1.5px dashed #93C5FD', borderRadius: 14, cursor: 'pointer', background: '#F8FBFF', fontSize: 13, color: '#2563EB', fontWeight: 800 }}>
                  {images.length > 0 ? `${images.length} photo${images.length > 1 ? 's' : ''} selected` : 'Click to upload photos'}
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 76, height: 76 }}>
                        <img src={src} alt="" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 12, border: '1px solid #DBEAFE' }} />
                        <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: '50%', background: '#2563EB', border: '2px solid #fff', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting} style={{ padding: '11px 22px', background: submitting ? '#BFDBFE' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 850, fontSize: 14 }}>
                {submitting ? 'Saving...' : 'Create Case'}
              </button>
            </form>
          </section>
        )}

        <section style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 18, boxShadow: '0 14px 40px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: 18, borderBottom: '1px solid #EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>My Cases <span style={{ color: '#94A3B8', fontWeight: 500 }}>({visibleCases.length})</span></h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Open a case to review evidence and upload supporting documents.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search child, district, need..." style={{ width: 240, padding: '10px 12px', border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: 13, background: '#F8FBFF' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 12px', borderRadius: 999, border: filter === f ? 'none' : '1px solid #DBEAFE', background: filter === f ? '#93C5FD' : '#fff', color: filter === f ? '#0F172A' : '#475569', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{prettyStatus(f)}</button>)}
              </div>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#94A3B8' }}>Loading cases...</div>
            ) : visibleCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#94A3B8' }}>No cases match the current view.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 14 }}>
                {visibleCases.map(c => {
                  const isOpen = expandedCase === c.id;
                  const status = STATUS_COLOR[c.status] ?? STATUS_COLOR.pending;
                  return (
                    <article key={c.id} style={{ background: isOpen ? '#F8FBFF' : '#fff', borderRadius: 16, border: `1px solid ${isOpen ? '#93C5FD' : '#E2E8F0'}`, overflow: 'hidden', boxShadow: isOpen ? '0 12px 32px rgba(37,99,235,0.12)' : '0 6px 18px rgba(15,23,42,0.04)' }}>
                      <button onClick={() => toggleCase(c.id)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 18, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 850, color: '#0F172A' }}>{childName(c)}</div>
                            <div style={{ marginTop: 5, fontSize: 12, color: '#64748B' }}>DOB: {c.children?.date_of_birth || 'Not recorded'} · {c.district || 'District unavailable'}</div>
                          </div>
                          <span style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>{prettyStatus(c.status)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
                          {c.concern_type && <span style={{ fontSize: 12, background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>{c.concern_type}</span>}
                          {c.needs?.slice(0, 3).map(n => <span key={n} style={{ fontSize: 12, background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: 999 }}>{n}</span>)}
                        </div>

                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12 }}>
                          <span>Opened {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>{isOpen ? 'Close details' : 'Open details'} {isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid #DBEAFE', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                          <div style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 850, color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Case Summary</div>
                            {c.description ? <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{c.description}</p> : <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>No description provided.</p>}
                            {c.location && <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>Location: <strong>{c.location}</strong></div>}
                          </div>

                          {c.image_urls?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>Scene Photos</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{c.image_urls.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 12, border: '2px solid #DBEAFE' }} /></a>)}</div>
                            </div>
                          )}

                          <Panel title={`Documents (${documents[c.id]?.length ?? 0})`}>
                            {!documents[c.id] ? <Muted>Loading...</Muted> : documents[c.id].length === 0 ? <Muted>No documents uploaded yet.</Muted> : documents[c.id].map(doc => (
                              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #EAF2FF', fontSize: 13 }}>
                                <span style={{ color: '#334155', textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 800 }}>View</a>
                              </div>
                            ))}
                          </Panel>

                          <form onSubmit={e => handleUpload(e, c.id)} style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #DBEAFE', display: 'grid', gridTemplateColumns: '170px 1fr auto', gap: 10, alignItems: 'end' }}>
                            <Field label="Document Type"><select style={inputStyle} value={uploadForm.document_type} onChange={e => setUploadForm(p => ({ ...p, document_type: e.target.value }))}><option value="birth_certificate">Birth Certificate</option><option value="medical_report">Medical Report</option><option value="police_report">Police Report</option></select></Field>
                            <Field label="File"><input type="file" style={{ ...inputStyle, paddingTop: 9 }} onChange={e => setUploadForm(p => ({ ...p, file: e.target.files[0] }))} /></Field>
                            <button type="submit" disabled={uploading || !uploadForm.file} style={{ padding: '11px 18px', background: uploading ? '#BFDBFE' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 850, fontSize: 13, whiteSpace: 'nowrap' }}>{uploading ? 'Uploading...' : 'Upload'}</button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 850, color: '#2563EB', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Muted({ children }) {
  return <p style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}>{children}</p>;
}
