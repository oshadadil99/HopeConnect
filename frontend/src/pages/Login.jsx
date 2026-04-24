import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_REDIRECTS = {
  admin: '/admin',
  ngo: '/ngo',
  social_worker: '/social-worker',
};

export default function Login() {
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [waitingForProfile, setWaitingForProfile] = useState(false);

  useEffect(() => {
    if (waitingForProfile && profile?.role) {
      setWaitingForProfile(false);
      navigate(ROLE_REDIRECTS[profile.role] ?? '/');
    }
  }, [profile, waitingForProfile, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) return setError(err.message);
    setWaitingForProfile(true);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: '0 0 46%',
        background: 'linear-gradient(145deg, #1D4ED8 0%, #1E40AF 50%, #1E3A8A 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ fontSize: 26 }}>💙</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.3px' }}>HopeConnect</span>
          </Link>
        </div>

        {/* Centre text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', fontSize: 34, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Protecting children,<br />one case at a time.
          </h2>
          <p style={{ color: '#BFDBFE', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 320 }}>
            A unified platform connecting government admins, NGOs, and social workers
            across Sri Lanka.
          </p>

          {/* Role pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🏛️', role: 'Government Admin', desc: 'Manage and assign all cases' },
              { icon: '🤝', role: 'NGO Organisation', desc: 'Handle assigned cases and updates' },
              { icon: '👷', role: 'Social Worker', desc: 'Register children and open cases' },
            ].map(({ icon, role, desc }) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{role}</div>
                  <div style={{ color: '#BFDBFE', fontSize: 12, marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#93C5FD', fontSize: 12, margin: 0 }}>
            © 2025 HopeConnect · Child Protection Case Management · Sri Lanka
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        background: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Back link */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13, textDecoration: 'none', marginBottom: 36 }}>
            ← Back to home
          </Link>

          {/* Heading */}
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Welcome back</h1>
          <p style={{ margin: '0 0 32px', color: '#6B7280', fontSize: 14 }}>Sign in to access your dashboard</p>

          {/* Form card */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '32px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@hopeconnect.lk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid #D1D5DB',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                    background: '#FAFAFA',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 42px 10px 14px', border: '1.5px solid #D1D5DB',
                      borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      background: '#FAFAFA',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, padding: 0 }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>⚠️</span>
                  <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '11px', background: loading ? '#93C5FD' : '#2563EB',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading && (
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Hint */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9CA3AF' }}>
            Access is invite-only. Contact your administrator<br />if you need credentials.
          </p>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
