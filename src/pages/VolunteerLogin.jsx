import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginVolunteer, registerVolunteer, loginWithGoogle } from '../firebase/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const VolunteerLogin = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!form.name.trim()) { toast('Please enter your name.', 'error'); setLoading(false); return; }
        await registerVolunteer(form.email, form.password, form.name);
        toast('Account created! Welcome aboard 🎉', 'success');
      } else {
        await loginVolunteer(form.email, form.password);
        toast('Welcome back! 💙', 'success');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password.'
        : err.code === 'auth/email-already-in-use' ? 'Email already registered. Please log in.'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : 'Something went wrong. Please try again.';
      toast(msg, 'error');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast('Signed in with Google! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast('Google sign-in failed. Please try again.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💙</div>
        <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>
          {mode === 'login' ? 'Volunteer Login' : 'Join as Volunteer'}
        </h1>
        <p>{mode === 'login' ? 'Access your queue and help students soar.' : 'Create your free volunteer account.'}</p>
      </div>

      <div className="card">
        {/* Mode switcher */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: '1.5rem', gap: 4,
        }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              id={`mode-${m}-btn`}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 8,
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-secondary)',
                border: 'none', fontFamily: 'var(--font)',
                transition: 'all 0.2s',
              }}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="vol-name">Your Name</label>
              <input id="vol-name" name="name" type="text" placeholder="First name or nickname"
                value={form.name} onChange={handleChange} required autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="vol-email">Email</label>
            <input id="vol-email" name="email" type="email" placeholder="you@email.com"
              value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="vol-password">Password</label>
            <input id="vol-password" name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handleChange} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            id="auth-submit-btn"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', padding: '0.9rem' }}>
            {loading ? '✨ Please wait…' : mode === 'login' ? '→ Log In' : '🚀 Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</span>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleGoogle}
          disabled={loading}
          id="google-signin-btn"
          style={{ width: '100%', justifyContent: 'center', gap: '0.75rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Looking to get help?{' '}
        <Link to="/request" style={{ color: 'var(--primary-light)', fontWeight: 700 }}>
          Request help here →
        </Link>
      </p>
    </div>
  );
};

export default VolunteerLogin;
