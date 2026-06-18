import React, { useState } from 'react';
import api from './api';
import { setStoredAuth } from './api';
import './App.css';

/**
 * Before login: short, formal, access-restricted.
 * Only ask for USERNAME and PASSWORD. Do not answer other questions or provide help.
 */
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegisterSuccess('');
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError('Username and password are required.');
      return;
    }
    if (mode === 'register') {
      if (p !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/auth/register', { username: u, password: p });
        if (res.status === 201) {
          setRegisterSuccess('Account created. You may sign in.');
          setPassword('');
          setConfirmPassword('');
          setMode('login');
        }
      } catch (err) {
        let msg = 'Registration failed.';
        if (err.response && err.response.data && typeof err.response.data.message === 'string') {
          msg = err.response.data.message;
        } else if (!err.response) {
          msg = 'Registration failed. Make sure the backend is running (npm start in the mental-health-prediction folder on port 5000) and try again.';
        } else {
          msg = 'Registration failed. Please try again.';
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username: u, password: p });
      if (res.data && res.data.token && res.data.username) {
        setStoredAuth(res.data.token, res.data.username);
        onLogin(res.data.username);
      }
    } catch (err) {
      let msg = 'Invalid credentials. Please try again.';
      if (err.response && err.response.data && typeof err.response.data.message === 'string') {
        msg = err.response.data.message;
      } else if (!err.response) {
        msg = 'Sign in failed. Make sure the backend is running (port 5000) and try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Authentication required</h1>
        <p className="auth-subtitle">Please enter your credentials.</p>
        {registerSuccess && (
          <p className="auth-success" role="status">{registerSuccess}</p>
        )}
        {error && (
          <p className="auth-error" role="alert">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="auth-username" className="auth-label">Username</label>
          <input
            id="auth-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            placeholder="Username"
            disabled={loading}
          />
          <label htmlFor="auth-password" className="auth-label">Password</label>
          <div className="auth-password-wrap">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input auth-input-with-toggle"
              placeholder="Password"
              disabled={loading}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="auth-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="auth-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {mode === 'register' && (
            <>
              <label htmlFor="auth-confirm" className="auth-label">Confirm password</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input auth-input-with-toggle"
                  placeholder="Confirm password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="auth-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="auth-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          className="auth-link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setRegisterSuccess('');
            setShowPassword(false);
            setShowConfirmPassword(false);
          }}
        >
          {mode === 'login' ? 'Create account' : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
}

export default AuthScreen;
