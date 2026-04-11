import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitHelpRequest, getStudentToken, listenToMyActiveRequests } from '../firebase/requests';
import { useToast } from '../context/ToastContext';

const HELP_EXAMPLES = [
  'Help with a school project',
  'Step-by-step math help',
  'Practicing a new skill',
  'Read a story together',
  'Help understanding instructions',
];

const RequestHelp = () => {
  const [form, setForm] = useState({ nickname: '', topic: '', timing: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [checking, setChecking] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const token = getStudentToken();

  // Check for existing active requests
  useEffect(() => {
    const unsub = listenToMyActiveRequests(token, (reqs) => {
      setActiveRequests(reqs);
      setChecking(false);
    });
    return unsub;
  }, [token]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleExample = (example) => {
    setForm((prev) => ({ ...prev, topic: example }));
  };

  const hasLiveSession = activeRequests.some(r => r.status === 'matched');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nickname.trim() || !form.topic.trim() || !form.timing.trim()) {
      toast('Please fill in all fields.', 'error');
      return;
    }

    if (hasLiveSession) {
      toast('You already have a live session! Please finish that one first. 💙', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await submitHelpRequest(form);
      toast('Request sent! We are finding a friend to help you. 💖', 'success');
      setForm(prev => ({ ...prev, topic: '', timing: '' })); 
    } catch (err) {
      toast('Something went wrong. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  if (checking) return <div className="spinner" style={{ marginTop: '4rem' }} />;

  const matchedRequest = activeRequests.find(r => r.status === 'matched');
  const pendingRequests = activeRequests.filter(r => r.status === 'pending');

  return (
    <div className="page" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙋</div>
        <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' }}>Request Help</h1>
        <p>Pick any nickname — you're always safe and anonymous here.</p>
      </div>

      {/* MATCHED SESSION PROMINENT ALERT */}
      {matchedRequest && (
        <div className="card" style={{
          marginBottom: '2rem', textAlign: 'center', padding: '1.5rem',
          background: 'rgba(74,222,128,0.1)', borderColor: 'var(--success)',
          boxShadow: '0 0 20px rgba(74,222,128,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--success)' }}>✨ Your Session is Ready! ✨</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            <strong>{matchedRequest.volunteerName}</strong> is waiting to share with you.
          </p>
          <Link to={`/session/${matchedRequest.sessionId}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Jump In Now 🚀
          </Link>
        </div>
      )}

      <div className="card" style={{ opacity: hasLiveSession ? 0.6 : 1, pointerEvents: hasLiveSession ? 'none' : 'auto' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="nickname">How should we call you?</label>
            <input
              id="nickname" name="nickname" type="text"
              placeholder="Pick a nickname you like..."
              value={form.nickname} onChange={handleChange}
              maxLength={30} required autoComplete="off"
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="topic">What would you like to do today?</label>
            <textarea
              id="topic" name="topic"
              placeholder="e.g. I want to read a story with someone..."
              value={form.topic} onChange={handleChange}
              rows={3} maxLength={300} required
              style={{ resize: 'vertical', minHeight: 110, padding: '1rem', fontSize: '1.1rem' }}
            />
            <p style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quick ideas:</p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {HELP_EXAMPLES.map((ex) => (
                <button
                  key={ex} type="button" onClick={() => handleExample(ex)}
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
              id="timing" name="timing" type="text"
              placeholder="e.g. Right now!, Later today..."
              value={form.timing} onChange={handleChange}
              maxLength={80} required autoComplete="off"
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <button
            type="submit" className="btn btn-primary"
            disabled={submitting || hasLiveSession}
            id="submit-request-btn"
            style={{ 
              width: '100%', justifyContent: 'center', 
              fontSize: '1.2rem', padding: '1.2rem', 
              marginTop: '1rem' 
            }}
          >
            {hasLiveSession ? '⌛ Finish live session first' : (submitting ? '✨ Sending...' : '🚀 Let\'s Go!')}
          </button>
        </form>
      </div>

      {/* PENDING REQUESTS SECTION */}
      {pendingRequests.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
             Waiting requests ({pendingRequests.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingRequests.map((req) => (
              <div key={req.id} className="card" style={{ 
                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem' }}>🌈</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{req.topic}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Finding a friend...</p>
                </div>
                <span className="badge badge-pending">Waiting</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '3rem', background: 'rgba(108,99,255,0.05)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🦋 Friendly reminders</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {['🤝 Help with something new', '🔢 Get through your schoolwork', '✏️ Practice writing together', '🎯 Just talk and have fun!'].map((item) => (
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
