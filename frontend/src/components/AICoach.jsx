import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Loader2, TrendingDown, ImageIcon, X, Smartphone, Copy, CheckCircle2, Bell, BellOff } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function AICoach() {
  const { token } = useAuth();
  const [tab, setTab] = useState('coach'); // coach | plateau | photos | health
  const [coachData, setCoachData] = useState(null);
  const [plateauData, setPlateauData] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [loadingPlateau, setLoadingPlateau] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);
  const [copied, setCopied] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const authAxios = axios.create({ headers: token ? { Authorization: `Bearer ${token}` } : {} });

  useEffect(() => {
    // Load previous reports
    authAxios.get(`${API}/ai/latest/weekly_coach`).then(r => r.data && setCoachData(r.data.data)).catch(() => {});
    authAxios.get(`${API}/ai/latest/plateau_detect`).then(r => r.data && setPlateauData(r.data.data)).catch(() => {});
    authAxios.get(`${API}/progress-photos`).then(r => setPhotos(r.data || [])).catch(() => {});
    authAxios.get(`${API}/health-sync/info`).then(r => setSyncInfo(r.data)).catch(() => {});
    authAxios.get(`${API}/push/status`).then(r => setPushSubscribed(!!r.data?.subscribed)).catch(() => {});
    // eslint-disable-next-line
  }, [token]);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications not supported on this browser. Use Safari on iPhone (add to Home Screen first) or Chrome.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('Notification permission denied'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { data: vapid } = await authAxios.get(`${API}/push/vapid-key`);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const subJson = sub.toJSON();
      await authAxios.post(`${API}/push/subscribe`, { endpoint: subJson.endpoint, keys: subJson.keys });
      setPushSubscribed(true);
    } catch (e) {
      alert('Could not enable push: ' + (e?.message || 'unknown'));
    } finally { setPushBusy(false); }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      await authAxios.delete(`${API}/push/subscribe`);
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
      }
      setPushSubscribed(false);
    } catch (e) { alert('Could not disable: ' + e.message); }
    finally { setPushBusy(false); }
  };

  const runWeeklyCoach = async () => {
    setLoadingCoach(true);
    try {
      const r = await authAxios.post(`${API}/ai/weekly-coach`);
      setCoachData(r.data);
    } catch (e) { alert('Coach unavailable: ' + (e?.response?.data?.detail || e.message)); }
    finally { setLoadingCoach(false); }
  };

  const runPlateauDetect = async () => {
    setLoadingPlateau(true);
    try {
      const r = await authAxios.post(`${API}/ai/plateau-detect`);
      setPlateauData(r.data);
    } catch (e) { alert('Plateau check unavailable: ' + (e?.response?.data?.detail || e.message)); }
    finally { setLoadingPlateau(false); }
  };

  const runPhotoAnalysis = async () => {
    if (!selectedA || !selectedB) { alert('Pick two photos'); return; }
    setLoadingPhoto(true);
    try {
      const r = await authAxios.post(`${API}/ai/analyze-photos`, { photo_a_id: selectedA, photo_b_id: selectedB });
      setPhotoData(r.data);
    } catch (e) { alert('Photo analysis unavailable: ' + (e?.response?.data?.detail || e.message)); }
    finally { setLoadingPhoto(false); }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const toneEmoji = { crushing: '🔥', steady: '💪', slipping: '⚠️', just_started: '🌱' };
  const severityColor = { none: '#0F766E', mild: '#D97706', moderate: '#C7522A', serious: '#B91C1C' };

  const TABS = [
    { id: 'coach', label: 'Weekly Coach', icon: Sparkles },
    { id: 'plateau', label: 'Plateau Check', icon: TrendingDown },
    { id: 'photos', label: 'Photo Compare', icon: ImageIcon },
    { id: 'health', label: 'Apple Health', icon: Smartphone },
  ];

  return (
    <div className="px-4 md:px-6 pt-6 pb-4" data-testid="ai-coach-section">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(199,82,42,0.12)' }}>
              <Sparkles size={16} style={{ color: '#C7522A' }} strokeWidth={2.2} />
            </div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>AI Coach</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}>Gemini</span>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-5 p-1 rounded-xl" style={{ background: 'rgba(199,82,42,0.06)' }}>
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 min-w-max py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={{ background: tab === t.id ? '#C7522A' : 'transparent', color: tab === t.id ? '#fff' : 'rgba(61,31,10,0.6)' }}
                  data-testid={`ai-tab-${t.id}`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Weekly Coach */}
          {tab === 'coach' && (
            <div>
              {coachData ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(199,82,42,0.15)' }}>
                    <p className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>
                      {toneEmoji[coachData.tone] || '💪'} {coachData.headline}
                    </p>
                  </div>
                  {coachData.wins?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#0F766E' }}>WINS</p>
                      <ul className="space-y-1">
                        {coachData.wins.map((w, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>✓ {w}</li>)}
                      </ul>
                    </div>
                  )}
                  {coachData.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#C7522A' }}>GAPS</p>
                      <ul className="space-y-1">
                        {coachData.gaps.map((w, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>! {w}</li>)}
                      </ul>
                    </div>
                  )}
                  {coachData.action_this_week?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#3D1F0A' }}>THIS WEEK</p>
                      <ul className="space-y-1">
                        {coachData.action_this_week.map((w, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>→ {w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm mb-3" style={{ color: 'rgba(61,31,10,0.6)' }}>Get a personalized report of your past 7 days.</p>
              )}
              <button
                onClick={runWeeklyCoach}
                disabled={loadingCoach}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#C7522A' }}
                data-testid="run-weekly-coach"
              >
                {loadingCoach ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : coachData ? 'Regenerate Report' : 'Generate Weekly Report'}
              </button>

              {/* Sunday Push Toggle */}
              <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: pushSubscribed ? 'rgba(15,118,110,0.08)' : 'rgba(199,82,42,0.06)', border: `1px solid ${pushSubscribed ? 'rgba(15,118,110,0.2)' : 'rgba(199,82,42,0.15)'}` }} data-testid="sunday-push-toggle">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: pushSubscribed ? 'rgba(15,118,110,0.15)' : 'rgba(199,82,42,0.12)' }}>
                  {pushSubscribed ? <Bell size={15} style={{ color: '#0F766E' }} strokeWidth={2.4} /> : <BellOff size={15} style={{ color: '#C7522A' }} strokeWidth={2.4} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Sunday 8 PM auto-report</p>
                  <p className="text-[11px]" style={{ color: 'rgba(61,31,10,0.6)' }}>
                    {pushSubscribed ? 'Push enabled — you\'ll get a summary every Sunday' : 'Turn on to receive the weekly coach as a push notification'}
                  </p>
                </div>
                <button
                  onClick={pushSubscribed ? disablePush : enablePush}
                  disabled={pushBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all disabled:opacity-50"
                  style={{ background: pushSubscribed ? 'rgba(15,118,110,0.15)' : '#C7522A', color: pushSubscribed ? '#0F766E' : '#fff' }}
                  data-testid="push-toggle-btn"
                >
                  {pushBusy ? <Loader2 size={12} className="animate-spin" /> : pushSubscribed ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          )}

          {/* Plateau */}
          {tab === 'plateau' && (
            <div>
              {plateauData ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)', border: `1px solid ${severityColor[plateauData.severity] || 'rgba(199,82,42,0.15)'}30` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: `${severityColor[plateauData.severity] || '#C7522A'}20`, color: severityColor[plateauData.severity] || '#C7522A' }}>
                        {plateauData.is_plateau ? `Plateau · ${plateauData.severity}` : 'No plateau'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>{plateauData.trend_summary}</p>
                    <p className="text-sm mt-2" style={{ color: 'rgba(61,31,10,0.75)' }}>{plateauData.diagnosis}</p>
                  </div>
                  {plateauData.causes?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#C7522A' }}>LIKELY CAUSES</p>
                      <ul className="space-y-1">
                        {plateauData.causes.map((c, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>• {c}</li>)}
                      </ul>
                    </div>
                  )}
                  {plateauData.fixes?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#0F766E' }}>FIXES</p>
                      <ul className="space-y-1">
                        {plateauData.fixes.map((c, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>→ {c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm mb-3" style={{ color: 'rgba(61,31,10,0.6)' }}>Not losing weight? Scan the last 28 days to find why.</p>
              )}
              <button
                onClick={runPlateauDetect}
                disabled={loadingPlateau}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#C7522A' }}
                data-testid="run-plateau-detect"
              >
                {loadingPlateau ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : plateauData ? 'Re-check Plateau' : 'Check for Plateau'}
              </button>
            </div>
          )}

          {/* Photos */}
          {tab === 'photos' && (
            <div>
              {photos.length < 2 ? (
                <p className="text-sm" style={{ color: 'rgba(61,31,10,0.6)' }}>Upload at least 2 progress photos first (in the Progress Photos section).</p>
              ) : (
                <>
                  <p className="text-xs mb-3" style={{ color: 'rgba(61,31,10,0.6)' }}>Pick two photos to compare (before → after)</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[{ key: 'A', selected: selectedA, setter: setSelectedA }, { key: 'B', selected: selectedB, setter: setSelectedB }].map(slot => (
                      <div key={slot.key}>
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#C7522A' }}>Photo {slot.key}</p>
                        <select
                          value={slot.selected || ''}
                          onChange={e => slot.setter(e.target.value || null)}
                          className="select-dark w-full text-sm"
                          data-testid={`photo-select-${slot.key.toLowerCase()}`}
                        >
                          <option value="">Choose photo</option>
                          {photos.map(p => <option key={p.id} value={p.id}>{p.date}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={runPhotoAnalysis}
                    disabled={loadingPhoto || !selectedA || !selectedB}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#C7522A' }}
                    data-testid="run-photo-analysis"
                  >
                    {loadingPhoto ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : 'Compare Photos'}
                  </button>

                  {photoData && (
                    <div className="mt-4 space-y-3">
                      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(199,82,42,0.15)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#3D1F0A' }}>{photoData.overall_change}</p>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>Confidence: {photoData.confidence}</p>
                      </div>
                      {photoData.visible_changes?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold mb-1.5" style={{ color: '#0F766E' }}>VISIBLE CHANGES</p>
                          <ul className="space-y-1">
                            {photoData.visible_changes.map((c, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>✓ {c}</li>)}
                          </ul>
                        </div>
                      )}
                      {photoData.areas_to_focus?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold mb-1.5" style={{ color: '#C7522A' }}>FOCUS AREAS</p>
                          <ul className="space-y-1">
                            {photoData.areas_to_focus.map((c, i) => <li key={i} className="text-sm" style={{ color: '#3D1F0A' }}>→ {c}</li>)}
                          </ul>
                        </div>
                      )}
                      {photoData.encouragement && (
                        <p className="text-sm italic pt-2 border-t" style={{ color: 'rgba(61,31,10,0.75)', borderColor: 'rgba(199,82,42,0.15)' }}>
                          "{photoData.encouragement}"
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Apple Health */}
          {tab === 'health' && (
            !syncInfo ? (
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(199,82,42,0.15)' }}>
                <Smartphone size={24} className="mx-auto mb-2" style={{ color: 'rgba(61,31,10,0.35)' }} />
                <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Apple Health sync unavailable</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>Deploy the app to Vercel to enable iOS Shortcut sync.</p>
              </div>
            ) : (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: '#3D1F0A' }}>
                <strong>iOS Shortcut Setup:</strong> Send your Apple Health data to FitForge daily.
              </p>
              <ol className="text-sm space-y-2" style={{ color: 'rgba(61,31,10,0.8)' }}>
                <li><strong>1.</strong> Open the <strong>Shortcuts</strong> app on iPhone → tap <strong>+</strong> to create a new shortcut.</li>
                <li><strong>2.</strong> Add <strong>"Find Health Samples"</strong> actions for: Steps, Sleep Hours, Resting Heart Rate (each for Today).</li>
                <li><strong>3.</strong> Add a <strong>"Get Contents of URL"</strong> action:</li>
              </ol>
              <div className="space-y-2 pl-4">
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#C7522A' }}>URL</p>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-xs font-mono break-all" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.15)', color: '#3D1F0A' }}>
                    <span className="flex-1">{typeof window !== 'undefined' ? window.location.origin : ''}/api/health-sync</span>
                    <button onClick={() => copyText(`${window.location.origin}/api/health-sync`, 'url')} className="p-1 rounded transition-colors hover:bg-black/5">
                      {copied === 'url' ? <CheckCircle2 size={14} style={{ color: '#0F766E' }} /> : <Copy size={14} style={{ color: '#C7522A' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#C7522A' }}>METHOD</p>
                  <p className="text-xs font-mono">POST</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#C7522A' }}>HEADERS</p>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-xs font-mono break-all" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.15)', color: '#3D1F0A' }}>
                    <span className="flex-1">x-sync-token: {syncInfo.header['x-sync-token']}</span>
                    <button onClick={() => copyText(syncInfo.header['x-sync-token'], 'token')} className="p-1 rounded transition-colors hover:bg-black/5">
                      {copied === 'token' ? <CheckCircle2 size={14} style={{ color: '#0F766E' }} /> : <Copy size={14} style={{ color: '#C7522A' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#C7522A' }}>REQUEST BODY (JSON)</p>
                  <div className="flex items-start gap-2 p-2 rounded-lg text-xs font-mono" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.15)', color: '#3D1F0A' }}>
                    <pre className="flex-1 whitespace-pre-wrap">{JSON.stringify({ steps: '[Steps Value]', sleep_hours: '[Sleep Hours]', resting_hr: '[Resting HR]', weight: '[Weight kg]' }, null, 2)}</pre>
                    <button onClick={() => copyText(JSON.stringify({ steps: 8500, sleep_hours: 7.5, resting_hr: 62, weight: 88.5 }, null, 2), 'body')} className="p-1 rounded transition-colors hover:bg-black/5">
                      {copied === 'body' ? <CheckCircle2 size={14} style={{ color: '#0F766E' }} /> : <Copy size={14} style={{ color: '#C7522A' }} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-3 p-3 rounded-lg" style={{ background: 'rgba(199,82,42,0.06)', color: 'rgba(61,31,10,0.75)' }}>
                <strong>4.</strong> In Shortcuts settings → <strong>Automation</strong> → set to run daily at 10 PM.<br/>
                <strong>5.</strong> Test it by tapping ▶ once — you'll see your data appear on the dashboard!
              </p>
            </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
