import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitHelpRequest, getStudentToken, listenToActiveRequest } from '../firebase/requests';
import { useToast } from '../context/ToastContext';

const HELP_EXAMPLES = [
  'Help me read a short book',
  'Step-by-step math help',
  'Help with writing a sentence',
  'Read a story together',
  'Help understanding instructions',
];

const RequestHelp = () => {
  const [form, setForm] = useState({ nickname: '', topic: '', timing: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [checking, setChecking] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const token = getStudentToken();

  // Check for existing active requests
  useEffect(() => {
    const unsub = listenToActiveRequest(token, (req) => {
      setActiveRequest(req);
      setChecking(false);
      
      // Auto-navigate if already matched
      if (req?.status === 'matched' && req.sessionId) {
        navigate(`/session/${req.sessionId}`);
      }
    });
    return unsub;
  }, [token, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleExample = (example) => {
    setForm((prev) => ({ ...prev, topic: example }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nickname.trim() || !form.topic.trim() || !form.timing.trim()) {
      toast('Please fill in all fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitHelpRequest(form);
      toast('Request sent! We are finding a friend to help you. 💖', 'success');
    } catch (err) {
      toast('Something went wrong. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  if (checking) return <div className="spinner" style={{ marginTop: '4rem' }} />;

  // Waiting Room state
  if (activeRequest && activeRequest.status === 'pending') {
    return (
      <div className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{
          textAlign: 'center', padding: '3.5rem 2rem',
          background: 'rgba(108,99,255,0.04)',
          borderColor: 'var(--primary)',
          boxShadow: '0 0 30px rgba(108,99,255,0.1)',
        }}>
          <div className="calm-indicator" style={{ 
            fontSize: '5rem', marginBottom: '1.5rem',
            animation: 'float 3s infinite ease-in-out' 
          }}>
            🌈
          </div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '2rem' }}>
            We're finding a friend!
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            A friendly volunteer will be here to help you read and learn very soon. 
            <strong> You can stay right here! 💖</strong>
          </p>
          
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>YOUR REQUEST</p>
            <p style={{ fontWeight: 700, margin: 0 }}>"{activeRequest.topic}"</p>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ marginTop: '2.5rem', width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/')}
          >
            Go back for now
          </button>
        </div>

        <style>{`
          @keyframes float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙋</div>
        <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' }}>Request Help</h1>
        <p>Pick any nickname — you're always safe and anonymous here.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="nickname">How should we call you?</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="Pick a nickname you like..."
              value={form.nickname}
              onChange={handleChange}
              maxLength={30}
              required
              autoComplete="off"
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="topic">What would you like to do today?</label>
            <textarea
              id="topic"
              name="topic"
              placeholder="e.g. I want to read a story with someone..."
              value={form.topic}
              onChange={handleChange}
              rows={3}
              maxLength={300}
              required
              style={{ resize: 'vertical', minHeight: 110, padding: '1rem', fontSize: '1.1rem' }}
            />
            <p style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quick ideas:</p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {HELP_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleExample(ex)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 50, fontSize: '0.85rem' }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timing">When do you want to start?</label>
            <input
              id="timing"
              name="timing"
              type="text"
              placeholder="e.g. Right now!, Later today..."
              value={form.timing}
              onChange={handleChange}
              maxLength={80}
              required
              autoComplete="off"
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="submit-request-btn"
            style={{ 
              width: '100%', justifyContent: 'center', 
              fontSize: '1.2rem', padding: '1.2rem', 
              marginTop: '1rem' 
            }}
          >
            {submitting ? '✨ Sending...' : '🚀 Let\'s Go!'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '2rem', background: 'rgba(108,99,255,0.05)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🦋 Friendly reminders</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {['📖 Read a book with a friend', '🔢 Help with your schoolwork', '✏️ Practice writing together', '🎯 Just talk and have fun!'].map((item) => (
            <li key={item} style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--primary)' }}>✔</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RequestHelp;
