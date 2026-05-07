import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extendSession, endSession } from '../firebase/sessions';
import { useToast } from '../context/ToastContext';

const SESSION_MINUTES = 20;
const EXTENSION_MINUTES = 5;
const FIRST_PHASE_WARN_AT_SECONDS = 5 * 60;
const EXTENSION_WARN_AT_SECONDS = 60;

const SessionTimer = ({ sessionId, startTimeMs, isVolunteer, onEnd }) => {
  const toast = useToast();
  const baseSessionStartMs = useRef(startTimeMs || Date.now());
  const phaseStartRef = useRef(startTimeMs || Date.now());
  const intervalRef = useRef(null);

  const [phase, setPhase] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_MINUTES * 60);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const [extending, setExtending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [warned, setWarned] = useState(false);

  const phaseDurationSeconds = useMemo(
    () => (phase === 1 ? SESSION_MINUTES * 60 : EXTENSION_MINUTES * 60),
    [phase]
  );

  const phaseWarnAtSeconds = phase === 1 ? FIRST_PHASE_WARN_AT_SECONDS : EXTENSION_WARN_AT_SECONDS;

  const handleEnd = useCallback(async () => {
    setEnding(true);
    clearInterval(intervalRef.current);
    setShowExtendPrompt(false);
    const duration = await endSession(sessionId, baseSessionStartMs.current, phase === 2);
    if (onEnd) onEnd(duration);
  }, [onEnd, phase, sessionId]);

  const tick = useCallback(() => {
    const elapsed = Math.floor((Date.now() - phaseStartRef.current) / 1000);
    const remaining = phaseDurationSeconds - elapsed;

    if (isVolunteer && !warned && remaining <= phaseWarnAtSeconds && remaining > 0) {
      const message =
        phase === 1
          ? '5 minutes remaining in this session.'
          : '1 minute remaining in the extra time.';
      toast(message, 'info');
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
      return;
    }

    setSecondsLeft(remaining);
  }, [handleEnd, isVolunteer, phase, phaseDurationSeconds, phaseWarnAtSeconds, toast, warned]);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [tick]);

  const handleExtend = async () => {
    setExtending(true);
    await extendSession(sessionId);
    clearInterval(intervalRef.current);
    setPhase(2);
    setWarned(false);
    setShowExtendPrompt(false);
    setSecondsLeft(EXTENSION_MINUTES * 60);
    phaseStartRef.current = Date.now();
    setExtending(false);
    intervalRef.current = setInterval(tick, 1000);
  };

  const pct = Math.max(0, (secondsLeft / phaseDurationSeconds) * 100);
  const barColor =
    secondsLeft <= 60
      ? 'var(--danger)'
      : secondsLeft <= phaseWarnAtSeconds
        ? 'var(--warning)'
        : 'var(--primary)';

  return (
    <div className="session-timer">
      {isVolunteer && !showExtendPrompt && (
        <div style={{ textAlign: 'center' }}>
          <div className="timer-bar-wrap" style={{ height: 6, margin: '1rem 0 1.1rem' }}>
            <div
              className="timer-bar"
              style={{
                width: `${pct}%`,
                background: barColor,
                transition: 'width 1s linear, background 0.5s',
              }}
            />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
            {phase === 1 ? 'Session in progress...' : '5 extra minutes in progress...'}
          </p>
        </div>
      )}

      {showExtendPrompt && (
        <div
          className="card"
          style={{
            background: 'rgba(108,99,255,0.08)',
            borderColor: 'var(--primary)',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Wrap-up time</div>
          <p style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Would you like 5 more minutes to finish up?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={handleExtend} disabled={extending}>
              {extending ? 'Adding time...' : 'Add 5 more minutes'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleEnd} disabled={ending}>
              {ending ? 'Ending...' : 'Finish session'}
            </button>
          </div>
        </div>
      )}

      {!showExtendPrompt && isVolunteer && (
        <button
          className="btn btn-danger btn-sm"
          onClick={handleEnd}
          disabled={ending}
          id="end-session-btn"
          style={{ width: '100%', marginTop: '0.35rem' }}
        >
          {ending ? 'Ending...' : 'End Session'}
        </button>
      )}
    </div>
  );
};

export default SessionTimer;
