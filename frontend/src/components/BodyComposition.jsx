import React, { useState } from 'react';
import { useFit } from '../context/FitContext';
import { User, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip';

export default function BodyComposition() {
  const { calcBodyComp, profile } = useFit();
  const [form, setForm] = useState({ waist: '', neck: '', hip: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.waist || !form.neck) return;
    setLoading(true);
    try {
      const res = await calcBodyComp(
        parseFloat(form.waist),
        parseFloat(form.neck),
        form.hip ? parseFloat(form.hip) : undefined
      );
      setResult(res);
    } catch (err) {
      console.error('Body composition error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFemale = profile?.gender === 'female';
  const circumference = 2 * Math.PI * 50;
  const fatPct = result?.body_fat || 0;
  const dashOffset = circumference - (fatPct / 60) * circumference;

  const catColor = result ? (
    result.category === 'Athletic' || result.category === 'Essential' ? '#075056' :
    result.category === 'Fitness' ? '#075056' :
    result.category === 'Average' ? '#FF5B04' : '#EF4444'
  ) : '#FF5B04';

  return (
    <section className="px-4 md:px-6 py-4 anim-slide-up delay-400" data-testid="body-composition-section">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(255,91,4,0.1)' }}>
                <User size={18} style={{ color: '#FF5B04' }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="body-comp-title">
                  Body Composition
                </h2>
                <p className="text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>Navy Method body fat estimator</p>
              </div>
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-white/10">
                    <Info size={14} style={{ color: 'rgba(228,238,240,0.3)' }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[220px] text-[11px]" style={{ background: '#1C2D35', color: '#E4EEF0', border: '1px solid rgba(228,238,240,0.1)' }}>
                  U.S. Navy body fat formula. Requires waist and neck circumference measurements in cm.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.4)' }}>Waist (cm) — at navel</label>
                <input type="number" step="0.1" className="input-dark w-full" placeholder="e.g. 88" value={form.waist} onChange={(e) => setForm({...form, waist: e.target.value})} data-testid="body-comp-waist" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.4)' }}>Neck (cm) — below larynx</label>
                <input type="number" step="0.1" className="input-dark w-full" placeholder="e.g. 38" value={form.neck} onChange={(e) => setForm({...form, neck: e.target.value})} data-testid="body-comp-neck" />
              </div>
              {isFemale && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.4)' }}>Hips (cm) — widest point</label>
                  <input type="number" step="0.1" className="input-dark w-full" placeholder="e.g. 100" value={form.hip} onChange={(e) => setForm({...form, hip: e.target.value})} data-testid="body-comp-hip" />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-glow w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: '#FF5B04' }} data-testid="body-comp-submit">
                {loading ? 'Calculating...' : 'Calculate Body Fat'}
              </button>
            </form>

            {/* Result */}
            {result ? (
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-[130px] h-[130px] mb-3">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(228,238,240,0.06)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={catColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 8px ${catColor}40)` }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="stat-number text-2xl" style={{ color: catColor }}>{result.body_fat}%</span>
                    <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>body fat</span>
                  </div>
                </div>
                <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}>
                  {result.category}
                </span>
                <div className="flex gap-6 mt-4 text-center">
                  <div>
                    <p className="stat-number text-lg" style={{ color: '#E4EEF0' }}>{result.lean_mass}kg</p>
                    <p className="text-[10px]" style={{ color: 'rgba(228,238,240,0.35)' }}>lean mass</p>
                  </div>
                  <div>
                    <p className="stat-number text-lg" style={{ color: '#FF5B04' }}>{result.fat_mass}kg</p>
                    <p className="text-[10px]" style={{ color: 'rgba(228,238,240,0.35)' }}>fat mass</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ color: 'rgba(228,238,240,0.2)' }}>
                <p className="text-sm text-center">Enter your measurements<br/>to estimate body fat %</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
