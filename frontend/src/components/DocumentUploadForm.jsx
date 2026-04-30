import { useRef, useState } from 'react';
import * as api from '../services/api';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const EMPTY_FORM = { firstName: '', lastName: '', dateOfBirth: '', gender: '', district: '' };

const s = {
  input: {
    width: '100%', padding: '11px 13px', border: '1px solid #BFDBFE',
    borderRadius: 12, fontSize: 14, boxSizing: 'border-box',
    outline: 'none', background: '#fff', fontFamily: 'inherit',
  },
  label: {
    display: 'block', marginBottom: 6, fontSize: 12,
    fontWeight: 800, color: '#1E3A8A',
  },
  badge: (color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, background: color.bg,
    color: color.text, border: `1px solid ${color.border}`,
  }),
};

function Field({ label, children }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

// normalise extracted district against the known list (case-insensitive)
function matchDistrict(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  return DISTRICTS.find(d => d.toLowerCase() === lower) ?? '';
}

// returns age in full years, or null if dateStr is invalid
function calcAge(dateStr) {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  if (isNaN(dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const notYetHadBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (notYetHadBirthday) age--;
  return age;
}

export default function DocumentUploadForm({ onSaved }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ageAlert, setAgeAlert] = useState(null);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setSaved(null);
    setMsg(null);
    setAgeAlert(null);
    setForm(EMPTY_FORM);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function handleExtract(e) {
    e.preventDefault();
    if (!file) return;
    setExtracting(true);
    setMsg(null);
    try {
      const data = await api.extractDocument(file);
      setExtracted(data);
      const filled = {
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        dateOfBirth: data.dateOfBirth ?? '',
        gender: data.gender ?? '',
        district: matchDistrict(data.district),
      };
      setForm(filled);

      const age = calcAge(data.dateOfBirth);
      setAgeAlert(age !== null ? age : null);
    } catch {
      setMsg({ type: 'error', text: 'Extraction failed. Check the file and try again.' });
    }
    setExtracting(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.dateOfBirth) {
      setMsg({ type: 'error', text: 'First name, last name, and date of birth are required.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const child = await api.createChild({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        date_of_birth: form.dateOfBirth,
      });
      setSaved(child);
      setMsg({ type: 'success', text: `Child profile saved: ${form.firstName} ${form.lastName}` });
      onSaved?.(child, form);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save child profile.' });
    }
    setSaving(false);
  }

  function reset() {
    setFile(null);
    setExtracted(null);
    setSaved(null);
    setMsg(null);
    setAgeAlert(null);
    setForm(EMPTY_FORM);
    if (fileRef.current) fileRef.current.value = '';
  }

  const isImage = file && file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#2563EB' : '#93C5FD'}`,
          borderRadius: 16, padding: '28px 20px', textAlign: 'center',
          background: dragOver ? '#EFF6FF' : '#F8FBFF',
          cursor: file ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          style={{ display: 'none' }}
          onChange={e => pickFile(e.target.files[0])}
        />

        {!file ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: 14 }}>
              Drop a birth certificate here
            </div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
              or click to browse · JPG, PNG, PDF · max 10 MB
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #BFDBFE' }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📄</div>
            )}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>{file.name}</div>
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
                {(file.size / 1024).toFixed(0)} KB · {file.type}
              </div>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); reset(); }}
              style={{ padding: '7px 14px', border: '1px solid #BFDBFE', borderRadius: 10, background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Extract button */}
      {file && !extracted && (
        <button
          onClick={handleExtract}
          disabled={extracting}
          style={{
            padding: '12px 20px', border: 'none', borderRadius: 12,
            background: extracting ? '#BFDBFE' : '#2563EB',
            color: '#fff', fontWeight: 850, fontSize: 14,
            cursor: extracting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {extracting ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Extracting data with AI...
            </>
          ) : 'Extract from Document'}
        </button>
      )}

      {/* Age validation banner */}
      {ageAlert !== null && ageAlert >= 16 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 14,
          background: '#FEF2F2', border: '1px solid #FECACA',
        }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>🚫</div>
          <div>
            <div style={{ fontWeight: 850, fontSize: 14, color: '#991B1B' }}>
              Registration Blocked — Individual is {ageAlert} years old
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#B91C1C', lineHeight: 1.6 }}>
              This person is older than 16 years and cannot be registered as a child in HopeConnect. Only individuals under 16 are eligible for child protection registration.
            </div>
          </div>
        </div>
      )}

      {ageAlert !== null && ageAlert < 16 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 14,
          background: '#FFF7ED', border: '1px solid #FED7AA',
        }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 850, fontSize: 14, color: '#9A3412' }}>
              Child is under 16 years old ({ageAlert} {ageAlert === 1 ? 'year' : 'years'} old)
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#C2410C', lineHeight: 1.6 }}>
              This child falls within the protected age group. Ensure all mandatory reporting and safeguarding procedures are followed before proceeding.
            </div>
          </div>
        </div>
      )}

      {/* Feedback message */}
      {msg && (
        <div style={{
          padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 650,
          background: msg.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          color: msg.type === 'error' ? '#B91C1C' : '#065F46',
          border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Review & edit form */}
      {extracted && !saved && (
        <form onSubmit={handleSave} style={{ background: '#F8FBFF', borderRadius: 16, border: '1px solid #BFDBFE', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 850, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Extracted Profile — Review & Edit</div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
              AI extracted the fields below. Correct any errors before saving.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Field label="First Name *">
              <input
                required
                style={s.input}
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                placeholder="First name"
              />
            </Field>
            <Field label="Last Name *">
              <input
                required
                style={s.input}
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </Field>
            <Field label="Date of Birth *">
              <input
                required
                type="date"
                style={s.input}
                value={form.dateOfBirth}
                onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))}
              />
            </Field>
            <Field label="Gender">
              <select
                style={s.input}
                value={form.gender}
                onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
              >
                <option value="">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="District">
              <select
                style={{ ...s.input, gridColumn: '1 / -1' }}
                value={form.district}
                onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
              >
                <option value="">Select district...</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>

          {/* Confidence indicators for null fields */}
          {Object.entries(extracted).some(([, v]) => v === null) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>Could not read:</span>
              {extracted.firstName === null && <span style={s.badge({ bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' })}>First name</span>}
              {extracted.lastName === null && <span style={s.badge({ bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' })}>Last name</span>}
              {extracted.dateOfBirth === null && <span style={s.badge({ bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' })}>Date of birth</span>}
              {extracted.gender === null && <span style={s.badge({ bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' })}>Gender</span>}
              {extracted.district === null && <span style={s.badge({ bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' })}>District</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={saving || (ageAlert !== null && ageAlert >= 16)}
              style={{
                flex: 1, padding: '11px 20px', border: 'none', borderRadius: 12,
                background: (ageAlert !== null && ageAlert >= 16) ? '#FCA5A5' : saving ? '#BFDBFE' : '#2563EB',
                color: '#fff', fontWeight: 850, fontSize: 14,
                cursor: (saving || (ageAlert !== null && ageAlert >= 16)) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Child Profile'}
            </button>
            <button
              type="button"
              onClick={reset}
              style={{ padding: '11px 18px', border: '1px solid #BFDBFE', borderRadius: 12, background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Start Over
            </button>
          </div>
        </form>
      )}

      {/* Success — saved profile card */}
      {saved && (
        <div style={{ background: 'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border: '1px solid #A7F3D0', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 850, color: '#065F46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Profile Saved</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#A7F3D0,#6EE7B7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#065F46' }}>
              {form.firstName?.[0]?.toUpperCase()}{form.lastName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 850, fontSize: 16, color: '#0F172A' }}>{form.firstName} {form.lastName}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                DOB: {form.dateOfBirth || '—'} · {form.gender || 'Unknown'} · {form.district || 'District not set'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 14, padding: '9px 16px', border: '1px solid #6EE7B7', borderRadius: 10, background: '#fff', color: '#065F46', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            Verify Another Document
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
