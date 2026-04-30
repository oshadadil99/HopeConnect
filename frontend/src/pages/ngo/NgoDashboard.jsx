import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const STATUS_COLOR = {
  pending: { bg: '#F8FAFC', text: '#64748B', border: '#CBD5E1' },
  assigned: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  in_progress: { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' },
  resolved: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
};

const FILTERS = ['all', 'assigned', 'in_progress', 'resolved'];
const STATUS_CHART_COLORS = {
  assigned: '#60A5FA',
  in_progress: '#FBBF24',
  resolved: '#34D399',
  pending: '#CBD5E1',
};
const CATEGORY_CHART_COLORS = ['#60A5FA', '#A78BFA', '#F472B6', '#FBBF24', '#34D399'];
const today = () => new Date().toISOString().split('T')[0];

function childName(c) {
  return `${c.children?.first_name ?? ''} ${c.children?.last_name ?? ''}`.trim() || 'Unnamed child';
}

function publicCaseName(report) {
  return report.child_name || 'Unknown child';
}

function prettyStatus(status) {
  return status?.replace('_', ' ') ?? 'unknown';
}

function countBy(items, getKey) {
  return Object.entries(items.reduce((acc, item) => {
    const key = getKey(item) || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name: prettyStatus(name), value }));
}

export default function NgoDashboard() {
  const { profile, signOut, supabase } = useAuth();
  const [cases, setCases] = useState([]);
  const [publicReports, setPublicReports] = useState([]);
  const [expandedCase, setExpandedCase] = useState(null);
  const [expandedPublicReport, setExpandedPublicReport] = useState(null);
  const [updates, setUpdates] = useState({});
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const [updateText, setUpdateText] = useState('');
  const [updateDate, setUpdateDate] = useState(today());
  const [updatePhotos, setUpdatePhotos] = useState([]);
  const [updatePreviews, setUpdatePreviews] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    setPublicLoading(true);
    try {
      setCases(await api.getCases());
    } catch {
      setCases([]);
    }
    setLoading(false);

    try {
      setPublicReports(await api.getPublicReports());
    } catch {
      setPublicReports([]);
    }
    setPublicLoading(false);
  }

  const stats = useMemo(() => ({
    total: cases.length + publicReports.length,
    assigned: cases.filter(c => c.status === 'assigned').length,
    in_progress: cases.filter(c => c.status === 'in_progress').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    public: publicReports.length,
  }), [cases, publicReports]);

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

  const statusChartData = useMemo(() => (
    ['assigned', 'in_progress', 'resolved', 'pending']
      .map(status => ({ name: prettyStatus(status), status, value: cases.filter(c => c.status === status).length }))
      .filter(item => item.value > 0)
  ), [cases]);

  const concernChartData = useMemo(() => (
    countBy(cases, c => c.concern_type).sort((a, b) => b.value - a.value).slice(0, 5)
  ), [cases]);

  const districtChartData = useMemo(() => (
    countBy(cases, c => c.district).sort((a, b) => b.value - a.value).slice(0, 5)
  ), [cases]);

  async function toggleCase(caseId) {
    if (expandedCase === caseId) {
      setExpandedCase(null);
      setShowUpdateForm(false);
      return;
    }

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
      selected.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(file);
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
      const freshUpdates = await api.getCaseUpdates(caseId);
      setUpdates(prev => ({ ...prev, [caseId]: freshUpdates }));
      resetUpdateForm();
      setShowUpdateForm(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post update.');
    }
    setPosting(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#EFF6FF 0%,#F8FBFF 38%,#FFFFFF 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      <header style={{ background: 'rgba(255,255,255,0.86)', borderBottom: '1px solid #DBEAFE', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#BFDBFE,#60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1E3A8A' }}>HC</div>
            <div>
              <div style={{ fontWeight: 850, fontSize: 18 }}>HopeConnect</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                NGO Workspace · {profile?.full_name}
                {profile?.organization_name && <span> · {profile.organization_name}</span>}
              </div>
            </div>
          </div>
          <button onClick={signOut} style={{ padding: '9px 16px', border: '1px solid #BFDBFE', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Sign Out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 24px 56px', display: 'flex', flexDirection: 'column' }}>
        <section style={{ background: 'linear-gradient(135deg,#DBEAFE,#F8FBFF)', border: '1px solid #BFDBFE', borderRadius: 18, padding: 24, boxShadow: '0 18px 46px rgba(37,99,235,0.12)', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 850, color: '#2563EB', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Assigned case management</div>
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, letterSpacing: 0 }}>Review cases, track action, post progress.</h1>
              <p style={{ margin: '10px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.7, maxWidth: 620 }}>Your assigned cases are organized by status with documents, scene photos, and updates available inside each case.</p>
            </div>
            <button onClick={loadCases} style={{ padding: '11px 18px', border: 'none', borderRadius: 12, background: '#93C5FD', color: '#0F172A', fontWeight: 800, cursor: 'pointer' }}>Refresh Cases</button>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            ['Total Work', stats.total, '#1E3A8A'],
            ['Assigned', stats.assigned, '#2563EB'],
            ['Public Cases', stats.public, '#7C3AED'],
            ['Resolved', stats.resolved, '#1E40AF'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 30, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
          <ChartCard title="Status Mix" subtitle="Current assigned workload">
            {statusChartData.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={4}>
                    {statusChartData.map((item, index) => <Cell key={index} fill={STATUS_CHART_COLORS[item.status] ?? CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Concern Types" subtitle="Most common assigned cases">
            {concernChartData.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={concernChartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#EAF2FF" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={86} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {concernChartData.map((_, index) => <Cell key={index} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="District Load" subtitle="Cases by location">
            {districtChartData.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={districtChartData} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#EAF2FF" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {districtChartData.map((_, index) => <Cell key={index} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>

        <section style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 18, boxShadow: '0 14px 40px rgba(15,23,42,0.06)', overflow: 'hidden', order: 5 }}>
          <div style={{ padding: 18, borderBottom: '1px solid #EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Assigned Cases <span style={{ color: '#94A3B8', fontWeight: 500 }}>({visibleCases.length})</span></h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Open a case to review documents and submit progress updates.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search child, district, need..." style={{ width: 240, padding: '10px 12px', border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: 13, background: '#F8FBFF' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 12px', borderRadius: 999, border: filter === f ? 'none' : '1px solid #DBEAFE', background: filter === f ? '#93C5FD' : '#fff', color: filter === f ? '#0F172A' : '#475569', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{prettyStatus(f)}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#94A3B8' }}>Loading assigned cases...</div>
            ) : visibleCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#94A3B8' }}>No cases match the current view.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 14 }}>
                {visibleCases.map(c => {
                  const isOpen = expandedCase === c.id;
                  return (
                    <article key={c.id} style={{ background: isOpen ? '#F8FBFF' : '#fff', borderRadius: 16, border: `1px solid ${isOpen ? '#93C5FD' : '#E2E8F0'}`, overflow: 'hidden', boxShadow: isOpen ? '0 12px 32px rgba(37,99,235,0.12)' : '0 6px 18px rgba(15,23,42,0.04)' }}>
                      <button onClick={() => toggleCase(c.id)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 18, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 850, color: '#0F172A' }}>{childName(c)}</div>
                            <div style={{ marginTop: 5, fontSize: 12, color: '#64748B' }}>DOB: {c.children?.date_of_birth || 'Not recorded'} · {c.district || 'District unavailable'}</div>
                          </div>
                          <span style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: STATUS_COLOR[c.status]?.bg, color: STATUS_COLOR[c.status]?.text, border: `1px solid ${STATUS_COLOR[c.status]?.border}` }}>{prettyStatus(c.status)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
                          {c.concern_type && <span style={{ fontSize: 12, background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>{c.concern_type}</span>}
                          {c.needs?.slice(0, 3).map(n => <span key={n} style={{ fontSize: 12, background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: 999 }}>{n}</span>)}
                        </div>

                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12 }}>
                          <span>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Panel title={`Documents (${documents[c.id]?.length ?? 0})`}>
                              {!documents[c.id] ? <Muted>Loading...</Muted> : documents[c.id].length === 0 ? <Muted>No documents uploaded.</Muted> : documents[c.id].map(doc => (
                                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #EAF2FF', fontSize: 13 }}>
                                  <span style={{ color: '#334155', textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 800 }}>View</a>
                                </div>
                              ))}
                            </Panel>

                            <Panel title={`Updates (${updates[c.id]?.length ?? 0})`}>
                              {!updates[c.id] ? <Muted>Loading...</Muted> : updates[c.id].length === 0 ? <Muted>No updates posted yet.</Muted> : updates[c.id].slice(0, 3).map(u => (
                                <div key={u.id} style={{ background: '#EFF6FF', borderRadius: 12, padding: 10, marginBottom: 8, borderLeft: '3px solid #60A5FA' }}>
                                  <div style={{ fontSize: 12, color: '#1E40AF', fontWeight: 800 }}>{u.update_date ? new Date(u.update_date).toLocaleDateString('en-GB') : 'Progress update'}</div>
                                  <p style={{ margin: '5px 0 0', color: '#334155', fontSize: 13, lineHeight: 1.55 }}>{u.update_text}</p>
                                </div>
                              ))}
                            </Panel>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ fontSize: 13, fontWeight: 850, color: '#0F172A' }}>Post a progress update</div>
                              <button onClick={() => { setShowUpdateForm(v => !v); if (showUpdateForm) resetUpdateForm(); }} style={{ padding: '7px 13px', background: showUpdateForm ? '#E2E8F0' : '#93C5FD', color: '#0F172A', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>{showUpdateForm ? 'Cancel' : '+ Add Update'}</button>
                            </div>

                            {showUpdateForm && (
                              <form onSubmit={e => handlePostUpdate(e, c.id)} style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #DBEAFE', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input type="date" value={updateDate} onChange={e => setUpdateDate(e.target.value)} style={inputStyle} />
                                <textarea required rows={3} value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Describe action taken, current situation, and next steps..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
                                <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', border: '1.5px dashed #93C5FD', borderRadius: 12, cursor: 'pointer', background: '#F8FBFF', fontSize: 13, color: '#2563EB', fontWeight: 800 }}>
                                  {updatePhotos.length > 0 ? `${updatePhotos.length} photo${updatePhotos.length > 1 ? 's' : ''} selected` : 'Upload photos'}
                                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
                                </label>
                                {updatePreviews.length > 0 && (
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{updatePreviews.map((src, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: 64, height: 64 }}>
                                      <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #DBEAFE' }} />
                                      <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#2563EB', color: '#fff', border: '2px solid #fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>x</button>
                                    </div>
                                  ))}</div>
                                )}
                                <button type="submit" disabled={posting || !updateText.trim()} style={{ padding: '10px 18px', background: posting ? '#BFDBFE' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, cursor: posting ? 'not-allowed' : 'pointer', fontWeight: 850, fontSize: 13 }}>{posting ? 'Posting...' : 'Post Update'}</button>
                              </form>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 18, boxShadow: '0 14px 40px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: 22, order: 4 }}>
          <div style={{ padding: 18, borderBottom: '1px solid #EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', background: 'linear-gradient(135deg,#FFFFFF,#F8FBFF)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Public Cases <span style={{ color: '#94A3B8', fontWeight: 500 }}>({publicReports.length})</span></h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Public reports assigned by admin for NGO review and field follow-up.</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 12, fontWeight: 850 }}>
              {publicReports.filter(r => r.status === 'reviewed').length} active
            </span>
          </div>

          <div style={{ padding: 18 }}>
            {publicLoading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>Loading public cases...</div>
            ) : publicReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>No public cases assigned yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 14 }}>
                {publicReports.map(report => {
                  const isOpen = expandedPublicReport === report.id;
                  const status = report.status === 'converted'
                    ? { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' }
                    : report.status === 'reviewed'
                      ? { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }
                      : { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
                  return (
                    <article key={report.id} style={{ background: isOpen ? '#F8FBFF' : '#fff', borderRadius: 16, border: `1px solid ${isOpen ? '#93C5FD' : '#E2E8F0'}`, overflow: 'hidden', boxShadow: isOpen ? '0 12px 32px rgba(37,99,235,0.12)' : '0 6px 18px rgba(15,23,42,0.04)' }}>
                      <button onClick={() => setExpandedPublicReport(isOpen ? null : report.id)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 18, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 850, color: '#0F172A' }}>{publicCaseName(report)}</div>
                            <div style={{ marginTop: 5, fontSize: 12, color: '#64748B' }}>
                              {report.child_age ? `Age ${report.child_age}` : 'Age unavailable'} · {report.district || 'District unavailable'}
                            </div>
                          </div>
                          <span style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>{prettyStatus(report.status)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
                          {report.concern_type && <span style={{ fontSize: 12, background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>{report.concern_type}</span>}
                          <span style={{ fontSize: 12, background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: 999 }}>Public report</span>
                        </div>

                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12 }}>
                          <span>{new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>{isOpen ? 'Close details' : 'Open details'} {isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid #DBEAFE', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                          <div style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 850, color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Public Report Summary</div>
                            {report.description ? <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{report.description}</p> : <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>No description provided.</p>}
                          </div>

                          {report.evidence_urls?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>Evidence Photos</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {report.evidence_urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 12, border: '2px solid #DBEAFE' }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Panel title="Reporter">
                              <div style={{ fontSize: 13, color: '#334155', fontWeight: 750 }}>{report.reporter_name || 'Anonymous'}</div>
                              <div style={{ marginTop: 5, fontSize: 12, color: '#94A3B8' }}>{report.reporter_contact || 'No contact details'}</div>
                            </Panel>
                            <Panel title="Case Details">
                              <div style={{ fontSize: 13, color: '#334155' }}>District: <strong>{report.district || 'Unavailable'}</strong></div>
                              <div style={{ marginTop: 6, fontSize: 13, color: '#334155' }}>Concern: <strong>{report.concern_type || 'Unknown'}</strong></div>
                            </Panel>
                          </div>
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

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #BFDBFE',
  borderRadius: 12,
  outline: 'none',
  fontSize: 13,
  boxSizing: 'border-box',
};

const tooltipStyle = {
  border: '1px solid #BFDBFE',
  borderRadius: 12,
  boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
  color: '#0F172A',
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 16, padding: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.05)' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13, background: '#F8FBFF', borderRadius: 12 }}>
      No chart data yet
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DBEAFE', borderRadius: 14, padding: 14, minHeight: 120 }}>
      <div style={{ fontSize: 12, fontWeight: 850, color: '#2563EB', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Muted({ children }) {
  return <p style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}>{children}</p>;
}
