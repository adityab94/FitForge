import React, { useState, useMemo } from 'react';
import { useFit } from '../context/FitContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { TrendingDown, Target } from 'lucide-react';

const RATES = [
  { value: 0.5,  label: '0.5kg/wk', sublabel: 'Easy',    color: '#22C55E', colorRgb: '34,197,94',   dailyDeficit: 550  },
  { value: 0.75, label: '0.75kg/wk', sublabel: 'Optimal', color: '#FF8C40', colorRgb: '255,140,64',  dailyDeficit: 825  },
  { value: 1.0,  label: '1kg/wk',   sublabel: 'Fast',    color: '#EF4444', colorRgb: '239,68,68',   dailyDeficit: 1100 },
];

function CustomTooltip({ active, payload, selectedRate }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data || data.week === undefined) return null;

  return (
    <div style={{ background: '#1C2D35', border: '1px solid rgba(228,238,240,0.1)', borderRadius: 14, padding: '14px 16px', minWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <p style={{ fontFamily: 'Outfit, sans-serif', color: '#E4EEF0', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Week {data.week}
      </p>
      {data.actual && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(228,238,240,0.06)' }}>
          <span style={{ color: 'rgba(228,238,240,0.5)', fontSize: 11 }}>Recorded</span>
          <span style={{ color: '#E4EEF0', fontWeight: 600, fontSize: 11 }}>{data.actual}kg</span>
        </div>
      )}
      {RATES.map(rate => {
        const key = rate.value === 0.5 ? 'pred_05' : rate.value === 0.75 ? 'pred_075' : 'pred_10';
        const w = data[key];
        if (w === undefined) return null;
        const isSelected = Math.abs(rate.value - selectedRate) < 0.01;
        return (
          <div key={rate.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', opacity: isSelected ? 1 : 0.4 }}>
            <span style={{ color: rate.color, fontSize: 11, fontWeight: isSelected ? 700 : 400 }}>
              {isSelected ? '▶ ' : ''}{rate.label}
              <span style={{ color: 'rgba(228,238,240,0.4)', fontWeight: 400 }}> ({rate.sublabel})</span>
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{w}kg</span>
              {isSelected && <span style={{ color: 'rgba(228,238,240,0.35)', fontSize: 10 }}>{rate.dailyDeficit} cal/day</span>}
            </div>
          </div>
        );
      })}
      {data.bmi_075 && (
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(228,238,240,0.06)' }}>
          <span style={{ color: 'rgba(228,238,240,0.35)', fontSize: 10 }}>BMI @ 0.75kg/wk: {data.bmi_075}</span>
        </div>
      )}
    </div>
  );
}

// Dashed boundary lines for safe zone (0.5 and 1.5 kg/wk — the healthy range)
function SafeZoneLines() { return null; }

export default function WeightChart() {
  const { stats, profile } = useFit();
  const [selectedRate, setSelectedRate] = useState(0.75);

  const currentWeight = stats?.current_weight;
  const goalKg = stats?.goal_kg;
  const heightM = profile?.heightCm ? profile.heightCm / 100 : null;

  const chartData = useMemo(() => {
    if (!currentWeight || !goalKg) return [];
    const actualsByWeek = {};
    if (stats?.projection) {
      stats.projection.forEach(p => {
        if (p.actual) actualsByWeek[p.week] = p.actual;
      });
    }
    return Array.from({ length: 25 }, (_, w) => {
      const p05  = parseFloat(Math.max(currentWeight - w * 0.5,  goalKg - 3).toFixed(1));
      const p075 = parseFloat(Math.max(currentWeight - w * 0.75, goalKg - 3).toFixed(1));
      const p10  = parseFloat(Math.max(currentWeight - w * 1.0,  goalKg - 3).toFixed(1));
      return {
        week:      w,
        actual:    actualsByWeek[w] || null,
        pred_05:   p05,
        pred_075:  p075,
        pred_10:   p10,
        safe_slow: parseFloat(Math.max(currentWeight - w * 0.5,  goalKg - 3).toFixed(1)),
        safe_fast: parseFloat(Math.max(currentWeight - w * 1.5,  goalKg - 3).toFixed(1)),
        bmi_075:   heightM ? parseFloat((p075 / (heightM * heightM)).toFixed(1)) : null,
      };
    });
  }, [currentWeight, goalKg, stats?.projection, heightM]);

  const weeksToGoal = (rate) => {
    if (!currentWeight || !goalKg || currentWeight <= goalKg) return 0;
    return Math.ceil((currentWeight - goalKg) / rate);
  };

  const matchingRate = useMemo(() => {
    if (!stats?.deficit) return null;
    const best = RATES.reduce((prev, curr) =>
      Math.abs(curr.dailyDeficit - stats.deficit) < Math.abs(prev.dailyDeficit - stats.deficit) ? curr : prev
    );
    return Math.abs(best.dailyDeficit - stats.deficit) < 350 ? best : null;
  }, [stats?.deficit]);

  if (!currentWeight || !goalKg) return null;

  // Y axis domain: account for actual weight history (may be higher than profile weight)
  const maxActual = stats?.projection
    ? Math.max(...stats.projection.filter(p => p.actual).map(p => p.actual), currentWeight)
    : currentWeight;
  const yMin = Math.floor(Math.min(goalKg - 3, currentWeight - 24 * 0.5));
  const yMax = Math.ceil(maxActual + 1.5);
  const selectedInfo = RATES.find(r => Math.abs(r.value - selectedRate) < 0.01);

  return (
    <section className="px-4 md:px-6 py-4 anim-slide-up delay-300" data-testid="weight-chart-section">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-4 md:p-6 chart-container">

          {/* Header row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#FF5B04]/10">
                <TrendingDown size={18} className="text-[#FF5B04]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="weight-chart-title">
                  Weight Projection
                </h2>
                <p className="text-xs" style={{ color: 'rgba(228,238,240,0.35)' }}>Prediction goals · 24-week forecast</p>
              </div>
            </div>

            {/* Rate toggle buttons */}
            <div className="flex gap-2" data-testid="rate-toggles">
              {RATES.map(rate => {
                const isActive = Math.abs(selectedRate - rate.value) < 0.01;
                return (
                  <button
                    key={rate.value}
                    onClick={() => setSelectedRate(rate.value)}
                    data-testid={`rate-btn-${rate.value}`}
                    className="flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: isActive ? `rgba(${rate.colorRgb},0.15)` : 'rgba(228,238,240,0.04)',
                      border: `1.5px solid ${isActive ? rate.color : 'rgba(228,238,240,0.08)'}`,
                      color: isActive ? rate.color : 'rgba(228,238,240,0.35)',
                      boxShadow: isActive ? `0 0 16px rgba(${rate.colorRgb},0.2)` : 'none',
                    }}
                  >
                    <span className="font-bold">{rate.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.75 }}>{rate.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal prediction chips */}
          <div className="flex flex-wrap gap-2 mb-4" data-testid="goal-chips">
            {RATES.map(rate => {
              const wks = weeksToGoal(rate.value);
              const isActive = Math.abs(selectedRate - rate.value) < 0.01;
              const goalBMI = heightM ? parseFloat((goalKg / (heightM * heightM)).toFixed(1)) : null;
              return (
                <button
                  key={rate.value}
                  onClick={() => setSelectedRate(rate.value)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
                  style={{
                    background: isActive ? `rgba(${rate.colorRgb},0.12)` : 'rgba(228,238,240,0.03)',
                    border: `1px solid ${isActive ? `rgba(${rate.colorRgb},0.4)` : 'rgba(228,238,240,0.06)'}`,
                    color: isActive ? rate.color : 'rgba(228,238,240,0.3)',
                    cursor: 'pointer',
                  }}
                  data-testid={`goal-chip-${rate.value}`}
                >
                  <span className="font-semibold">{rate.label}:</span>{' '}
                  {goalKg}kg in <span className="font-bold">{wks} wks</span>
                  {goalBMI && isActive && (
                    <span style={{ opacity: 0.7 }}> · BMI → {goalBMI}</span>
                  )}
                </button>
              );
            })}

            {/* Safe zone badge */}
            <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', color: 'rgba(34,197,94,0.5)' }}>
              <span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(34,197,94,0.25)' }} />
              Safe zone 0.5–1.5 kg/wk
            </div>
          </div>

          {/* Chart */}
          <div className="h-[280px] md:h-[340px]" data-testid="weight-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActualWC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E4EEF0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#E4EEF0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSafe05" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={(v) => `W${v}`} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11 }} domain={[yMin, yMax]}
                  tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  content={(props) => <CustomTooltip {...props} selectedRate={selectedRate} />}
                  cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                />

                {/* Goal weight horizontal line */}
                <ReferenceLine y={goalKg} stroke="#FF5B04" strokeDasharray="8 4" strokeWidth={1.5}
                  strokeOpacity={0.6}
                  label={{ value: `Goal: ${goalKg}kg`, position: 'right', fill: '#FF5B04', fontSize: 11 }} />

                {/* Safe zone upper boundary (0.5 kg/wk) — very subtle dashed */}
                <Area type="monotone" dataKey="safe_slow" fill="rgba(34,197,94,0.04)"
                  stroke="rgba(34,197,94,0.25)" strokeWidth={1} strokeDasharray="3 5"
                  dot={false} animationDuration={900} legendType="none" />

                {/* 3 Prediction lines as Areas with no fill — bright colored strokes */}
                <Area type="monotone" dataKey="pred_05" fill="none"
                  stroke={Math.abs(selectedRate - 0.5) < 0.01 ? '#22C55E' : 'rgba(34,197,94,0.5)'}
                  strokeWidth={Math.abs(selectedRate - 0.5) < 0.01 ? 3 : 1.5}
                  strokeDasharray={Math.abs(selectedRate - 0.5) < 0.01 ? '0' : '5 3'}
                  dot={false} animationDuration={1200} legendType="none" />
                <Area type="monotone" dataKey="pred_075" fill="none"
                  stroke={Math.abs(selectedRate - 0.75) < 0.01 ? '#FF8C40' : 'rgba(255,140,64,0.5)'}
                  strokeWidth={Math.abs(selectedRate - 0.75) < 0.01 ? 3 : 1.5}
                  strokeDasharray={Math.abs(selectedRate - 0.75) < 0.01 ? '0' : '5 3'}
                  dot={false} animationDuration={1400} legendType="none" />
                <Area type="monotone" dataKey="pred_10" fill="none"
                  stroke={Math.abs(selectedRate - 1.0) < 0.01 ? '#EF4444' : 'rgba(239,68,68,0.5)'}
                  strokeWidth={Math.abs(selectedRate - 1.0) < 0.01 ? 3 : 1.5}
                  strokeDasharray={Math.abs(selectedRate - 1.0) < 0.01 ? '0' : '5 3'}
                  dot={false} animationDuration={1600} legendType="none" />

                {/* Actual recorded weights — ON TOP (rendered last) */}
                <Area type="monotone" dataKey="actual" name="Actual"
                  stroke="#E4EEF0" strokeWidth={2.5}
                  fill="url(#gradActualWC)"
                  dot={{ r: 4, fill: '#E4EEF0', stroke: '#16232A', strokeWidth: 2 }}
                  connectNulls={false} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom info bar */}
          <div className="mt-4 space-y-2">
            <div className="glass-card-static px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              data-testid="deficit-rate-bar">
              <div className="flex items-center gap-2">
                <Target size={13} style={{ color: selectedInfo.color }} />
                <span className="text-xs font-semibold" style={{ color: selectedInfo.color }}>
                  {selectedInfo.label}: needs {selectedInfo.dailyDeficit} cal/day deficit
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `rgba(${selectedInfo.colorRgb},0.12)`, color: selectedInfo.color }}>
                  = {(selectedInfo.value * 7700 / 7).toFixed(0)} kcal/wk
                </span>
              </div>
              <div className="text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>
                {matchingRate ? (
                  <span>
                    Your <span className="font-semibold" style={{ color: '#E4EEF0' }}>{stats.deficit} cal</span> deficit{' '}
                    → <span className="font-semibold" style={{ color: matchingRate.color }}>tracks {matchingRate.label}</span> 🎯
                  </span>
                ) : (
                  <span>
                    Current: <span className="font-semibold" style={{ color: '#E4EEF0' }}>{stats.deficit} cal</span> deficit
                  </span>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px]" style={{ color: 'rgba(228,238,240,0.3)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: '#E4EEF0' }} /> Actual
              </span>
              {RATES.map(r => (
                <span key={r.value} className="flex items-center gap-1.5"
                  style={{ opacity: Math.abs(selectedRate - r.value) < 0.01 ? 1 : 0.5 }}>
                  <span className="w-3 h-0.5 rounded" style={{ background: r.color }} /> {r.label} ({r.sublabel})
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.35)' }} /> Safe 0.5–1.5
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
