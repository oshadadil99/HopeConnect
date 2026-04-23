import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitPublicReport } from '../services/api';

const CONCERN_TYPES = [
  'Physical Abuse',
  'Sexual Abuse',
  'Emotional Abuse',
  'Neglect',
  'Abandonment',
  'Child Labour',
  'Trafficking',
  'Domestic Violence',
  'Other',
];

const FIELD = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #D1D5DB',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#FAFAFA', fontFamily: 'inherit',
};

export default function Report() {
  const [form, setForm] = useState({
    child_name: '', child_age: '', location: '',
    concern_type: '', description: '',
    reporter_name: '', reporter_contact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitPublicReport(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 24px' }}>✅</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Report received</h2>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: '0 0 32px' }}>
            Thank you for reporting. Our team will review this case and take the appropriate action.
            Every report helps protect a child.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => { setSubmitted(false); setForm({ child_name: '', child_age: '', location: '', concern_type: '', description: '', reporter_name: '', reporter_contact: '' }); }}
              style={{ padding: '11px 24px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Submit Another Report
            </button>
            <Link to="/" style={{ padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>💙</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>HopeConnect</span>
        </Link>
        <Link to="/login" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>Staff Login →</Link>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero text */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#DC2626', textTransform: 'uppercase', background: '#FEF2F2', padding: '4px 12px', borderRadius: 20, border: '1px solid #FECACA', marginBottom: 16 }}>
            Report a Child Protection Concern
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111827', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
            You can make a difference
          </h1>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>
            If you suspect a child is at risk or being harmed, please fill out this form.
            Your report is confidential and will be reviewed by our team. You do not need to provide your personal details.
          </p>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '32px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Section: About the child */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                About the Child
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Child's Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text" required value={form.child_name}
                    onChange={e => set('child_name', e.target.value)}
                    placeholder="First and last name"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Approximate Age
                  </label>
                  <input
                    type="text" value={form.child_age}
                    onChange={e => set('child_age', e.target.value)}
                    placeholder="e.g. 8 years"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Location / Area
              </label>
              <input
                type="text" value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Colombo 5, Galle Road"
                style={FIELD}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            {/* Concern type */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Type of Concern <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                required value={form.concern_type}
                onChange={e => set('concern_type', e.target.value)}
                style={{ ...FIELD, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              >
                <option value="">Select the type of concern…</option>
                {CONCERN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Describe the Situation <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                required value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5}
                placeholder="Please describe what you have witnessed or been told. Include as many details as you can — dates, people involved, and the child's current situation."
                style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            {/* Section: Your details */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                Your Details <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>(optional — you may remain anonymous)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Your Name</label>
                  <input
                    type="text" value={form.reporter_name}
                    onChange={e => set('reporter_name', e.target.value)}
                    placeholder="Optional"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone / Email</label>
                  <input
                    type="text" value={form.reporter_contact}
                    onChange={e => set('reporter_contact', e.target.value)}
                    placeholder="Optional"
                    style={FIELD}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%', padding: 13, background: submitting ? '#86EFAC' : '#16A34A',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
