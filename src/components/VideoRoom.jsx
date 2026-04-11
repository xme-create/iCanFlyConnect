import React from 'react';

const VideoRoom = ({ roomUrl, name }) => {
  if (!roomUrl || roomUrl.includes('REPLACE_ME') || roomUrl.includes('icanflyconnect.daily.co')) {
    // Placeholder before Daily.co is set up
    return (
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          gap: '1rem',
          textAlign: 'center',
          background: 'rgba(108,99,255,0.06)',
          borderColor: 'rgba(108,99,255,0.2)',
        }}
      >
        <div style={{ fontSize: '3.5rem' }}>🎥</div>
        <h3>Video & Voice</h3>
        <p style={{ maxWidth: 280 }}>
          Video/voice calling is powered by Daily.co. Once your Daily.co domain is configured,
          the call will appear here automatically.
        </p>
        <a
          href="https://daily.co"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Learn about Daily.co →
        </a>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', minHeight: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <iframe
        src={`${roomUrl}?userName=${encodeURIComponent(name || 'Guest')}`}
        allow="camera; microphone; fullscreen; speaker; display-capture"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Video Call Room"
      />
    </div>
  );
};

export default VideoRoom;
