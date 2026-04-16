import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  submitHelpRequest, 
  getStudentToken, 
  listenToMyActiveRequests, 
  deleteRequest, 
  updateRequest,
  unmatchRequest
} from '../firebase/requests';
import { useToast } from '../context/ToastContext';

const HELP_EXAMPLES = [
  'Help with a school project',
  'Step-by-step math help',
  'Practicing a new skill',
  'Read a story together',
  'Help understanding instructions',
];

const FUN_NICKNAMES = [
  'Blue Panda', 'Happy Tiger', 'Flying Squirrel', 'Clever Owl',
  'Brave Lion', 'Swift Fox', 'Calm Turtle', 'Joyful Dolphin'
];

const RequestHelp = () => {
  const [form, setForm] = useState({ 
    nickname: FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)], 
    topic: '', 
    timing: 'Right now' 
  });
  const [editingId, setEditingId] = useState(null);
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
      
      // If the request currently being edited is matched or cancelled, exit edit mode
      if (editingId && !reqs.find(r => r.id === editingId && r.status === 'pending')) {
        setEditingId(null);
        setForm(prev => ({ ...prev, topic: '', timing: '' }));
      }
    });
    return unsub;
  }, [token, editingId]);

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
      if (editingId) {
        await updateRequest(editingId, form.topic, form.timing);
        toast('Request updated! 🦋', 'success');
        setEditingId(null);
      } else {
        await submitHelpRequest(form);
        toast('Request sent! We are finding a friend to help you. 💖', 'success');
      }
      setForm(prev => ({ ...prev, topic: '', timing: '' })); 
    } catch (err) {
      toast('Something went wrong. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setForm(prev => ({ ...prev, topic: '', timing: '' }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await deleteRequest(id);
        toast('Request cancelled.', 'info');
      } catch (err) {
        toast('Could not cancel request. Try again later.', 'error');
      }
    }
  };

  const handleEdit = (req) => {
    setEditingId(req.id);
    setForm({
      nickname: req.nickname,
      topic: req.topic,
      timing: req.timing,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (checking) return <div className="spinner" style={{ marginTop: '4rem' }} />;

  const matchedRequest = activeRequests.find(r => r.status === 'matched');
  const pendingRequests = activeRequests.filter(r => r.status === 'pending');

  return (
    <div className="page" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙋</div>
        <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' }}>
          {editingId ? 'Edit Your Request' : 'Request Help'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Tell us what you need - a real person will join you shortly.</p>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>🔒 No account needed. Stay anonymous.</p>
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
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/session/${matchedRequest.sessionId}`} className="btn btn-primary" style={{ flex: 1, minWidth: '200px', justifyContent: 'center' }}>
              Jump In Now 🚀
            </Link>
            <button 
              onClick={async () => {
                try {
                  await unmatchRequest(matchedRequest.id);
                  toast('Request re-queued!', 'success');
                } catch (e) {
                  toast('Could not re-queue request.', 'error');
                }
              }}
              className="btn btn-secondary"
            >
              Cancel Match
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ opacity: hasLiveSession ? 0.6 : 1, pointerEvents: hasLiveSession ? 'none' : 'auto', borderColor: editingId ? 'var(--primary)' : 'var(--border)' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            {!editingId && (
              <>
                <label>What do you need help with?</label>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {HELP_EXAMPLES.map((ex) => (
                    <button
                      key={ex} type="button" onClick={() => handleExample(ex)}
                      className={`btn ${form.topic === ex ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ borderRadius: 50, fontSize: '0.85rem' }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </>
            )}
            <label htmlFor="topic">Or describe it in your own words:</label>
            <textarea
              id="topic" name="topic"
              placeholder="I need help with..."
              value={form.topic} onChange={handleChange}
              rows={3} maxLength={300} required
              style={{ resize: 'vertical', minHeight: 110, padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <div className="form-group">
            <label>When do you want to start?</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {['Right now', 'Later today'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setForm(prev => ({ ...prev, timing: t }))}
                  className={`btn ${form.timing === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 50, padding: '0.6rem 1rem' }}
                >
                  {t}
                </button>
              ))}
              <button
                 type="button"
                 onClick={() => setForm(prev => ({ ...prev, timing: '' }))}
                 className={`btn ${!['Right now', 'Later today'].includes(form.timing) ? 'btn-primary' : 'btn-secondary'}`}
                 style={{ borderRadius: 50, padding: '0.6rem 1rem' }}
              >
                Pick a time
              </button>
            </div>
            {!['Right now', 'Later today'].includes(form.timing) && (
              <input
                id="timing" name="timing" type="text"
                placeholder="Type a specific time (e.g. 4:00 PM)"
                value={form.timing} onChange={handleChange}
                maxLength={80} required autoComplete="off"
                style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '0.5rem' }}
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Your Nickname</label>
            <input
              id="nickname" name="nickname" type="text"
              placeholder="Your nickname..."
              value={form.nickname} onChange={handleChange}
              maxLength={30} required autoComplete="off"
              disabled={editingId !== null} // Prevent changing nickname if editing
              style={{ padding: '1rem', fontSize: '1.1rem', opacity: editingId ? 0.6 : 1 }}
            />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
              ℹ️ A volunteer will join and help you shortly!
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit" className="btn btn-primary"
                disabled={submitting || hasLiveSession}
                id="submit-request-btn"
                style={{ 
                  flex: 1, justifyContent: 'center', 
                  fontSize: '1.2rem', padding: '1.2rem' 
                }}
              >
                {hasLiveSession ? '⌛ Finish live session first' : (editingId ? (submitting ? 'Updating...' : 'Save Changes') : (submitting ? '✨ Connecting...' : '🤝 Connect me to a volunteer'))}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCancelClick}
                  style={{ fontSize: '1.1rem', padding: '1.2rem' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
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
                padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                background: req.id === editingId ? 'rgba(108,99,255,0.05)' : 'rgba(255,255,255,0.02)', 
                borderColor: req.id === editingId ? 'var(--primary)' : 'var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem' }}>🌈</div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{req.topic}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.timing}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleEdit(req)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    disabled={hasLiveSession}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(req.id)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)' }}
                    disabled={hasLiveSession}
                  >
                    🗑️ Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '3rem', background: 'rgba(108,99,255,0.05)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🦋 You are in a safe place</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {['You can ask anything — big or small', "You don't have to figure it out alone", 'You can leave anytime'].map((item) => (
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
