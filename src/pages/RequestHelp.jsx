import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  submitHelpRequest,
  getStudentToken,
  listenToMyActiveRequests,
  deleteRequest,
  updateRequest,
  unmatchRequest,
} from '../firebase/requests';
import { useToast } from '../context/ToastContext';

const HELP_EXAMPLES = [
  'Help with a school project',
  'Step-by-step math help',
  'Practicing a new skill',
  'Read a story together',
  'Help understanding instructions',
];

const FUN_NICKNAMES = [
  'Blue Panda',
  'Happy Tiger',
  'Flying Squirrel',
  'Clever Owl',
  'Brave Lion',
  'Swift Fox',
  'Calm Turtle',
  'Joyful Dolphin',
];

const RequestHelp = () => {
  const [form, setForm] = useState({
    nickname: FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)],
    topic: '',
    timing: 'Right now',
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [checking, setChecking] = useState(true);
  const matchedBannerRef = useRef(null);
  const previousMatchedIdRef = useRef(null);

  const toast = useToast();
  const token = getStudentToken();

  useEffect(() => {
    const unsub = listenToMyActiveRequests(token, (reqs) => {
      setActiveRequests(reqs);
      setChecking(false);

      if (editingId && !reqs.find((request) => request.id === editingId && request.status === 'pending')) {
        setEditingId(null);
        setForm((prev) => ({ ...prev, topic: '', timing: 'Right now' }));
      }
    });

    return unsub;
  }, [token, editingId]);

  const matchedRequest = activeRequests.find((request) => request.status === 'matched');
  const pendingRequests = activeRequests.filter((request) => request.status === 'pending');
  const hasLiveSession = Boolean(matchedRequest);

  useEffect(() => {
    if (!matchedRequest?.id) {
      previousMatchedIdRef.current = null;
      return;
    }

    if (previousMatchedIdRef.current !== matchedRequest.id) {
      previousMatchedIdRef.current = matchedRequest.id;
      matchedBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [matchedRequest]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleExample = (example) => {
    setForm((prev) => ({ ...prev, topic: example }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nickname.trim() || !form.topic.trim() || !form.timing.trim()) {
      toast('Please fill in all fields.', 'error');
      return;
    }

    if (hasLiveSession) {
      toast('You already have a live session. Please finish that one first.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateRequest(editingId, form.topic, form.timing);
        toast('Request updated.', 'success');
        setEditingId(null);
      } else {
        await submitHelpRequest(form);
        toast('Request sent. We are finding a volunteer now.', 'success');
      }
      setForm((prev) => ({ ...prev, topic: '', timing: 'Right now' }));
    } catch (error) {
      console.error('Failed to submit help request:', error);
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setForm((prev) => ({ ...prev, topic: '', timing: 'Right now' }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;

    try {
      await deleteRequest(id);
      toast('Request cancelled.', 'info');
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast('Could not cancel request. Try again later.', 'error');
    }
  };

  const handleEdit = (request) => {
    setEditingId(request.id);
    setForm({
      nickname: request.nickname,
      topic: request.topic,
      timing: request.timing,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (checking) {
    return <div className="spinner" style={{ marginTop: '4rem' }} />;
  }

  return (
    <div className="page" style={{ maxWidth: 640, margin: '0 auto', paddingTop: '1rem', paddingBottom: '1.25rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)' }}>
            {editingId ? 'Edit Your Request' : 'Request Help'}
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Anonymous and no account needed
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
          Tell us what you need and a real volunteer can join shortly.
        </p>
      </div>

      {matchedRequest && (
        <div
          ref={matchedBannerRef}
          className="card"
          style={{
            marginBottom: '1rem',
            textAlign: 'center',
            padding: '1.25rem',
            background: 'rgba(74,222,128,0.1)',
            borderColor: 'var(--success)',
            boxShadow: '0 0 20px rgba(74,222,128,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.4rem', color: 'var(--success)' }}>Your Session Is Ready</h2>
          <p style={{ marginBottom: '1rem' }}>
            <strong>{matchedRequest.volunteerName}</strong> is waiting for you.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={`/session/${matchedRequest.sessionId}`}
              className="btn btn-primary"
              style={{ flex: 1, minWidth: '190px', justifyContent: 'center' }}
            >
              Join Session
            </Link>
            <button
              onClick={async () => {
                try {
                  await unmatchRequest(matchedRequest.id);
                  toast('Request re-queued.', 'success');
                } catch (error) {
                  console.error('Failed to unmatch request:', error);
                  toast('Could not re-queue request.', 'error');
                }
              }}
              className="btn btn-secondary"
            >
              Cancel Match
            </button>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: '1.35rem',
          opacity: hasLiveSession ? 0.6 : 1,
          pointerEvents: hasLiveSession ? 'none' : 'auto',
          borderColor: editingId ? 'var(--primary)' : 'var(--border)',
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            {!editingId && (
              <>
                <label>Quick ideas</label>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                  {HELP_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleExample(example)}
                      className={`btn ${form.topic === example ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ borderRadius: 999, fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label htmlFor="topic">What do you need help with?</label>
            <textarea
              id="topic"
              name="topic"
              placeholder="I need help with..."
              value={form.topic}
              onChange={handleChange}
              rows={2}
              maxLength={300}
              required
              style={{ resize: 'vertical', minHeight: 88, padding: '0.85rem 1rem', fontSize: '1rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>When do you want to start?</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Right now', 'Later today'].map((timing) => (
                <button
                  key={timing}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, timing }))}
                  className={`btn ${form.timing === timing ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 999, padding: '0.55rem 0.9rem' }}
                >
                  {timing}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, timing: '' }))}
                className={`btn ${!['Right now', 'Later today'].includes(form.timing) ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 999, padding: '0.55rem 0.9rem' }}
              >
                Pick a time
              </button>
            </div>
            {!['Right now', 'Later today'].includes(form.timing) && (
              <input
                id="timing"
                name="timing"
                type="text"
                placeholder="Type a specific time"
                value={form.timing}
                onChange={handleChange}
                maxLength={80}
                required
                autoComplete="off"
                style={{ padding: '0.85rem 1rem', fontSize: '1rem', marginTop: '0.5rem' }}
              />
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="nickname">Your Nickname</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="Your nickname"
              value={form.nickname}
              onChange={handleChange}
              maxLength={30}
              required
              autoComplete="off"
              disabled={editingId !== null}
              style={{ padding: '0.85rem 1rem', fontSize: '1rem', opacity: editingId ? 0.6 : 1 }}
            />
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.85rem',
                textAlign: 'center',
              }}
            >
              We will connect you with a volunteer and you can leave anytime.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || hasLiveSession}
                id="submit-request-btn"
                style={{ flex: 1, justifyContent: 'center', fontSize: '1.05rem', padding: '1rem 1.1rem', minWidth: 220 }}
              >
                {hasLiveSession
                  ? 'Finish current session first'
                  : editingId
                    ? (submitting ? 'Updating...' : 'Save Changes')
                    : (submitting ? 'Connecting...' : 'Connect Me to a Volunteer')}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelClick}
                  style={{ fontSize: '1rem', padding: '1rem 1.1rem' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.85rem', color: 'var(--text-secondary)' }}>
            Waiting Requests ({pendingRequests.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="card"
                style={{
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  flexWrap: 'wrap',
                  background: request.id === editingId ? 'rgba(108,99,255,0.05)' : 'rgba(255,255,255,0.02)',
                  borderColor: request.id === editingId ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{request.topic}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{request.timing}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEdit(request)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    disabled={hasLiveSession}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(request.id)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)' }}
                    disabled={hasLiveSession}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestHelp;
