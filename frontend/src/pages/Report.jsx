import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitPublicReport } from '../services/api';
import { useAuth } from '../context/AuthContext';

const REPORT_BG = '/images/family-praying-indoors.jpg';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const CONCERN_TYPES = [
  'Physical Abuse', 'Sexual Abuse', 'Emotional Abuse', 'Neglect',
  'Abandonment', 'Child Labour', 'Trafficking', 'Domestic Violence', 'Other',
];

const FIELD = {
  width: '100%', padding: '12px 14px', border: '1px solid rgba(59, 130, 246, 0.22)',
  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: 'rgba(255, 255, 255, 0.72)', fontFamily: 'inherit',
  boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
};

const LABEL = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#172554',
  marginBottom: 7,
};

const SECTION_TITLE = {
  fontSize: 11,
  fontWeight: 800,
  color: '#1D4ED8',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 16,
};

const EMPTY_FORM = {
  child_name: '', child_age: '', district: '',
  concern_type: '', description: '',
  reporter_name: '', reporter_contact: '',
};

export default function Report() {
  const { supabase } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files).slice(0, 5);
    setFiles(selected);
    Promise.all(
      selected.map(f => new Promise(resolve => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.readAsDataURL(f);
      }))
    ).then(setPreviews);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadFiles() {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `reports/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('evidence')
        .upload(path, file, { upsert: false });
      if (upErr) throw new Error(`Upload failed for ${file.name}: ${upErr.message}`);
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const evidence_urls = files.length > 0 ? await uploadFiles() : [];
      await submitPublicReport({ ...form, evidence_urls });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.68)), url(${REPORT_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center', background: 'rgba(255,255,255,0.94)', borderRadius: 14, padding: '36px 32px', boxShadow: '0 18px 60px rgba(15,23,42,0.22)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 24px' }}>✅</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Report received</h2>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: '0 0 32px' }}>
            Thank you for reporting. Our team will review this case and take the appropriate action.
            Every report helps protect a child.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); setFiles([]); setPreviews([]); }}
              style={{ padding: '11px 24px', background: '#93C5FD', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Submit Another Report
            </button>
            <Link to="/" style={{ padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(90deg, rgba(18, 24, 39, 0.78), rgba(18, 24, 39, 0.56)), url(${REPORT_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      fontFamily: 'system-ui, sans-serif',
    }}>

      <header style={{ background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(219, 234, 254, 0.9))', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(191,219,254,0.55)', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>💙</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>HopeConnect</span>
        </Link>
        <Link to="/login" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>Staff Login →</Link>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '44px 24px 56px' }}>

        <div style={{ marginBottom: 30 }}>
          <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#1D4ED8', textTransform: 'uppercase', background: 'linear-gradient(135deg, rgba(239,246,255,0.96), rgba(219,234,254,0.94))', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(147,197,253,0.75)', marginBottom: 16, boxShadow: '0 8px 28px rgba(15,23,42,0.16)' }}>
            Report a Child Protection Concern
          </div>
          <h1 style={{ fontSize: 31, fontWeight: 850, color: '#fff', margin: '0 0 10px', letterSpacing: 0, lineHeight: 1.15 }}>
            You can make a difference
          </h1>
          <p style={{ fontSize: 14, color: '#F8FAFC', lineHeight: 1.8, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.32)', maxWidth: 580 }}>
            If you suspect a child is at risk or being harmed, please fill out this form.
            Your report is confidential and will be reviewed by our team. You do not need to provide your personal details.
          </p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(248, 251, 255, 0.93), rgba(219, 234, 254, 0.88))', backdropFilter: 'blur(18px)', borderRadius: 16, border: '1px solid rgba(191,219,254,0.6)', padding: '30px 28px', boxShadow: '0 24px 80px rgba(15,23,42,0.28)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 21 }}>

            {/* About the child */}
            <div>
              <div style={SECTION_TITLE}>
                About the Child
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={LABEL}>
                    Child's Name <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                  </label>
                  <input
                    type="text" value={form.child_name}
                    onChange={e => set('child_name', e.target.value)}
                    placeholder="First and last name"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#60A5FA'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
                  />
                </div>
                <div>
                  <label style={LABEL}>
                    Approximate Age
                  </label>
                  <input
                    type="text" value={form.child_age}
                    onChange={e => set('child_age', e.target.value)}
                    placeholder="e.g. 8 years"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#60A5FA'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
                  />
                </div>
              </div>
            </div>

            {/* District */}
            <div>
              <label style={LABEL}>
                District <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                required value={form.district}
                onChange={e => set('district', e.target.value)}
                style={{ ...FIELD, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#60A5FA'}
                onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
              >
                <option value="">Select district…</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Concern type */}
            <div>
              <label style={LABEL}>
                Type of Concern <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                required value={form.concern_type}
                onChange={e => set('concern_type', e.target.value)}
                style={{ ...FIELD, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#60A5FA'}
                onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
              >
                <option value="">Select the type of concern…</option>
                {CONCERN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={LABEL}>
                Describe the Situation <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                required value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5}
                placeholder="Please describe what you have witnessed or been told. Include as many details as you can — dates, people involved, and the child's current situation."
                style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = '#60A5FA'}
                onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
              />
            </div>

            {/* Photo evidence */}
            <div>
              <div style={{ ...SECTION_TITLE, marginBottom: 12 }}>
                Photo Evidence <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>(optional — up to 5 images)</span>
              </div>

              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '24px 16px', border: '1.5px dashed rgba(59, 130, 246, 0.28)', borderRadius: 14,
                cursor: 'pointer', background: 'rgba(255, 255, 255, 0.48)', transition: 'border-color 0.15s, background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#60A5FA'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.68)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.28)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.48)'; }}
              >
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#172554' }}>Click to upload photos</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>JPG, PNG, WEBP — max 5 files, 10 MB each</span>
                <input
                  type="file" accept="image/*" multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                  {previews.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 88, height: 88 }}>
                      <img
                        src={src} alt={`evidence-${idx}`}
                        style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }}
                      />
                      <button
                        type="button" onClick={() => removeFile(idx)}
                        style={{
                          position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                          borderRadius: '50%', background: '#EF4444', border: '2px solid #fff',
                          color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your details */}
            <div>
              <div style={{ ...SECTION_TITLE, marginBottom: 4 }}>
                Your Details <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>(optional — you may remain anonymous)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label style={LABEL}>Your Name</label>
                  <input
                    type="text" value={form.reporter_name}
                    onChange={e => set('reporter_name', e.target.value)}
                    placeholder="Optional"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#60A5FA'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
                  />
                </div>
                <div>
                  <label style={LABEL}>Phone / Email</label>
                  <input
                    type="text" value={form.reporter_contact}
                    onChange={e => set('reporter_contact', e.target.value)}
                    placeholder="Optional"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#60A5FA'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59, 130, 246, 0.22)'}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%', padding: 14, background: submitting ? '#93C5FD' : 'linear-gradient(135deg, #60A5FA, #2563EB)',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 12px 28px rgba(37, 99, 235, 0.28)',
              }}
            >
              {submitting && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: 0 }}>
              Your report is confidential and reviewed only by authorised HopeConnect staff.
            </p>
          </form>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

