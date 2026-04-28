import { useState, useEffect, useRef } from 'react';
import { askChatbot } from '../services/api';

const WALLPAPER = '/images/wallpaper.png';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (bubbleDismissed || open) return;
    const show = setTimeout(() => setBubbleVisible(true), 2000);
    const hide = setTimeout(() => setBubbleVisible(false), 9000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [bubbleDismissed, open]);

  useEffect(() => {
    if (open) setBubbleVisible(false);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 250);
  }, [open]);

  async function handleSend() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion('');
    setMessages(prev => [...prev, { type: 'user', text: q }]);
    setLoading(true);
    try {
      const data = await askChatbot(q);
      setMessages(prev => [...prev, { type: 'bot', text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !loading && question.trim().length > 0;

  return (
    <>
      <style>{`
        @keyframes cb-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes cb-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cb-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-22px); }
        }
        @keyframes cb-ring {
          0%, 90%, 100% { transform: rotate(0deg); }
          92%            { transform: rotate(-18deg); }
          94%            { transform: rotate(18deg); }
          96%            { transform: rotate(-12deg); }
          98%            { transform: rotate(8deg); }
        }
        @keyframes cb-bubble-in {
          from { opacity: 0; transform: scale(0.7) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cb-bubble-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.7) translateY(10px); }
        }
        .cb-float-wrap {
          animation: cb-float 2.4s ease-in-out infinite;
          display: flex; flex-direction: column; align-items: flex-end; gap: 10;
        }
        .cb-toggle-inner {
          animation: cb-ring 4s ease-in-out 3s infinite;
          width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(37,99,235,0.55), 0 2px 8px rgba(0,0,0,0.15);
          display: flex; align-items: center; justify-content: center;
          transition: box-shadow 0.2s;
        }
        .cb-toggle-inner:hover {
          box-shadow: 0 8px 32px rgba(37,99,235,0.65), 0 2px 8px rgba(0,0,0,0.2);
        }
        .cb-send-btn:not(:disabled):hover { background: #2563EB !important; transform: scale(1.08); }
        .cb-input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }
      `}</style>

      {/* Floating toggle + bubble */}
      <div style={{ position: 'fixed', bottom: 36, right: 44, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>

        {/* Pop-up message bubble */}
        {bubbleVisible && !open && (
          <div style={{
            background: '#fff',
            borderRadius: '16px 16px 4px 16px',
            padding: '10px 14px 10px 12px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
            border: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', gap: 8,
            maxWidth: 220,
            animation: 'cb-bubble-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
            position: 'relative',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>💙</span>
            <span style={{ fontSize: 13, color: '#1E3A8A', fontWeight: 600, lineHeight: 1.4 }}>
              Chat with me for any help!
            </span>
            <button
              onClick={e => { e.stopPropagation(); setBubbleVisible(false); setBubbleDismissed(true); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9CA3AF', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px',
                flexShrink: 0,
              }}
              title="Dismiss"
            >×</button>
          </div>
        )}

        <div className={open ? '' : 'cb-float-wrap'}>
        <button
          className="cb-toggle-inner"
          onClick={() => setOpen(o => !o)}
          title="Chat with HopeConnect Assistant"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="rgba(255,255,255,0.18)" stroke="#fff" strokeWidth="1.8"/>
              <circle cx="8.5" cy="10" r="1.2" fill="#fff"/>
              <circle cx="12" cy="10" r="1.2" fill="#fff"/>
              <circle cx="15.5" cy="10" r="1.2" fill="#fff"/>
            </svg>
          )}
        </button>
        </div>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 108, right: 44, zIndex: 999,
          width: 370, height: 560, borderRadius: 20,
          background: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid rgba(59,130,246,0.15)',
          animation: 'cb-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
            padding: '16px 18px',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid rgba(255,255,255,0.3)',
                fontSize: 20, flexShrink: 0,
              }}>
                💙
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.2px' }}>HopeConnect Assistant</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80' }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5 }}>Online · English & සිංහල</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages area with wallpaper */}
          <div style={{
            flex: 1, overflowY: 'auto', position: 'relative',
          }}>
            {/* Wallpaper layer */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${WALLPAPER})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />

            {/* Messages scroll content */}
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '16px 14px 8px',
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: '100%',
            }}>
              {messages.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', minHeight: 200,
                  gap: 10, paddingTop: 16,
                }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26,
                  }}>
                    💙
                  </div>
                  <div style={{ color: '#1E3A8A', fontWeight: 800, fontSize: 15, textAlign: 'center' }}>
                    How can I help you?
                  </div>
                  <div style={{ color: '#374151', fontSize: 12.5, textAlign: 'center', lineHeight: 1.6, maxWidth: 230 }}>
                    Ask me anything about child protection or how HopeConnect works.
                  </div>

                  {/* Suggestion chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 80 }}>
                    {['How to report abuse?', 'What is 1929?', 'Child work age?'].map(s => (
                      <button
                        key={s}
                        onClick={() => { setQuestion(s); textareaRef.current?.focus(); }}
                        style={{
                          background: '#fff',
                          border: '1.5px solid #BFDBFE',
                          borderRadius: 20, padding: '6px 14px',
                          color: '#1E40AF', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: m.type === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: 7,
                }}>
                  {m.type === 'bot' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, border: '1.5px solid rgba(255,255,255,0.2)',
                    }}>💙</div>
                  )}
                  <div style={{
                    maxWidth: '76%',
                    background: m.type === 'user'
                      ? 'linear-gradient(135deg, #2563EB, #3B82F6)'
                      : 'rgba(255,255,255,0.92)',
                    color: m.type === 'user' ? '#fff' : '#111827',
                    borderRadius: m.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    fontSize: 13.5, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    boxShadow: m.type === 'user'
                      ? '0 2px 12px rgba(37,99,235,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.2)',
                    backdropFilter: m.type === 'bot' ? 'blur(8px)' : 'none',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, border: '1.5px solid rgba(255,255,255,0.2)',
                  }}>💙</div>
                  <div style={{
                    background: 'rgba(255,255,255,0.92)',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '12px 16px',
                    display: 'flex', gap: 5, alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(8px)',
                  }}>
                    {[0, 1, 2].map(d => (
                      <div key={d} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#3B82F6',
                        animation: `cb-bounce 1.3s ease-in-out ${d * 0.22}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input bar */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: '1px solid #E5E7EB',
            background: '#fff',
            display: 'flex', gap: 8, alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={textareaRef}
              className="cb-input"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question..."
              rows={1}
              style={{
                flex: 1, resize: 'none',
                border: '1.5px solid #E5E7EB',
                borderRadius: 12, padding: '9px 13px',
                fontSize: 13.5, fontFamily: 'inherit',
                outline: 'none', lineHeight: 1.5,
                maxHeight: 90, overflowY: 'auto',
                background: '#F9FAFB',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                color: '#111827',
              }}
            />
            <button
              className="cb-send-btn"
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: canSend
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : '#E5E7EB',
                border: 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, transform 0.15s',
                boxShadow: canSend ? '0 2px 10px rgba(37,99,235,0.35)' : 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={canSend ? '#fff' : '#9CA3AF'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
