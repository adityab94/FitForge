import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { loginWithPin } = useAuth();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[idx] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newPin.every(d => d !== '') && newPin.join('').length === 6) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newPin = pasted.split('');
      setPin(newPin);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (enteredPin) => {
    setLoading(true);
    try {
      await loginWithPin(enteredPin);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Incorrect PIN');
      setPin(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #FFFBF5 0%, #FFF5EB 40%, #FFEEDC 100%)' }} data-testid="login-page">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8 anim-slide-up" style={{ background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(199,82,42,0.15)' }}>
          <div className="text-center mb-8">
            <img
              src="https://customer-assets.emergentagent.com/job_fittrack-pro-64/artifacts/czi1f9en_Fit%20%281%29.png"
              alt="FitForge"
              className="w-20 h-20 mx-auto mb-4 object-cover rounded-full"
              data-testid="login-logo-image"
            />
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#C7522A' }} data-testid="login-logo">
              FitForge
            </h1>
            <p className="text-xs mt-2" style={{ color: 'rgba(61,31,10,0.55)' }}>
              Enter your PIN to continue
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={28} className="animate-spin" style={{ color: '#C7522A' }} />
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => inputRefs.current[idx] = el}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(idx, e.target.value)}
                    onKeyDown={e => handleKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-2xl font-bold rounded-xl transition-all focus:outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.55)',
                      border: `1.5px solid ${error ? '#ef4444' : digit ? '#C7522A' : 'rgba(199,82,42,0.15)'}`,
                      color: '#3D1F0A',
                      fontFamily: 'Outfit, sans-serif'
                    }}
                    data-testid={`pin-input-${idx}`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-center text-red-400 mb-2" data-testid="pin-error">
                  {error}
                </p>
              )}
            </>
          )}

          <p className="text-xs text-center mt-6 italic" style={{ color: 'rgba(61,31,10,0.35)' }} data-testid="pin-hint">
            Hint: Birth is important
          </p>
          <p className="text-xs text-center mt-2" style={{ color: 'rgba(61,31,10,0.35)' }}>
            Track your fitness journey with precision
          </p>
        </div>
      </div>
    </div>
  );
}
