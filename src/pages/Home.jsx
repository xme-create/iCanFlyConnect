import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudentToken, listenToActiveRequest } from '../firebase/requests';

const Home = () => {
  const [activeRequest, setActiveRequest] = useState(null);
  const navigate = useNavigate();
  const token = getStudentToken();

  useEffect(() => {
    const unsub = listenToActiveRequest(token, (req) => {
      setActiveRequest(req);
    });
    return unsub;
  }, [token]);

  const handleResume = () => {
    if (activeRequest.status === 'matched') {
      navigate(`/session/${activeRequest.sessionId}`);
    } else {
      navigate('/request');
    }
  };

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* Hero Section */}
      <section className="hero" style={{ 
        padding: '6rem 1.5rem 8rem', 
        textAlign: 'center',
        background: 'radial-gradient(circle at top, rgba(108,99,255,0.15) 0%, transparent 70%)'
      }}>
        <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '2rem', animation: 'float 4s infinite ease-in-out' }}>🦋</div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1, fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Help that lifts you <span style={{ 
              background: 'linear-gradient(135deg, #6c63ff 0%, #ff6b6b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>higher</span>
          </h1>
          <p style={{ fontSize: '1.25rem', maxWidth: 640, margin: '0 auto 3rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            iCanFlyConnect pairs students with caring volunteers
            for real-time, one-to-one support — no account required.
          </p>

          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {activeRequest ? (
              <button 
                onClick={handleResume}
                className="btn btn-primary"
                style={{ 
                  padding: '1.2rem 2.5rem', fontSize: '1.3rem', 
                  backgroundImage: 'linear-gradient(135deg, #6c63ff 0%, #a29bfe 100%)',
                  boxShadow: '0 10px 30px rgba(108,99,255,0.4)',
                  border: 'none'
                }}
              >
                ✨ Go to my help session
              </button>
            ) : (
              <Link to="/request" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                🙋 Request Help Now
              </Link>
            )}
            
            <Link to="/volunteer" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              💙 Become a Volunteer →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '6rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container" style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>How it works</h2>
            <p style={{ color: 'var(--text-muted)' }}>Simple, safe, and supportive — in just a few steps.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            {[
              { step: '1', emoji: '💬', title: 'Ask for help', text: "Just pick a nickname and tell us what you'd like to do. You stay anonymous!" },
              { step: '2', emoji: '🤝', title: 'Get matched', text: "A friendly volunteer sees your request and joins you instantly." },
              { step: '3', emoji: '🎉', title: 'Learn together', text: "Chat, talk, or use video for up to 20 minutes of one-to-one help." }
            ].map((item) => (
              <div key={item.step} className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
                <div style={{ 
                  width: 60, height: 60, background: 'rgba(108,99,255,0.1)', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' 
                }}>
                  {item.emoji}
                </div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{item.step}. {item.title}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '8rem 1.5rem' }}>
        <div className="container" style={{ 
          maxWidth: 800, margin: '0 auto', textAlign: 'center',
          padding: '4rem 2rem', background: 'rgba(108,99,255,0.05)',
          borderRadius: 'var(--radius-lg)', border: '1px solid rgba(108,99,255,0.15)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>💙</div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Ready to make a difference?</h2>
          <p style={{ marginBottom: '2.5rem', maxWidth: 500, margin: '0 auto 2.5rem', color: 'var(--text-secondary)' }}>
            Join as a volunteer and help students soar. 
            Every session counts — and every minute matters.
          </p>
          <Link to="/volunteer" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
            Join the Volunteer Team
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0) rotate(0); }
        }
      `}</style>
    </div>
  );
};

export default Home;
