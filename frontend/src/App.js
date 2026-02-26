import React, { useState } from 'react';
import '@/App.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FitProvider, useFit } from './context/FitContext';
import Header from './components/Header';
import HeroSummary from './components/HeroSummary';
import WeightChart from './components/WeightChart';
import DataCards from './components/DataCards';
import DateNav from './components/DateNav';
import SmartDayLogger from './components/SmartDayLogger';
import BodyComposition from './components/BodyComposition';
import WorkoutHeatmap from './components/WorkoutHeatmap';
import ProgressPhotos from './components/ProgressPhotos';
import Footer from './components/Footer';
import ProfileModal from './components/ProfileModal';
import LoginPage from './components/LoginPage';
import MotivationalQuote from './components/MotivationalQuote';
import { Loader2, Zap } from 'lucide-react';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function Dashboard() {
  const { loading } = useFit();
  const [profileOpen, setProfileOpen] = useState(false);
  const [smartLogOpen, setSmartLogOpen] = useState(false);

  if (loading) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4 anim-fade-in">
          <Loader2 size={32} className="animate-spin" style={{ color: '#FF5B04' }} />
          <p className="text-sm" style={{ color: 'rgba(228,238,240,0.5)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg" data-testid="dashboard">
      <div className="noise-overlay" />
      <div className="app-content pb-20">
        <Header onOpenProfile={() => setProfileOpen(true)} />

        {/* Quick Log Banner */}
        <div className="px-4 md:px-6 pt-4" data-testid="quick-log-banner">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setSmartLogOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FF5B04 0%, #c94400 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(255,91,4,0.3)'
              }}
              data-testid="smart-log-btn"
            >
              <Zap size={16} strokeWidth={2.5} />
              Quick Log Day
            </button>
          </div>
        </div>

        <DateNav />
        <HeroSummary onOpenProfile={() => setProfileOpen(true)} />
        <WeightChart />
        <DataCards />
        <BodyComposition />
        <WorkoutHeatmap />
        <ProgressPhotos />
        <MotivationalQuote />
      </div>
      <Footer />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <SmartDayLogger open={smartLogOpen} onClose={() => setSmartLogOpen(false)} />
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#16232A' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#FF5B04' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <FitProvider>
      <Dashboard />
    </FitProvider>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
