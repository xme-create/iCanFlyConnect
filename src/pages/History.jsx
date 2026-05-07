import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { endSession, listenToVolunteerHistory } from '../firebase/sessions';

const formatDate = (ts) => {
  if (!ts?.seconds) return '-';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const History = () => {
  const { user, profile, loading: authLoading, isVolunteer } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endingId, setEndingId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isVolunteer || !user) {
      navigate('/volunteer');
      return;
    }

    const unsub = listenToVolunteerHistory(user.uid, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return unsub;
  }, [authLoading, isVolunteer, navigate, user]);

  const totalMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
  const activeSessions = sessions.filter((session) => session.status === 'active');

  const handleResume = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  const handleEndActive = async (session) => {
    const startTimeMs = session.startTime?.seconds ? session.startTime.seconds * 1000 : Date.now();
    setEndingId(session.id);
    try {
      await endSession(session.id, startTimeMs, Boolean(session.extended));
      toast('Session closed and moved to history.', 'success');
    } catch (error) {
      console.error('Could not end active session from history:', error);
      toast('Could not close that session. Please try again.', 'error');
    } finally {
      setEndingId(null);
    }
  };

  if (authLoading) return <div className="spinner" style={{ marginTop: '4rem' }} />;
  if (!isVolunteer || !user) return null;

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.25rem' }}>My Session History</h1>
        <p>Your impact over time, {profile?.displayName || user.displayName}. Every minute counts!</p>
      </div>

      {activeSessions.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            background: 'rgba(251,191,36,0.08)',
            borderColor: 'rgba(251,191,36,0.35)',
          }}
        >
          <h3 style={{ marginBottom: '0.75rem' }}>You still have an active session</h3>
          <p style={{ marginBottom: '1rem' }}>
            Resume it or end it here so it does not stay stuck as active.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeSessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.9rem 1rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {session.studentNickname} - {session.topic}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Started {formatDate(session.startTime)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleResume(session.id)}>
                    Resume Session
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEndActive(session)}
                    disabled={endingId === session.id}
                  >
                    {endingId === session.id ? 'Ending...' : 'End Session'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="card"
        style={{ marginBottom: '2rem', background: 'rgba(108,99,255,0.07)', borderColor: 'rgba(108,99,255,0.2)' }}
      >
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
            <div className="stat-value">{Math.round((totalMinutes / 60) * 10) / 10}</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{sessions.filter((session) => session.extended).length}</div>
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
            Go to Queue
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="card"
              id={`session-log-${session.id}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${session.status}`}>{session.status}</span>
                  {session.extended && <span className="badge badge-active">Extended</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(session.startTime)}</span>
                </div>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {session.studentNickname} - {session.topic}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {session.durationMinutes || 0} minutes
                </p>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  background: 'rgba(108,99,255,0.1)',
                  border: '1px solid rgba(108,99,255,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1.25rem',
                  minWidth: 80,
                }}
              >
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, var(--primary-light), var(--secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {session.durationMinutes || 0}
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
