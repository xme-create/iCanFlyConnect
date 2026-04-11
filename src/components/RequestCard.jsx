import React, { useState } from 'react';
import { addFavorite, removeFavorite } from '../firebase/favorites';

const RequestCard = ({ request, onAccept, favorites = [], onFavToggle }) => {
  const [accepting, setAccepting] = useState(false);

  const isFav = favorites.includes(request.volunteerId);

  const handleAccept = async () => {
    setAccepting(true);
    await onAccept(request.id);
    setAccepting(false);
  };

  const timeAgo = (ts) => {
    if (!ts?.seconds) return 'just now';
    const diff = Date.now() - ts.seconds * 1000;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="card interactive" id={`request-${request.id}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div className="icon-pill">📚</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ margin: 0 }}>{request.nickname}</h3>
            <span className={`badge badge-${request.status}`}>{request.status}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Requested {timeAgo(request.createdAt)}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>💬</span>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {request.topic}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem' }}>🕐</span>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {request.timing}
          </p>
        </div>
      </div>

      {request.status === 'pending' && onAccept && (
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAccept}
          disabled={accepting}
          id={`accept-btn-${request.id}`}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {accepting ? '✨ Accepting…' : '🤝 Accept & Help'}
        </button>
      )}
    </div>
  );
};

export default RequestCard;
