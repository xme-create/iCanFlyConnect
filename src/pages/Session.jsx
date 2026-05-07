import React, { useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addFavorite, isFavorite, removeFavorite } from '../firebase/favorites';
import { revertRequestBySessionId } from '../firebase/requests';
import { endSession, listenToSession, markStudentJoined } from '../firebase/sessions';
import ChatRoom from '../components/ChatRoom';
import SessionTimer from '../components/SessionTimer';
import VideoRoom from '../components/VideoRoom';

const Session = () => {
  const { sessionId } = useParams();
  const { user, profile, loading: authLoading, isVolunteer } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [isFav, setIsFav] = useState(false);
  const [startMs, setStartMs] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  const endNoticeShownRef = useRef(false);
  const redirectTimeoutRef = useRef(null);
  const leaveAfterEndingRef = useRef(false);
  const hasActiveSession = !loading && session?.status === 'active' && !!startMs;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useBeforeUnload((event) => {
    if (!hasActiveSession) return;
    event.preventDefault();
    event.returnValue = '';
  });

  useEffect(() => {
    endNoticeShownRef.current = false;
    leaveAfterEndingRef.current = false;
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

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
      if (data.startTime?.seconds) {
        setStartMs((prev) => prev ?? data.startTime.seconds * 1000);
      }
      setLoading(false);

      if (data.status === 'ended' && !endNoticeShownRef.current) {
        endNoticeShownRef.current = true;
        toast('Session finished! You did great today.', 'info');

        if (!leaveAfterEndingRef.current) {
          redirectTimeoutRef.current = setTimeout(() => {
            navigate(isVolunteer ? '/history' : '/');
          }, 3000);
        }
      }
    });

    return () => {
      unsub();
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [sessionId, navigate, isVolunteer, toast]);

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
      toast('Saved your favorite helper!', 'success');
    }
  };

  const handleEndSessionClick = async () => {
    if (!window.confirm('Do you want to permanently end this session?')) {
      return;
    }

    try {
      await endSession(sessionId, startMs || Date.now(), Boolean(session?.extended));
    } catch (error) {
      console.error('Could not end session:', error);
    }
  };

  const handleSessionEnd = () => {};

  if (loading || authLoading) {
    return <div className="spinner" style={{ marginTop: '4rem' }} />;
  }

  if (!session) {
    return (
      <div className="page">
        <p>Session not found.</p>
      </div>
    );
  }

  const myName = isVolunteer
    ? (profile?.displayName || user?.displayName || 'Volunteer')
    : session.studentNickname;
  const myRole = isVolunteer ? 'volunteer' : 'student';

  return (
    <div
      style={{
        padding: isMobile ? '0.4rem' : '1rem',
        maxWidth: '1400px',
        margin: '0 auto',
        height: isMobile ? 'calc(100vh - 80px)' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="card"
        style={{
          marginBottom: isMobile ? '0.4rem' : '1.25rem',
          padding: isMobile ? '0.75rem 0.85rem' : '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '0.6rem' : '1rem',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {!isMobile && (
          <div
            className="icon-pill"
            style={{
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.3)',
              fontSize: '1.5rem',
              width: 50,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🤝
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.4rem', lineHeight: 1.2 }}>
              {isVolunteer ? `Helping ${session.studentNickname}` : `Sharing with ${session.volunteerName}`}
            </h2>
            <span className="badge badge-active" style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', padding: isMobile ? '0.15rem 0.5rem' : '0.2rem 0.6rem' }}>
              Live Ahora
            </span>
            {isVolunteer && session.studentJoined && (
              <span
                className="badge"
                style={{
                  background: 'rgba(255, 107, 174, 0.15)',
                  color: 'var(--secondary)',
                  border: '1px solid rgba(255, 107, 174, 0.3)',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: isMobile ? '0.15rem 0.5rem' : '0.2rem 0.6rem',
                }}
              >
                Student Arrived!
              </span>
            )}
          </div>
          {isMobile ? (
            <p
              style={{
                margin: '0.2rem 0 0',
                fontSize: '0.83rem',
                color: 'var(--text-muted)',
                lineHeight: 1.35,
              }}
            >
              {session.topic}
            </p>
          ) : (
            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
              {session.topic}
            </p>
          )}
        </div>

        {!isVolunteer && !isMobile && (
          <button
            id="favorite-btn"
            className={`btn ${isFav ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleFav}
            style={{ padding: '0.6rem 1.2rem', borderRadius: 50, fontWeight: 700 }}
          >
            {isFav ? 'Friend Saved' : 'Save Friend'}
          </button>
        )}

      </div>

      <div
        className="session-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
          gap: '1.25rem',
          alignItems: 'start',
          flex: 1,
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginBottom: isMobile ? '0.4rem' : '0.5rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--radius-md)',
              padding: isMobile ? '3px' : '4px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'video', label: 'Video' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: '1 1 120px',
                  padding: isMobile ? '0.42rem 0.45rem' : '0.5rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.85rem' : '0.9rem',
                  border: 'none',
                  fontFamily: 'var(--font)',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-btn)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: isMobile ? '0' : '400px',
              maxHeight: isMobile ? 'calc(100vh - 180px)' : activeTab === 'video' ? '560px' : '620px',
            }}
          >
            {activeTab === 'video' ? (
              <div style={{ height: '100%', minHeight: '300px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <VideoRoom roomUrl={session.dailyRoomUrl} name={myName} />
              </div>
            ) : (
              <ChatRoom sessionId={sessionId} myName={myName} myRole={myRole} />
            )}
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem', background: 'rgba(10,9,24,0.6)' }}>
              <h3 style={{ marginBottom: '1.25rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800 }}>
                {isVolunteer ? 'Time Management' : 'Sharing Time'}
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
                        await endSession(sessionId, startMs || Date.now(), Boolean(session.extended));
                      } catch (error) {
                        console.error('Could not end session:', error);
                      }
                    }
                  }}
                >
                  End Session
                </button>
              )}
            </div>

            <div className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>TIPS</h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <li>Use the mic button to speak your messages.</li>
                <li>Share schoolwork using the paperclip.</li>
                <li>Switch to Video for a face-to-face chat.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {isMobile && startMs && (
        <div
          className="card"
          style={{
            marginTop: '0.4rem',
            padding: '0.7rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            background: 'rgba(10,9,24,0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <SessionTimer
            sessionId={sessionId}
            startTimeMs={startMs}
            isVolunteer={isVolunteer}
            onEnd={handleSessionEnd}
          />

          {!isVolunteer && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleEndSessionClick}
            >
              End Session
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Session;
