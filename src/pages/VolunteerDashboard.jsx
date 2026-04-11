import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listenToQueue, acceptRequest, getRequest } from '../firebase/requests';
import { createSession } from '../firebase/sessions';
import { useToast } from '../context/ToastContext';
import RequestCard from '../components/RequestCard';
import { getFavorites } from '../firebase/favorites';

const VolunteerDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');      // 'all' | 'favorites'
  const [sortBy, setSortBy] = useState('requested'); // 'requested' | 'needed'

  useEffect(() => {
    if (!user) { navigate('/volunteer'); return; }
    const unsub = listenToQueue((requests) => {
      setQueue(requests);
      setLoading(false);
    });
    getFavorites().then(setFavorites);
    return unsub;
  }, [user]);

  const handleAccept = async (requestId) => {
    const req = queue.find((r) => r.id === requestId);
    if (!req) return;
    try {
      // Re-fetch request to ensure it is still pending
      const latestReq = await getRequest(requestId);
      if (!latestReq || latestReq.status !== 'pending') {
        toast('This request was already taken! 🦋', 'info');
        return;
      }

      const { sessionId } = await createSession({
        requestId,
        volunteerId: user.uid,
        volunteerName: profile?.displayName || user.displayName || 'Volunteer',
        studentNickname: req.nickname,
        topic: req.topic,
      });
      await acceptRequest(requestId, {
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || 'Volunteer',
      }, sessionId);
      toast('Session started! Get ready to help 🚀', 'success');
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
      toast('Could not accept request. Please try again.', 'error');
    }
  };

  // Filter
  let displayed = filter === 'favorites'
    ? queue.filter((r) => r.volunteerId && favorites.includes(r.volunteerId))
    : [...queue];

  // Sort
  if (sortBy === 'requested') {
    // Oldest first — who's been waiting longest
    displayed.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  } else {
    // Sort by "when do you need help" text — alphabetical as a best-effort
    // ASAP / tonight / tomorrow etc. — put 'ASAP' first naively
    displayed.sort((a, b) => {
      const ta = (a.timing || '').toLowerCase();
      const tb = (b.timing || '').toLowerCase();
      const asap = (s) => s.includes('asap') || s.includes('now') || s.includes('urgent');
      if (asap(ta) && !asap(tb)) return -1;
      if (!asap(ta) && asap(tb)) return 1;
      return ta.localeCompare(tb);
    });
  }

  if (!user) return null;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.25rem' }}>
            Help Queue
          </h1>
          <p>Hey {profile?.displayName || user.displayName}! 👋 Pick a student to help today.</p>
        </div>

        {/* Filter + Sort controls */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
          {/* Filter */}
          {['all', 'favorites'].map((f) => (
            <button
              key={f}
              id={`filter-${f}-btn`}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              {f === 'all' ? '📋 All' : '⭐ Favs'}
            </button>
          ))}

          {/* Sort */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.2rem',
            background: 'rgba(255,255,255,0.04)', borderRadius: 50,
            padding: '0.2rem 0.4rem', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0.2rem' }}>Sort:</span>
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
                  border: 'none', borderRadius: 50, padding: '0.2rem 0.6rem',
                  fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                  fontFamily: 'var(--font)', transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>


      {loading && <div className="spinner" />}

      {!loading && displayed.length === 0 && (
        <div className="empty-state">
          <div className="emoji">{filter === 'favorites' ? '⭐' : '🎉'}</div>
          <h3>{filter === 'favorites' ? 'No favorite requests yet' : 'Queue is empty!'}</h3>
          <p>{filter === 'favorites' ? "Students haven't requested their favorites yet." : 'No students need help right now. Check back soon!'}</p>
        </div>
      )}

      {/* Sort info banner when results exist */}
      {!loading && displayed.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {sortBy === 'requested'
            ? `Showing ${displayed.length} request${displayed.length !== 1 ? 's' : ''} — oldest first (waiting longest)`
            : `Showing ${displayed.length} request${displayed.length !== 1 ? 's' : ''} — sorted by when help is needed`}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {displayed.map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            onAccept={handleAccept}
            favorites={favorites}
          />
        ))}
      </div>

      {/* Volunteer stats moved to bottom */}
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
