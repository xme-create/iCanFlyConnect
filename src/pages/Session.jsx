import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listenToSession, markStudentJoined, endSession } from '../firebase/sessions';
import { getStudentToken, revertRequestBySessionId } from '../firebase/requests';
import { addFavorite, removeFavorite, isFavorite } from '../firebase/favorites';
import { useToast } from '../context/ToastContext';
import ChatRoom from '../components/ChatRoom';
import VideoRoom from '../components/VideoRoom';
import SessionTimer from '../components/SessionTimer';

const Session = () => {
  const { sessionId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' is now default
  const [isFav, setIsFav] = useState(false);
  const [startMs, setStartMs] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  const isVolunteer = !!user;
  const studentToken = getStudentToken();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsub = listenToSession(sessionId, async (data) => {
      if (!data) {
        if (!isVolunteer) {
          toast('The volunteer was unavailable. Your request is back in the queue!', 'info');
          await revertRequestBySessionId(sessionId);
        } else {
          toast('Sorry, that session is no longer available.', 'warning');
        }
        navigate(isVolunteer ? '/dashboard' : '/');
        return;
      }

      setSession(data);
      if (!startMs && data.startTime?.seconds) {
        setStartMs(data.startTime.seconds * 1000);
      }
      setLoading(false);

      if (data.status === 'ended') {
        toast('Session finished! You did great today. 💙', 'info');
        setTimeout(() => navigate(isVolunteer ? '/dashboard' : '/'), 3000);
      }
    });
    return unsub;
  }, [sessionId, navigate, isVolunteer, startMs, toast]);

  // Mark student as joined when they view the page
  useEffect(() => {
    if (!isVolunteer && !loading && session) {
      markStudentJoined(sessionId);
    }
  }, [isVolunteer, loading, session, sessionId]);

  useEffect(() => {
    if (session?.volunteerId) {
      isFavorite(session.volunteerId).then(setIsFav);
    }
  }, [session]);

  const toggleFav = async () => {
    if (!session?.volunteerId) return;
    if (isFav) {
      await removeFavorite(session.volunteerId);
      setIsFav(false);
      toast('Removed from favorites', 'info');
    } else {
      await addFavorite(session.volunteerId);
      setIsFav(true);
      toast('Saved your favorite helper! ⭐', 'success');
    }
  };

  const handleSessionEnd = (durationMinutes) => {
    toast(`All done! ${durationMinutes} minutes of sharing. 💙`, 'success');
    setTimeout(() => navigate(isVolunteer ? '/history' : '/'), 3000);
  };

  if (loading) return <div className="spinner" style={{ marginTop: '4rem' }} />;
  if (!session) return <div className="page"><p>Session not found.</p></div>;

  const myName = isVolunteer
    ? (profile?.displayName || user?.displayName || 'Volunteer')
    : session.studentNickname;
  const myRole = isVolunteer ? 'volunteer' : 'student';

  return (
    <div style={{ padding: isMobile ? '0.5rem' : '1rem', maxWidth: '1400px', margin: '0 auto', height: isMobile ? 'calc(100vh - 80px)' : 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Session header */}
      <div className="card" style={{
        marginBottom: isMobile ? '0.5rem' : '1.25rem', padding: isMobile ? '1rem' : '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {!isMobile && (
          <div className="icon-pill" style={{ 
            background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
            fontSize: '1.5rem', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>🤝</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem' }}>
              {isVolunteer ? `Helping ${session.studentNickname}` : `Sharing with ${session.volunteerName}`}
            </h2>
            <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>Live Ahora</span>
            {isVolunteer && session.studentJoined && (
              <span className="badge" style={{ background: 'rgba(255, 107, 174, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(255, 107, 174, 0.3)', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                🎉 Student Arrived!
              </span>
            )}
          </div>
          {!isMobile && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
               {session.topic}
            </p>
          )}
        </div>

        {/* Favorite button (only for student) */}
        {!isVolunteer && !isMobile && (
          <button
            id="favorite-btn"
            className={`btn ${isFav ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleFav}
            style={{ padding: '0.6rem 1.2rem', borderRadius: 50, fontWeight: 700 }}
          >
            {isFav ? '⭐ Friend Saved' : '💖 Save Friend'}
          </button>
        )}

        {/* Mobile controls inside header */}
        {isMobile && startMs && (
          <div style={{ width: '100%', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <SessionTimer
              sessionId={sessionId}
              startTimeMs={startMs}
              isVolunteer={isVolunteer}
              onEnd={handleSessionEnd}
            />
            {!isVolunteer && (
              <button 
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
                onClick={async () => {
                  if (window.confirm('Do you want to permanently end this session?')) {
                    try {
                      await endSession(sessionId, startMs || Date.now(), false);
                      toast('Session finished! You did great today. 💙', 'info');
                      navigate('/');
                    } catch (e) {
                      console.error('Could not end session:', e);
                    }
                  }
                }}
              >
                👋 End Session
              </button>
            )}
          </div>
        )}
      </div>

      <div className="session-layout" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
        gap: '1.25rem',
        alignItems: 'start',
        flex: 1
      }}>
        {/* Main panel (Chat or Video based on tab) */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tab Switcher */}
          <div style={{
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '0.4rem', 
            marginBottom: '0.5rem',
            background: 'rgba(255,255,255,0.04)', 
            borderRadius: 'var(--radius-md)', 
            padding: '4px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {[
              { id: 'chat', label: '💬 Chat', emoji: '💬' },
              { id: 'video', label: '🎥 Video', emoji: '🎥' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: '1 1 120px', 
                  padding: '0.5rem 0.5rem', 
                  borderRadius: 'var(--radius-sm)', 
                  cursor: 'pointer',
                  fontWeight: 800, 
                  fontSize: '0.9rem', 
                  border: 'none', 
                  fontFamily: 'var(--font)',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-btn)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ 
            flex: 1, // Let it fill the remaining space
            minHeight: isMobile ? '0' : '400px',
            maxHeight: isMobile ? 'calc(100vh - 280px)' : (activeTab === 'video' ? '560px' : '620px')
          }}>
            {activeTab === 'video' ? (
              <div style={{ height: '100%', minHeight: '300px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <VideoRoom roomUrl={session.dailyRoomUrl} name={myName} />
              </div>
            ) : (
              <ChatRoom
                sessionId={sessionId}
                myName={myName}
                myRole={myRole}
              />
            )}
          </div>
        </div>

        {/* Sidebar (Timer + Auxiliary) on RIGHT (Desktop ONLY) */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem', background: 'rgba(10,9,24,0.6)' }}>
              <h3 style={{ marginBottom: '1.25rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800 }}>
                {isVolunteer ? '⏱️ Time Management' : '✨ Sharing Time'}
              </h3>
              {startMs && (
                <SessionTimer
                  sessionId={sessionId}
                  startTimeMs={startMs}
                  isVolunteer={isVolunteer}
                  onEnd={handleSessionEnd}
                />
              )}
              
              {!isVolunteer && (
                <button 
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center', opacity: 0.8 }}
                  onClick={async () => {
                    if (window.confirm('Do you want to permanently end this session?')) {
                      try {
                        await endSession(sessionId, startMs || Date.now(), false);
                        toast('Session finished! You did great today. 💙', 'info');
                        navigate('/');
                      } catch (e) {
                        console.error('Could not end session:', e);
                      }
                    }
                  }}
                >
                  👋 End Session
                </button>
              )}
            </div>

            <div className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>💡 TIPS</h4>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>🎤 Use the mic button to speak your messages.</li>
                <li>📎 Share schoolwork using the paperclip.</li>
                <li>🎥 Switch to Video for a face-to-face chat!</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Session;
