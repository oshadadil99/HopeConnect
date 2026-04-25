import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HERO_IMG = '/images/new.png';
const KIDS_IMG = '/images/sri-lanka-protection-2-1.jpg';
const GIRL_IMG = '/images/celebration-deity-navratri.jpg';

const BLUE = '#93C5FD';
const BLUE_DARK = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const DARK  = '#0F172A';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const els = document.querySelectorAll('[data-animate]');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: DARK, overflowX: 'hidden' }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bobble {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }

        /* ── Navbar ── */
        .nav-in { animation: slideDown 0.5s ease 0s both; }

        /* ── Hero stagger (above the fold, no IntersectionObserver needed) ── */
        .hero-badge { animation: fadeUp 0.6s ease 0.15s both; }
        .hero-h1    { animation: fadeUp 0.8s ease 0.35s both; }
        .hero-p     { animation: fadeUp 0.7s ease 0.55s both; }
        .hero-btns  { animation: fadeUp 0.7s ease 0.75s both; }
        .hero-scroll{ animation: bobble 2s ease-in-out 1.5s infinite; }

        /* ── Scroll-reveal base ── */
        [data-animate] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        [data-animate].in-view            { opacity: 1; transform: translateY(0); }
        [data-animate="slide-right"]      { transform: translateX(-36px); }
        [data-animate="slide-right"].in-view { opacity: 1; transform: translateX(0); }
        [data-animate="slide-left"]       { transform: translateX(36px); }
        [data-animate="slide-left"].in-view  { opacity: 1; transform: translateX(0); }
        [data-animate="scale-in"]         { transform: scale(0.94); }
        [data-animate="scale-in"].in-view { opacity: 1; transform: scale(1); }
        [data-animate="fade"]             { transform: none; }
        [data-animate="fade"].in-view     { opacity: 1; }

        /* ── Stagger helpers ── */
        [data-delay="1"] { transition-delay: 0.05s; }
        [data-delay="2"] { transition-delay: 0.15s; }
        [data-delay="3"] { transition-delay: 0.25s; }
        [data-delay="4"] { transition-delay: 0.35s; }
        [data-delay="5"] { transition-delay: 0.45s; }

        /* ── Button hovers ── */
        .btn-blue   { transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease !important; }
        .btn-blue:hover { background: #60A5FA !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(147,197,253,0.38); }
        .btn-outline { transition: background 0.18s ease !important; }
        .btn-outline:hover { background: rgba(255,255,255,0.15) !important; }
        .btn-white   { transition: transform 0.18s ease, box-shadow 0.18s ease !important; }
        .btn-white:hover  { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.18); }
        .btn-signin  { transition: border-color 0.18s ease !important; }
        .btn-signin:hover { border-color: #111827 !important; }
        .btn-report  { transition: background 0.18s ease, border-color 0.18s ease !important; }
        .btn-report:hover { background: #DBEAFE !important; border-color: #93C5FD !important; }

        /* ── Card hovers ── */
        .feature-card { transition: transform 0.22s ease, box-shadow 0.22s ease !important; }
        .feature-card:hover { transform: translateY(-5px); box-shadow: 0 14px 30px rgba(0,0,0,0.1) !important; }
        .role-card { transition: transform 0.2s ease !important; }
        .role-card:hover { transform: translateX(6px); }
      `}</style>

      {/* ══════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════ */}
      <nav className="nav-in" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>💙</span>
          <span style={{ fontWeight: 800, fontSize: 19, color: DARK, letterSpacing: '-0.3px' }}>HopeConnect</span>
        </a>
        <div style={{ display: 'flex', gap: 32 }}>
          {['About', 'How It Works', 'For NGOs', 'Resources'].map(l => (
            <a key={l} href="#" style={{ fontSize: 14, color: '#4B5563', textDecoration: 'none', fontWeight: 500 }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/report')} className="btn-report"
            style={{ padding: '8px 20px', background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: BLUE_DARK }}>
            Report a Concern
          </button>
          <button onClick={() => navigate('/login')} className="btn-signin"
            style={{ padding: '8px 20px', background: 'transparent', border: '1.5px solid #D1D5DB', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: DARK }}>
            Sign In
          </button>
          <button onClick={() => navigate('/login')} className="btn-blue"
            style={{ padding: '8px 20px', background: BLUE, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#0F172A' }}>
            Staff Access
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center',
        marginTop: 64,
        backgroundImage: `url(${HERO_IMG})`,
        backgroundSize: 'cover', backgroundPosition: 'center top',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,15,30,0.82) 0%, rgba(5,15,30,0.65) 55%, rgba(5,15,30,0.28) 100%)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '38%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(147,197,253,0.14)', filter: 'blur(90px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, padding: '0 80px' }}>
          <div className="hero-badge" style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#BFDBFE', textTransform: 'uppercase', marginBottom: 20, background: 'rgba(147,197,253,0.16)', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(191,219,254,0.38)' }}>
            Child Protection · Case Management · Sri Lanka
          </div>
          <h1 className="hero-h1" style={{ fontSize: 60, fontWeight: 900, color: '#fff', margin: '0 0 24px', lineHeight: 1.07, letterSpacing: '-2px' }}>
            Connecting those<br />
            who <span style={{ color: '#BFDBFE' }}>protect</span><br />
            children in need.
          </h1>
          <p className="hero-p" style={{ fontSize: 17, color: '#CBD5E1', lineHeight: 1.75, margin: '0 0 42px', maxWidth: 500 }}>
            HopeConnect unites government admins, NGOs, and social workers
            on one secure platform — so no child's case falls through the cracks.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} className="btn-blue"
              style={{ padding: '14px 32px', background: BLUE, color: '#0F172A', border: 'none', borderRadius: 7, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Get Started →
            </button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} className="btn-outline"
              style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 7, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              How it works
            </button>
          </div>
        </div>

        {/* Scroll hint — outer div is the anchor, inner div bobs */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
          <div className="hero-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>SCROLL</span>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════ */}
      <section style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { value: '3 Roles',    label: 'Admin · NGO · Social Worker' },
            { value: 'Real-time',  label: 'Live case status updates' },
            { value: 'Secure RLS', label: 'Row-level data security' },
            { value: '100%',       label: 'Role-based access control' },
          ].map(({ value, label }, i) => (
            <div key={label} data-animate data-delay={String(i + 1)}
              style={{ padding: '28px 0', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: DARK }}>{value}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          PUBLIC REPORT BANNER
      ══════════════════════════════════════ */}
      <section style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE', padding: '22px 80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🆘</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1E3A8A' }}>Witnessed a child at risk?</div>
            <div style={{ fontSize: 13, color: '#2563EB', marginTop: 2 }}>You can report it anonymously. Every report is reviewed by our team.</div>
          </div>
        </div>
        <button onClick={() => navigate('/report')}
          style={{ padding: '11px 28px', background: BLUE, color: '#0F172A', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Report a Concern →
        </button>
      </section>

      {/* ══════════════════════════════════════
          PARTNERS STRIP
      ══════════════════════════════════════ */}
      <section style={{ background: '#F9FAFB', padding: '44px 80px', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>
        <p data-animate style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 24px' }}>
          Trusted by those who serve
        </p>
        <div data-animate data-delay="2" style={{ display: 'flex', gap: 48, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          {['Ministry of Women & Child Affairs', 'UNICEF Sri Lanka', 'Hope Foundation', 'ChildFund Lanka', 'Save the Children'].map(name => (
            <span key={name} style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF' }}>{name}</span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          ROLE CARDS  +  Image 3 side panel
      ══════════════════════════════════════ */}
      <section style={{ padding: '96px 80px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>

          {/* Left: text + role cards */}
          <div>
            <p data-animate style={{ fontSize: 12, fontWeight: 700, color: BLUE_DARK, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Who it's for</p>
            <h2 data-animate data-delay="1" style={{ fontSize: 38, fontWeight: 800, color: DARK, margin: '0 0 14px', letterSpacing: '-1px', lineHeight: 1.15 }}>
              One platform.<br />Three roles. One mission.
            </h2>
            <p data-animate data-delay="2" style={{ fontSize: 15, color: '#6B7280', margin: '0 0 40px', lineHeight: 1.7 }}>
              Every person in the child protection chain gets exactly the tools they need — no more, no less.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '🏛️', title: 'Government Admins', accent: '#2563EB', bg: '#EFF6FF', desc: 'Oversee all cases, assign NGOs, and track resolution nationwide.', delay: '3' },
                { icon: '🤝', title: 'NGO Organisations', accent: '#60A5FA',      bg: '#DBEAFE', desc: 'Receive assigned cases, review documents, and post progress updates.', delay: '4' },
                { icon: '👷', title: 'Social Workers',    accent: '#93C5FD',  bg: '#F8FBFF', desc: 'Register children, open cases, and upload supporting documents from the field.', delay: '5' },
              ].map(({ icon, title, accent, bg, desc, delay }) => (
                <div key={title} className="role-card" data-animate data-delay={delay}
                  style={{ display: 'flex', gap: 16, padding: '16px 18px', borderRadius: 10, background: bg, border: `1px solid ${accent}20` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div data-animate="slide-left" style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/5', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25)' }}>
              <img src={GIRL_IMG} alt="Child" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 28, left: -28, background: '#fff', borderRadius: 12, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💚</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: DARK, lineHeight: 1 }}>Every child</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>deserves protection</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section id="how-it-works" style={{
        position: 'relative', padding: '100px 80px',
        backgroundImage: `url(${KIDS_IMG})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 64, 175, 0.74) 50%, rgba(147, 197, 253, 0.42) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <p data-animate data-animate="fade" style={{ fontSize: 11, fontWeight: 700, color: '#BFDBFE', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 14px' }}>The Process</p>
            <h2 data-animate data-delay="1" style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: '-1px' }}>
              How a case moves<br />through the system
            </h2>
            <p data-animate data-delay="2" style={{ fontSize: 15, color: '#DBEAFE', lineHeight: 1.75, margin: '0 0 36px' }}>
              From the moment a child is registered to the day their case is resolved —
              every step is tracked, documented, and visible to the right people.
            </p>
            <div data-animate data-delay="3">
              <button onClick={() => navigate('/login')} className="btn-white"
                style={{ padding: '13px 28px', background: '#fff', color: DARK, border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Access Platform →
              </button>
            </div>
          </div>

          {/* Right — steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Child is registered',               desc: 'Social worker creates a profile with name, DOB, and immediate needs.' },
              { n: '02', title: 'Case opened & documents uploaded',   desc: 'Social worker opens a case and attaches supporting documents.' },
              { n: '03', title: 'Admin assigns to NGO',              desc: 'Government admin reviews the case and routes it to a trusted NGO.' },
              { n: '04', title: 'NGO takes action',                  desc: 'NGO receives the case, reviews documents, and posts progress updates.' },
              { n: '05', title: 'Case resolved',                     desc: 'Admin marks the case resolved. Full history stays on record.' },
            ].map(({ n, title, desc }, i, arr) => (
              <div key={n} data-animate data-delay={String(i + 1)}
                style={{ display: 'flex', gap: 18, paddingBottom: i < arr.length - 1 ? 28 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{n}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,0.12)', marginTop: 6 }} />}
                </div>
                <div style={{ paddingTop: 7 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#DBEAFE', lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURE GRID
      ══════════════════════════════════════ */}
      <section style={{ background: '#F9FAFB', padding: '80px 80px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 data-animate style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: DARK, margin: '0 0 8px', letterSpacing: '-0.7px' }}>
            Built for the real world
          </h2>
          <p data-animate data-delay="1" style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, margin: '0 0 52px' }}>
            Every feature was designed for how child protection actually works in Sri Lanka.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { icon: '🔐', title: 'Role-Based Access',   desc: "Each user sees only what they're authorised to see — nothing more." },
              { icon: '📄', title: 'Document Upload',     desc: 'Birth certificates, medical reports, and police reports stored securely.' },
              { icon: '📊', title: 'Case Tracking',       desc: 'Every case has a live status: pending, assigned, in progress, or resolved.' },
              { icon: '💬', title: 'Progress Updates',    desc: 'NGOs post updates so admins and records stay current at all times.' },
            ].map(({ icon, title, desc }, i) => (
              <div key={title} className="feature-card" data-animate data-delay={String(i + 2)}
                style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '28px 22px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: DARK, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1E3A8A 0%, #60A5FA 100%)', padding: '90px 80px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div data-animate="scale-in" style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#BFDBFE', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 14px' }}>Ready to help?</p>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>
            Every case registered<br />is a child protected.
          </h2>
          <p style={{ color: '#DBEAFE', fontSize: 16, margin: '0 0 36px' }}>
            Log in with your credentials to access your dashboard.
          </p>
          <button onClick={() => navigate('/login')} className="btn-white"
            style={{ padding: '14px 36px', background: '#fff', color: '#1E3A8A', border: 'none', borderRadius: 7, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            Login to HopeConnect →
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer style={{ background: DARK, padding: '32px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>💙</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>HopeConnect</span>
          <span style={{ color: '#475569', fontSize: 13, marginLeft: 8 }}>· Child Protection Case Management</span>
        </div>
        <span style={{ color: '#475569', fontSize: 13 }}>© 2025 · Sri Lanka · All rights reserved</span>
      </footer>

    </div>
  );
}

