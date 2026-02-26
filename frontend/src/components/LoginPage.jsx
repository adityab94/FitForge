import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loginWithPassword, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password required'); return; }
    if (mode === 'register' && !name) { setError('Name required'); return; }
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password, name);
      } else {
        await loginWithPassword(email, password);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || (mode === 'register' ? 'Registration failed' : 'Invalid email or password');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#16232A' }} data-testid="login-page">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8 anim-slide-up" style={{ background: 'rgba(228,238,240,0.05)', borderColor: 'rgba(228,238,240,0.1)' }}>
          <div className="text-center mb-6">
            <img
              src="https://customer-assets.emergentagent.com/job_fittrack-pro-64/artifacts/czi1f9en_Fit%20%281%29.png"
              alt="FitForge"
              className="w-16 h-16 mx-auto mb-3 object-cover rounded-full"
              data-testid="login-logo-image"
            />
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#FF5B04' }} data-testid="login-logo">
              FitForge
            </h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(228,238,240,0.4)' }}>
              Premium fitness tracking dashboard
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(228,238,240,0.05)' }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{ background: mode === m ? '#FF5B04' : 'transparent', color: mode === m ? '#fff' : 'rgba(228,238,240,0.5)' }}
                data-testid={`auth-mode-${m}`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin" style={{ color: '#FF5B04' }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3" data-testid="auth-form">
              {mode === 'register' && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Full Name</label>
                  <input
                    type="text"
                    className="input-dark w-full"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    data-testid="auth-name-input"
                  />
                </div>
              )}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Email</label>
                <input
                  type="email"
                  className="input-dark w-full"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  data-testid="auth-email-input"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-dark w-full pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    data-testid="auth-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(228,238,240,0.4)' }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-400" data-testid="auth-error">{error}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#FF5B04' }}
                data-testid="auth-submit-btn"
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(228,238,240,0.08)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.3)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(228,238,240,0.08)' }} />
          </div>

          <div className="flex justify-center" data-testid="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google login failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              text="continue_with"
              width="300"
            />
          </div>

          <p className="text-xs text-center mt-6" style={{ color: 'rgba(228,238,240,0.2)' }}>
            Track your fitness journey with precision
          </p>
        </div>
      </div>
    </div>
  );
}
