import React, { useState, useEffect } from 'react';
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
import WorkoutHeatmap from './components/WorkoutHeatmap';
import ProgressPhotos from './components/ProgressPhotos';
import Footer from './components/Footer';
import ProfileModal from './components/ProfileModal';
import LoginPage from './components/LoginPage';
import AICoach from './components/AICoach';
import SleepCard from './components/SleepCard';
import DailyFocus from './components/DailyFocus';
import StreakFlame from './components/StreakFlame';
import SleepWeightChart from './components/SleepWeightChart';
import BarcodeScanner from './components/BarcodeScanner';
import { Loader2, Zap, Home, TrendingUp, Sparkles, Image as ImageIcon, ScanBarcode } from 'lucide-react';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const TABS = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'history', label: 'History', icon: ImageIcon },
];

function TabBar({ active, onChange }) {
  return (
    <nav className="sticky top-0 z-30 px-4 md:px-6 pt-3 pb-2" data-testid="tab-bar" style={{ background: 'linear-gradient(180deg, rgba(255,251,245,0.95) 0%, rgba(255,251,245,0.85) 100%)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(199,82,42,0.06)', border: '1px solid rgba(199,82,42,0.1)' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className="flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: isActive ? '#C7522A' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(61,31,10,0.65)',
                  boxShadow: isActive ? '0 2px 12px rgba(199,82,42,0.3)' : 'none'
                }}
                data-testid={`tab-${t.id}`}
              >
                <Icon size={14} strokeWidth={2.2} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function Dashboard() {
  const { loading, stats, workouts, addWorkout } = useFit();
  const [profileOpen, setProfileOpen] = useState(false);
  const [smartLogOpen, setSmartLogOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [tab, setTab] = useState('today');

  // Auto-log rest day: if past 10pm and no workout today, log a Rest day once
  useEffect(() => {
    if (!stats || !workouts) return;
    const now = new Date();
    if (now.getHours() < 22) return;
    const today = now.toISOString().split('T')[0];
    const hasToday = workouts.some(w => w.date === today);
    if (hasToday) return;
    const lastAutoRest = localStorage.getItem('lastAutoRestDate');
    if (lastAutoRest === today) return;
    // Fire and forget
    addWorkout({ type: 'Rest Day', duration: 0, calories: 0, notes: 'Auto-logged (no workout today)' })
      .then(() => localStorage.setItem('lastAutoRestDate', today))
      .catch(() => {});
    // eslint-disable-next-line
  }, [stats, workouts]);

  if (loading) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4 anim-fade-in">
          <Loader2 size={32} className="animate-spin" style={{ color: '#C7522A' }} />
          <p className="text-sm" style={{ color: 'rgba(61,31,10,0.6)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg" data-testid="dashboard">
      <div className="noise-overlay" />
      <div className="app-content pb-20">
        <Header onOpenProfile={() => setProfileOpen(true)} />

        <TabBar active={tab} onChange={setTab} />

        {tab === 'today' && (
          <>
            <DailyFocus />
            <div className="px-4 md:px-6 pt-4" data-testid="streak-flame-wrap">
              <div className="max-w-5xl mx-auto">
                <StreakFlame />
              </div>
            </div>
            <div className="px-4 md:px-6 pt-4" data-testid="quick-log-banner">
              <div className="max-w-5xl mx-auto flex gap-2">
                <button
                  onClick={() => setSmartLogOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #C7522A 0%, #A0421F 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(199,82,42,0.3)'
                  }}
                  data-testid="smart-log-btn"
                >
                  <Zap size={16} strokeWidth={2.5} />
                  Quick Log Day
                </button>
                <button
                  onClick={() => setBarcodeOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    color: '#C7522A',
                    border: '1.5px solid rgba(199,82,42,0.25)'
                  }}
                  data-testid="scan-btn"
                  title="Scan food barcode"
                >
                  <ScanBarcode size={16} strokeWidth={2.5} />
                  Scan
                </button>
              </div>
            </div>
            <DateNav />
            <HeroSummary onOpenProfile={() => setProfileOpen(true)} />
          </>
        )}

        {tab === 'trends' && (
          <>
            <WeightChart />
            <SleepWeightChart />
            <SleepCard />
            <DataCards />
            <WorkoutHeatmap />
          </>
        )}

        {tab === 'ai' && (
          <AICoach />
        )}

        {tab === 'history' && (
          <ProgressPhotos />
        )}
      </div>
      <Footer />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <SmartDayLogger open={smartLogOpen} onClose={() => setSmartLogOpen(false)} />
      <BarcodeScanner open={barcodeOpen} onClose={() => setBarcodeOpen(false)} />
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #FFFBF5 0%, #FFEEDC 100%)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#C7522A' }} />
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
