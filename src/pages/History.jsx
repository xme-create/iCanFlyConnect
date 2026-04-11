import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listenToVolunteerHistory } from '../firebase/sessions';

const formatDate = (ts) => {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const History = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/volunteer'); return; }
    const unsub = listenToVolunteerHistory(user.uid, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  if (!user) return null;

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.25rem' }}>My Session History</h1>
        <p>Your impact over time, {profile?.displayName || user.displayName}. Every minute counts! 💙</p>
      </div>

      {/* Summary stats */}
      <div className="card" style={{ marginBottom: '2rem', background: 'rgba(108,99,255,0.07)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="stat-box">
            <div className="stat-value">{sessions.length}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{totalMinutes}</div>
            <div className="stat-label">Total Minutes</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{Math.round(totalMinutes / 60 * 10) / 10}</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{sessions.filter((s) => s.extended).length}</div>
            <div className="stat-label">Extended Sessions</div>
          </div>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {!loading && sessions.length === 0 && (
        <div className="empty-state">
          <div className="emoji">📭</div>
          <h3>No sessions yet</h3>
          <p>Head to the queue and accept a request to get started!</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Go to Queue →
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card"
              id={`session-log-${s.id}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                  {s.extended && <span className="badge badge-active">⚡ Extended</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDate(s.startTime)}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {s.studentNickname} — {s.topic}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {s.durationMinutes || 0} minutes
                </p>
              </div>
              <div style={{
                textAlign: 'center',
                background: 'rgba(108,99,255,0.1)',
                border: '1px solid rgba(108,99,255,0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1.25rem',
                minWidth: 80,
              }}>
                <div style={{
                  fontSize: '1.6rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary-light), var(--secondary))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {s.durationMinutes || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MIN</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
