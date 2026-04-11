import React, { useEffect, useRef, useState, useCallback } from 'react';
import { extendSession, endSession } from '../firebase/sessions';
import { useToast } from '../context/ToastContext';

const SESSION_MINUTES = 20;
const WARN_AT_SECONDS = 5 * 60; // 5 min remaining

const SessionTimer = ({ sessionId, startTimeMs, isVolunteer, onEnd }) => {
  const toast = useToast();
  const totalSeconds = SESSION_MINUTES * 60;
  
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [phase, setPhase] = useState(1); // 1 = first block, 2 = extension
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const [extending, setExtending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [warned, setWarned] = useState(false);
  
  const intervalRef = useRef(null);
  const startRef = useRef(startTimeMs || Date.now());

  const tick = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    const maxSeconds = phase === 1 ? totalSeconds : totalSeconds * 2;
    const remaining = maxSeconds - elapsed;

    // Trigger volunteer warning at 5 min
    if (isVolunteer && !warned && remaining <= WARN_AT_SECONDS && remaining > 0) {
      toast('5 minutes remaining in this session ⏰', 'info');
      setWarned(true);
    }

    if (remaining <= 0) {
      setSecondsLeft(0);
      clearInterval(intervalRef.current);
      if (phase === 1) {
        setShowExtendPrompt(true);
      } else {
        handleEnd();
      }
    } else {
      setSecondsLeft(remaining);
    }
  }, [phase, totalSeconds, isVolunteer, warned, toast]);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [tick]);

  const handleExtend = async () => {
    setExtending(true);
    await extendSession(sessionId);
    setPhase(2);
    setWarned(false); // Reset warning for extension
    setShowExtendPrompt(false);
    setSecondsLeft(totalSeconds);
    startRef.current = Date.now(); 
    setExtending(false);
    intervalRef.current = setInterval(tick, 1000);
  };

  const handleEnd = async () => {
    setEnding(true);
    clearInterval(intervalRef.current);
    setShowExtendPrompt(false);
    const duration = await endSession(sessionId, startRef.current, phase === 2);
    if (onEnd) onEnd(duration);
  };

  // Progress percentage (only used for volunteer UI)
  const pct = Math.max(0, (secondsLeft / totalSeconds) * 100);
  const barColor = secondsLeft <= 60 ? 'var(--danger)' : secondsLeft <= WARN_AT_SECONDS ? 'var(--warning)' : 'var(--primary)';

  return (
    <div className="session-timer">
      {/* Student View: No numbers, just a calm message */}
      {!isVolunteer && !showExtendPrompt && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div className="calm-indicator" style={{ 
            fontSize: '3rem', marginBottom: '0.5rem',
            animation: 'pulse 3s infinite ease-in-out' 
          }}>
            💖
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sharing moments...</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enjoying the conversation ✨</p>
        </div>
      )}

      {/* Volunteer View: Subtle numberless progress */}
      {isVolunteer && !showExtendPrompt && (
        <div style={{ textAlign: 'center' }}>
          <div className="timer-bar-wrap" style={{ height: 6, margin: '1.5rem 0' }}>
            <div className="timer-bar" style={{ 
              width: `${pct}%`, 
              background: barColor,
              transition: 'width 1s linear, background 0.5s' 
            }} />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {phase === 1 ? 'Session in progress...' : '⚡ Extension active'}
          </p>
        </div>
      )}

      {/* Both: Positive wrap-up prompt */}
      {showExtendPrompt && (
        <div className="card" style={{ 
          background: 'rgba(108,99,255,0.08)', 
          borderColor: 'var(--primary)', 
          marginBottom: '1rem',
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <p style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            What a great session! Would you like to stay a few more minutes to wrap things up?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleExtend} disabled={extending}>
              {extending ? 'Adding time...' : '⚡ A bit more time'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleEnd} disabled={ending}>
              {ending ? 'Ending...' : '⏹ Finish session'}
            </button>
          </div>
        </div>
      )}

      {/* Volunteer always has the quick end button if not in prompt mode */}
      {!showExtendPrompt && isVolunteer && (
        <button
          className="btn btn-danger btn-sm"
          onClick={handleEnd}
          disabled={ending}
          id="end-session-btn"
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {ending ? 'Ending…' : '⏹ End Session'}
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SessionTimer;
