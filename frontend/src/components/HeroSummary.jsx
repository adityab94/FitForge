import React, { useState, useEffect } from 'react';
import { useFit } from '../context/FitContext';
import { Activity, Flame, Target, Zap, Info, Heart, Droplets } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip';

function InfoTip({ text }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors" data-testid="info-tip">
            <Info size={11} style={{ color: 'rgba(228,238,240,0.3)' }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-relaxed" style={{ background: '#1C2D35', color: '#E4EEF0', border: '1px solid rgba(228,238,240,0.1)' }}>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === undefined || value === null) return;
    const target = Number(value);
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, target);
      setDisplay(current);
      if (step >= steps) {
        setDisplay(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="stat-number">
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}
    </span>
  );
}

function BMIGauge({ bmi, color }) {
  const colorMap = {
    blue: '#E4EEF0',
    green: '#075056',
    orange: '#FF5B04',
    red: '#EF4444'
  };
  const gaugeColor = colorMap[color] || '#E4EEF0';
  const percentage = Math.min((bmi / 40) * 100, 100);
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference - (percentage / 100) * circumference * 0.75;

  return (
    <div className="relative w-20 h-20 mx-auto mb-2">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(228,238,240,0.06)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} />
        <circle cx="50" cy="50" r="38" fill="none" stroke={gaugeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${gaugeColor}50)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="stat-number text-lg" style={{ color: gaugeColor }}>{bmi}</span>
      </div>
    </div>
  );
}

function HealthScoreRing({ score }) {
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#075056' : score >= 40 ? '#FF5B04' : '#EF4444';

  return (
    <div className="relative w-[76px] h-[76px]">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(228,238,240,0.06)" strokeWidth="5" />
        <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${color}50)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-number text-lg" style={{ color }}>{score}</span>
        <span className="text-[8px]" style={{ color: 'rgba(228,238,240,0.3)' }}>/ 100</span>
      </div>
    </div>
  );
}

function WaterTracker({ glasses, onUpdate }) {
  const goal = 8;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onUpdate(Math.max(glasses - 1, 0))} className="btn-glow w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-sm font-bold" style={{ color: '#E4EEF0' }} data-testid="water-minus">-</button>
      <div className="flex gap-0.5">
        {Array.from({ length: goal }).map((_, i) => (
          <Droplets key={i} size={14} style={{ color: i < glasses ? '#075056' : 'rgba(228,238,240,0.1)', transition: 'color 0.2s' }} />
        ))}
      </div>
      <button onClick={() => onUpdate(Math.min(glasses + 1, 12))} className="btn-glow w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-sm font-bold" style={{ color: '#E4EEF0' }} data-testid="water-plus">+</button>
      <span className="text-xs ml-1" style={{ color: 'rgba(228,238,240,0.4)' }}>{glasses}/{goal}</span>
    </div>
  );
}

export default function HeroSummary({ onOpenProfile }) {
  const { stats, profile, updateWater } = useFit();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!stats?.days_to_goal) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + stats.days_to_goal);

    const tick = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff <= 0) { setCountdown('Goal reached!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${d}d ${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [stats?.days_to_goal]);

  if (!stats || !profile) return null;

  const deficitPositive = stats.deficit > 0;

  return (
    <section className="px-4 md:px-6 pt-6 pb-4 anim-slide-up" data-testid="hero-summary">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Top row: Health Score + KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* Health Score */}
          <div className="glass-card p-4 md:p-5 anim-scale-in col-span-2 md:col-span-1 flex flex-col items-center justify-center" style={{ borderTop: '2px solid rgba(7,80,86,0.4)' }} data-testid="kpi-health-score">
            <div className="flex items-center gap-1 mb-2">
              <Heart size={12} style={{ color: '#075056' }} strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(228,238,240,0.4)' }}>Score</span>
              <InfoTip text="Composite health score based on BMI, activity, nutrition tracking, and logging streak." />
            </div>
            <HealthScoreRing score={stats.health_score || 0} />
          </div>

          {/* BMI */}
          <div className="glass-card p-4 md:p-5 kpi-bmi anim-scale-in delay-100" data-testid="kpi-bmi">
            <div className="flex items-center gap-1 mb-3">
              <Activity size={14} style={{ color: '#FF5B04' }} strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(228,238,240,0.4)' }}>BMI</span>
              <InfoTip text="Body Mass Index = weight(kg) / height(m)2. Under 18.5 underweight, 18.5-24.9 normal, 25-29.9 overweight, 30+ obese." />
            </div>
            <BMIGauge bmi={stats.bmi} color={stats.bmi_color} />
            <p className="text-center text-xs mt-1" style={{ color: { blue: '#E4EEF0', green: '#075056', orange: '#FF5B04', red: '#EF4444' }[stats.bmi_color] }}>
              {stats.bmi_category}
            </p>
          </div>

          {/* BMR */}
          <div className="glass-card p-4 md:p-5 kpi-bmr anim-scale-in delay-200" data-testid="kpi-bmr">
            <div className="flex items-center gap-1 mb-3">
              <Zap size={14} style={{ color: '#075056' }} strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(228,238,240,0.4)' }}>BMR</span>
              <InfoTip text="Basal Metabolic Rate - calories your body burns at complete rest. Calculated via Mifflin-St Jeor equation." />
            </div>
            <div className="text-3xl md:text-4xl glow-orange mt-2">
              <AnimatedNumber value={stats.bmr} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(228,238,240,0.4)' }}>cal/day at rest</p>
            <p className="text-[10px] mt-1" style={{ color: 'rgba(228,238,240,0.25)' }}>TDEE: {stats.tdee} cal</p>
          </div>

          {/* Deficit */}
          <div className="glass-card p-4 md:p-5 kpi-deficit anim-scale-in delay-300" data-testid="kpi-deficit">
            <div className="flex items-center gap-1 mb-3">
              <Target size={14} style={{ color: '#FF5B04' }} strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(228,238,240,0.4)' }}>Deficit</span>
              <InfoTip text="Daily caloric deficit = (TDEE + exercise) - food eaten. Positive = burning more than eating (weight loss)." />
            </div>
            <div className={`text-3xl md:text-4xl mt-2 ${deficitPositive ? 'glow-green' : ''}`} style={{ color: deficitPositive ? '#075056' : '#EF4444' }}>
              {deficitPositive ? '+' : ''}<AnimatedNumber value={Math.abs(stats.deficit)} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(228,238,240,0.4)' }}>cal {deficitPositive ? 'deficit' : 'surplus'}</p>
            {/* Rate matching badge */}
            {(() => {
              const d = stats.deficit;
              const rates = [
                { v: 0.5, label: '0.5kg/wk', color: '#22C55E', deficit: 550 },
                { v: 0.75, label: '0.75kg/wk', color: '#FF8C40', deficit: 825 },
                { v: 1.0, label: '1kg/wk', color: '#EF4444', deficit: 1100 },
              ];
              const best = rates.reduce((p, c) => Math.abs(c.deficit - d) < Math.abs(p.deficit - d) ? c : p);
              if (Math.abs(best.deficit - d) < 350 && deficitPositive) {
                return (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: best.color }}>
                    → {best.label} pace
                  </p>
                );
              }
              if (!stats.has_nutrition) return <p className="text-[10px] mt-1" style={{ color: 'rgba(255,91,4,0.5)' }}>Log food for exact deficit</p>;
              return null;
            })()}
          </div>

          {/* Streak */}
          <div className="glass-card p-4 md:p-5 kpi-streak anim-scale-in delay-400" data-testid="kpi-streak">
            <div className="flex items-center gap-1 mb-3">
              <Flame size={14} style={{ color: '#FF5B04' }} strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(228,238,240,0.4)' }}>Streak</span>
              <InfoTip text="Consecutive days you've logged your weight. Keep the chain going!" />
            </div>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl md:text-4xl stat-number glow-orange" style={{ color: '#FF5B04' }}>
                <AnimatedNumber value={stats.streak} />
              </span>
              <span className="text-sm pb-1" style={{ color: 'rgba(228,238,240,0.4)' }}>days</span>
              {stats.streak > 0 && <span className="anim-flame text-2xl ml-1" role="img" aria-label="fire">&#128293;</span>}
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(228,238,240,0.4)' }}>{stats.streak >= 7 ? 'on fire!' : 'keep logging!'}</p>
          </div>
        </div>

        {/* Water Tracker Row */}
        <div className="glass-card-static p-3 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 anim-slide-up delay-500" data-testid="water-tracker">
          <div className="flex items-center gap-2">
            <Droplets size={16} style={{ color: '#075056' }} />
            <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Hydration</span>
            <InfoTip text="Track your daily water intake. Goal: 8 glasses (2L) per day." />
          </div>
          <WaterTracker glasses={stats.water_glasses || 0} onUpdate={(g) => updateWater(g)} />
        </div>

        {/* Goal Banner */}
        <div className="glass-card-static goal-banner p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-3 anim-slide-up delay-600" data-testid="goal-banner">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="target">&#127919;</span>
            <div>
              <p className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span style={{ color: '#FF5B04' }}>{stats.days_to_goal} days</span> to {stats.weight_to_lose}kg goal
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(228,238,240,0.4)' }}>
                {countdown} remaining &middot; ~{stats.weekly_loss}kg/week &middot; deficit: {stats.planned_daily_deficit}cal/day
              </p>
            </div>
          </div>
          <button
            onClick={onOpenProfile}
            className="btn-glow px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#FF5B04' }}
            data-testid="edit-profile-button"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </section>
  );
}
