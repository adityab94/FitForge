import React, { useMemo } from 'react';
import { useFit } from '../context/FitContext';
import { Target, Footprints, Droplets, Dumbbell, Scale, Sparkles, Flame } from 'lucide-react';

// Smart contextual nudge based on today's data + time of day
function computeFocus({ stats, weights, workouts, profile }) {
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().split('T')[0];

  const todaysWorkouts = (workouts || []).filter(w => w.date === today);
  const todaysWeight = (weights || []).some(w => w.date === today);

  const steps = stats?.steps_today || 0;
  const water = stats?.water_glasses || 0;
  const deficit = stats?.deficit || 0;
  const hasNutrition = stats?.has_nutrition;

  // Morning: prompt weigh-in
  if (hour < 10 && !todaysWeight) {
    return { icon: Scale, label: 'MORNING', tone: '#0F766E', title: 'Weigh-in first thing', sub: 'Log your morning weight to keep the streak alive', cta: null };
  }

  // Mid-day: prompt food logging
  if (hour >= 11 && hour < 15 && !hasNutrition) {
    return { icon: Flame, label: 'LUNCH TIME', tone: '#C7522A', title: 'Log today\'s food', sub: 'Tap Quick Log to enter calories or use "Same as yesterday"', cta: null };
  }

  // Afternoon: nudge steps
  if (hour >= 14 && hour < 19 && steps < 5000) {
    const need = Math.max(5000 - steps, 0);
    return { icon: Footprints, label: 'MOVE', tone: '#C7522A', title: `${need.toLocaleString()} steps to 5k`, sub: 'A 15-min walk gets you there', cta: null };
  }

  // Afternoon: nudge water
  if (hour >= 12 && water < 4) {
    return { icon: Droplets, label: 'HYDRATE', tone: '#0F766E', title: `${8 - water} glasses to go`, sub: 'Drink up — hydration boosts metabolism', cta: null };
  }

  // Evening: no workout logged
  if (hour >= 17 && hour < 22 && todaysWorkouts.length === 0) {
    return { icon: Dumbbell, label: 'TRAIN', tone: '#C7522A', title: 'No workout yet today', sub: 'Even 20 min lights the deficit engine', cta: null };
  }

  // Late night: recovery
  if (hour >= 22) {
    return { icon: Sparkles, label: 'RECOVERY', tone: '#5A6BB8', title: 'Wind down for real rest', sub: 'Sleep 7+ hours to keep cortisol low and burn fat', cta: null };
  }

  // Positive states
  if (deficit > 300 && hasNutrition) {
    return { icon: Flame, label: 'CRUSHING IT', tone: '#0F766E', title: `${deficit} cal deficit today`, sub: 'You\'re on pace — hold this line', cta: null };
  }

  if (steps > 8000 && todaysWorkouts.length > 0) {
    return { icon: Target, label: 'ON POINT', tone: '#0F766E', title: 'Movement + workout done', sub: 'Now hit your nutrition target to seal the day', cta: null };
  }

  // Default
  return { icon: Target, label: 'TODAY', tone: '#C7522A', title: 'What\'s your one thing today?', sub: 'Log your weight, food, or workout to move forward', cta: null };
}

export default function DailyFocus() {
  const { stats, weights, workouts, profile } = useFit();
  const focus = useMemo(() => computeFocus({ stats, weights, workouts, profile }), [stats, weights, workouts, profile]);
  if (!stats) return null;
  const Icon = focus.icon;

  return (
    <section className="px-4 md:px-6 pt-4" data-testid="daily-focus">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-4 md:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${focus.tone}18` }}>
            <Icon size={22} style={{ color: focus.tone }} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: focus.tone }}>
              {focus.label}
            </p>
            <p className="text-base md:text-lg font-bold truncate" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>
              {focus.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(61,31,10,0.6)' }}>
              {focus.sub}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
