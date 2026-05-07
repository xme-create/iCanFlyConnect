import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getFavorites } from '../firebase/favorites';
import { acceptRequest, getRequest } from '../firebase/requests';
import { createSession, endSession, listenToVolunteerHistory } from '../firebase/sessions';
import RequestCard from '../components/RequestCard';
import { listenToQueue } from '../firebase/requests';

const VolunteerDashboard = () => {
  const { user, profile, loading: authLoading, isVolunteer } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('requested');
  const [sessions, setSessions] = useState([]);
  const [endingId, setEndingId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isVolunteer || !user) {
      navigate('/volunteer');
      return;
    }

    const unsubQueue = listenToQueue((requests) => {
      setQueue(requests);
      setLoading(false);
    });
    const unsubSessions = listenToVolunteerHistory(user.uid, setSessions);
    getFavorites().then(setFavorites);

    return () => {
      unsubQueue();
      unsubSessions();
    };
  }, [authLoading, isVolunteer, navigate, user]);

  const activeSession = useMemo(
    () =>
      sessions
        .filter((session) => session.status === 'active')
        .sort((a, b) => (b.startTime?.seconds ?? 0) - (a.startTime?.seconds ?? 0))[0] || null,
    [sessions]
  );

  const handleAccept = async (requestId) => {
    if (activeSession) {
      toast('Finish or resume your active session before starting a new one.', 'warning');
      return;
    }

    const req = queue.find((item) => item.id === requestId);
    if (!req) return;

    try {
      const latestReq = await getRequest(requestId);
      if (!latestReq || latestReq.status !== 'pending') {
        toast('This request was already taken!', 'info');
        return;
      }

      const { sessionId } = await createSession({
        requestId,
        volunteerId: user.uid,
        volunteerName: profile?.displayName || user.displayName || 'Volunteer',
        studentNickname: req.nickname,
        topic: req.topic,
      });
      await acceptRequest(
        requestId,
        {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Volunteer',
        },
        sessionId
      );
      toast('Session started! Get ready to help.', 'success');
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error(error);
      toast('Could not accept request. Please try again.', 'error');
    }
  };

  const handleEndActive = async () => {
    if (!activeSession) return;
    const startTimeMs = activeSession.startTime?.seconds ? activeSession.startTime.seconds * 1000 : Date.now();
    setEndingId(activeSession.id);
    try {
      await endSession(activeSession.id, startTimeMs, Boolean(activeSession.extended));
      toast('Active session closed.', 'success');
    } catch (error) {
      console.error('Could not end active session from dashboard:', error);
      toast('Could not close that active session. Please try again.', 'error');
    } finally {
      setEndingId(null);
    }
  };

  let displayed =
    filter === 'favorites'
      ? queue.filter((request) => request.volunteerId && favorites.includes(request.volunteerId))
      : [...queue];

  if (sortBy === 'requested') {
    displayed.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  } else {
    displayed.sort((a, b) => {
      const ta = (a.timing || '').toLowerCase();
      const tb = (b.timing || '').toLowerCase();
      const asap = (value) => value.includes('asap') || value.includes('now') || value.includes('urgent');
      if (asap(ta) && !asap(tb)) return -1;
      if (!asap(ta) && asap(tb)) return 1;
      return ta.localeCompare(tb);
    });
  }

  if (authLoading) return <div className="spinner" style={{ marginTop: '4rem' }} />;
  if (!isVolunteer || !user) return null;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.25rem' }}>Help Queue</h1>
          <p>Hey {profile?.displayName || user.displayName}! Pick a student to help today.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
          {['all', 'favorites'].map((value) => (
            <button
              key={value}
              id={`filter-${value}-btn`}
              onClick={() => setFilter(value)}
              className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              {value === 'all' ? 'All' : 'Favs'}
            </button>
          ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 50,
              padding: '0.2rem 0.4rem',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0.2rem' }}>
              Sort:
            </span>
            {[
              { key: 'requested', label: 'Wait' },
              { key: 'needed', label: 'Needed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                id={`sort-${key}-btn`}
                onClick={() => setSortBy(key)}
                style={{
                  background: sortBy === key ? 'var(--primary)' : 'transparent',
                  color: sortBy === key ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 50,
                  padding: '0.2rem 0.6rem',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeSession && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            background: 'rgba(251,191,36,0.08)',
            borderColor: 'rgba(251,191,36,0.35)',
          }}
        >
          <h3 style={{ marginBottom: '0.75rem' }}>You already have an active session</h3>
          <p style={{ marginBottom: '1rem' }}>
            Resume or end it before taking a new request.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/session/${activeSession.id}`)}>
              Resume Session
            </button>
            <button className="btn btn-secondary" onClick={handleEndActive} disabled={endingId === activeSession.id}>
              {endingId === activeSession.id ? 'Ending...' : 'End Active Session'}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && displayed.length === 0 && (
        <div className="empty-state">
          <div className="emoji">{filter === 'favorites' ? '⭐' : '🎉'}</div>
          <h3>{filter === 'favorites' ? 'No favorite requests yet' : 'Queue is empty!'}</h3>
          <p>{filter === 'favorites' ? "Students haven't requested their favorites yet." : 'No students need help right now. Check back soon!'}</p>
        </div>
      )}

      {!loading && displayed.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {sortBy === 'requested'
            ? `Showing ${displayed.length} request${displayed.length !== 1 ? 's' : ''} - oldest first (waiting longest)`
            : `Showing ${displayed.length} request${displayed.length !== 1 ? 's' : ''} - sorted by when help is needed`}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {displayed.map((request) => (
          <RequestCard key={request.id} request={request} onAccept={handleAccept} favorites={favorites} />
        ))}
      </div>

      {profile && (
        <div className="card" style={{ marginTop: '3rem', background: 'rgba(108,99,255,0.07)', borderColor: 'rgba(108,99,255,0.2)' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="stat-box">
              <div className="stat-value">{profile.totalSessions ?? 0}</div>
              <div className="stat-label">Sessions Helped</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{profile.totalMinutes ?? 0}</div>
              <div className="stat-label">Minutes Given</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{queue.length}</div>
              <div className="stat-label">Waiting Now</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
