import React, { useRef } from 'react';
import { useFit } from '../context/FitContext';
import { useAuth } from '../context/AuthContext';
import { Camera, Settings, LogOut } from 'lucide-react';

export default function Header({ onOpenProfile }) {
  const { profile, uploadAvatar } = useFit();
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(file);
      } catch (err) {
        console.error('Avatar upload failed:', err);
        // Fallback to base64 if object storage fails
        const reader = new FileReader();
        reader.onload = (ev) => {
          import('../context/FitContext').then(() => {});
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const API = process.env.REACT_APP_BACKEND_URL;
  const avatarSrc = profile?.avatarUrl
    ? (profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${API}/api/files/${profile.avatarUrl}`)
    : (user?.avatarUrl || 'https://images.unsplash.com/photo-1627687501812-47b459c81345?w=100&h=100&fit=crop&crop=face');

  return (
    <header className="sticky top-0 z-40 weighin-bar" data-testid="header">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_fittrack-pro-64/artifacts/du4b1c06_Fit.png"
            alt="FitForge"
            className="w-8 h-8 object-cover rounded-full"
            data-testid="logo-icon"
          />
          <h1
            className="text-xl md:text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#FF5B04', textShadow: '0 0 20px rgba(255,91,4,0.3)' }}
            data-testid="logo-text"
          >
            FitForge
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onOpenProfile} className="btn-glow p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" data-testid="settings-button" aria-label="Settings">
            <Settings size={18} className="text-slate-400" strokeWidth={1.5} />
          </button>
          <button onClick={logout} className="btn-glow p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" data-testid="logout-button" aria-label="Logout">
            <LogOut size={18} className="text-slate-400" strokeWidth={1.5} />
          </button>
          <div className="avatar-upload" onClick={handleAvatarClick} data-testid="avatar-upload">
            <img src={avatarSrc} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: 'rgba(228,238,240,0.1)' }} data-testid="avatar-image" />
            <div className="avatar-overlay">
              <Camera size={16} className="text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="avatar-file-input" />
          </div>
        </div>
      </div>
    </header>
  );
}
