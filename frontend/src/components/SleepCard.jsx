import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Moon, Heart, Zap, TrendingUp } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

export default function SleepCard() {
  const { token } = useAuth();
  const [data, setData] = useState({ sleep: [], vitals: [], activity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/health/recent?days=7`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data || { sleep: [], vitals: [], activity: [] }))
      .catch(() => setData({ sleep: [], vitals: [], activity: [] }))
      .finally(() => setLoading(false));
  }, [token]);

  const sleepLogs = data.sleep || [];
  const vitals = data.vitals || [];
  const lastNight = sleepLogs.length ? sleepLogs[sleepLogs.length - 1] : null;
  const avgSleep = sleepLogs.length ? sleepLogs.reduce((s, x) => s + (x.hours || 0), 0) / sleepLogs.length : 0;
  const lastHR = vitals.length ? vitals[vitals.length - 1]?.resting_hr : null;

  const getTier = (h) => {
    if (h >= 8) return { label: 'Excellent', color: '#0F766E', emoji: '💤' };
    if (h >= 7) return { label: 'Good', color: '#0F766E', emoji: '😴' };
    if (h >= 6) return { label: 'Fair', color: '#D97706', emoji: '😐' };
    if (h > 0) return { label: 'Poor', color: '#C7522A', emoji: '😴' };
    return { label: 'No data', color: 'rgba(61,31,10,0.4)', emoji: '💤' };
  };

  const tier = getTier(lastNight?.hours || 0);
  const hours = lastNight?.hours || 0;
  const displayHrs = hours ? `${Math.floor(hours)}h ${Math.round((hours - Math.floor(hours)) * 60)}m` : '—';

  // Bar chart for last 7 days
  const bars = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const rec = sleepLogs.find(s => s.date === dStr);
    return { date: dStr, hours: rec?.hours || 0, day: d.toLocaleDateString('en', { weekday: 'narrow' }) };
  });
  const maxBar = Math.max(9, ...bars.map(b => b.hours));

  return (
    <div className="px-4 md:px-6 pt-6" data-testid="sleep-card">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(107,124,217,0.12)' }}>
                <Moon size={16} style={{ color: '#5A6BB8' }} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Sleep & Recovery</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}>Apple Health</span>
          </div>

          {loading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'rgba(61,31,10,0.5)' }}>Loading...</p>
          ) : sleepLogs.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(199,82,42,0.15)' }}>
              <Moon size={22} className="mx-auto mb-2" style={{ color: 'rgba(61,31,10,0.35)' }} />
              <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>No sleep data yet</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>Set up iOS Shortcut in the AI Coach → Apple Health tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Last night */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'rgba(61,31,10,0.5)' }}>Last night</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>{displayHrs}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: tier.color }}>
                  {tier.emoji} {tier.label}
                </p>
              </div>

              {/* 7-day avg */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'rgba(61,31,10,0.5)' }}>7-day avg</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>
                  {avgSleep.toFixed(1)}<span className="text-lg" style={{ color: 'rgba(61,31,10,0.5)' }}>h</span>
                </p>
                <p className="text-xs font-semibold mt-1" style={{ color: getTier(avgSleep).color }}>
                  {getTier(avgSleep).label}
                </p>
              </div>

              {/* Resting HR */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Heart size={11} style={{ color: '#C7522A' }} strokeWidth={2.5} />
                  <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>Resting HR</p>
                </div>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>
                  {lastHR || '—'}<span className="text-lg" style={{ color: 'rgba(61,31,10,0.5)' }}> bpm</span>
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.5)' }}>
                  {lastHR ? (lastHR < 60 ? 'Athletic' : lastHR < 70 ? 'Healthy' : lastHR < 80 ? 'Average' : 'Elevated') : 'No data'}
                </p>
              </div>
            </div>
          )}

          {/* 7-day bar chart */}
          {sleepLogs.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(199,82,42,0.15)' }}>
              <p className="text-[10px] uppercase font-bold mb-3" style={{ color: 'rgba(61,31,10,0.5)' }}>Last 7 nights</p>
              <div className="flex items-end gap-2 h-24">
                {bars.map((b, i) => {
                  const h = b.hours ? (b.hours / maxBar) * 100 : 3;
                  const t = getTier(b.hours);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md transition-all relative" style={{
                        height: `${h}%`,
                        background: b.hours ? `linear-gradient(180deg, ${t.color}, ${t.color}80)` : 'rgba(199,82,42,0.1)',
                        minHeight: '4px'
                      }}>
                        {b.hours > 0 && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold" style={{ color: '#3D1F0A' }}>
                            {b.hours.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold uppercase" style={{ color: 'rgba(61,31,10,0.5)' }}>{b.day}</span>
                    </div>
                  );
                })}
              </div>
              {avgSleep > 0 && avgSleep < 7 && (
                <div className="mt-3 p-2 rounded-lg flex items-start gap-2" style={{ background: 'rgba(199,82,42,0.08)' }}>
                  <Zap size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#C7522A' }} strokeWidth={2.5} />
                  <p className="text-xs" style={{ color: '#3D1F0A' }}>
                    Under 7h avg. Poor sleep raises cortisol which stalls fat loss — try lights out 30 min earlier.
                  </p>
                </div>
              )}
              {avgSleep >= 7 && (
                <div className="mt-3 p-2 rounded-lg flex items-start gap-2" style={{ background: 'rgba(15,118,110,0.08)' }}>
                  <TrendingUp size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#0F766E' }} strokeWidth={2.5} />
                  <p className="text-xs" style={{ color: '#3D1F0A' }}>
                    Sleep is solid — recovery is on track. Great for muscle repair and fat loss.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
