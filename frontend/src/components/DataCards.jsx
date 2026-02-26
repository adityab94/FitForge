import React, { useState } from 'react';
import { useFit } from '../context/FitContext';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';
import { Utensils, Dumbbell, Plus, Ruler, Activity, Trash2, Footprints, Loader2, Copy } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '../components/ui/dialog';
import confetti from 'canvas-confetti';

// --- Nutrition Card ---
function NutritionCard() {
  const { nutrition, logNutritionManual, copyNutritionFromYesterday, selectedDate } = useFit();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('total');
  const [form, setForm] = useState({ calories: '', carbs: '', protein: '', fat: '' });
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');

  const hasNutrition = nutrition?.total?.calories > 0;
  const totalCal = hasNutrition ? nutrition.total.calories : 0;
  const carbs = hasNutrition ? nutrition.total.carbs : 0;
  const protein = hasNutrition ? nutrition.total.protein : 0;
  const fat = hasNutrition ? nutrition.total.fat : 0;
  const carbsPct = totalCal > 0 ? Math.round((carbs * 4 / totalCal) * 100) : 40;
  const proteinPct = totalCal > 0 ? Math.round((protein * 4 / totalCal) * 100) : 30;
  const fatPct = totalCal > 0 ? 100 - carbsPct - proteinPct : 30;

  const macros = [
    { name: 'Carbs', value: carbsPct, color: '#FF5B04' },
    { name: 'Protein', value: proteinPct, color: '#075056' },
    { name: 'Fat', value: fatPct, color: '#E4EEF0' },
  ];

  const calcCalFromMacros = () => {
    const c = parseFloat(form.carbs) || 0, p = parseFloat(form.protein) || 0, f = parseFloat(form.fat) || 0;
    return Math.round(c * 4 + p * 4 + f * 9);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'total' && !form.calories) { setError('Enter calories'); return; }
    if (mode === 'macros' && !form.carbs && !form.protein && !form.fat) { setError('Enter at least one macro'); return; }
    setSaving(true);
    try {
      await logNutritionManual({ mode, ...form });
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 }, colors: ['#FF5B04', '#075056'] });
      setOpen(false);
      setForm({ calories: '', carbs: '', protein: '', fat: '' });
    } catch (e) { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleCopyYesterday = async () => {
    setCopying(true);
    setError('');
    try {
      await copyNutritionFromYesterday();
      confetti({ particleCount: 40, spread: 30, origin: { y: 0.7 }, colors: ['#FF5B04', '#075056'] });
      setOpen(false);
    } catch (e) {
      setError('No data found for yesterday');
    } finally {
      setCopying(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card p-4 md:p-5 anim-scale-in delay-400" data-testid="nutrition-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FF5B04]/10">
            <Utensils size={14} className="text-[#FF5B04]" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Nutrition</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="btn-glow p-1.5 rounded-lg bg-[#FF5B04]/10 hover:bg-[#FF5B04]/20 transition-colors"
              data-testid="log-nutrition-btn"
            >
              <Plus size={14} className="text-[#FF5B04]" />
            </button>
          </DialogTrigger>
          <DialogContent className="glass-card-static border-white/10 max-w-sm" style={{ background: '#16232A' }} data-testid="nutrition-modal">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Log Nutrition
              </DialogTitle>
              <DialogDescription className="text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>
                {selectedDate === today ? 'Today' : selectedDate}
              </DialogDescription>
            </DialogHeader>

            {/* Copy from yesterday */}
            <button
              onClick={handleCopyYesterday}
              disabled={copying}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(228,238,240,0.06)', color: 'rgba(228,238,240,0.6)', border: '1px solid rgba(228,238,240,0.1)' }}
              data-testid="copy-yesterday-btn"
            >
              {copying ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
              Copy from yesterday
            </button>

            {error && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{error}</p>}

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(228,238,240,0.08)' }} />
              <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.3)' }}>or enter manually</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(228,238,240,0.08)' }} />
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              {['total', 'macros'].map(m => (
                <button key={m} onClick={() => setMode(m)} data-testid={`nutrition-mode-${m}`}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: mode === m ? '#FF5B04' : 'rgba(228,238,240,0.06)', color: mode === m ? '#fff' : 'rgba(228,238,240,0.5)' }}>
                  {m === 'total' ? 'Quick (Calories)' : 'Breakdown (Macros)'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'total' ? (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Total Calories</label>
                  <input type="number" data-testid="nutrition-calories-input"
                    className="input-dark w-full text-sm" placeholder="e.g. 1800"
                    value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} />
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { key: 'carbs', label: 'Carbs (g)', hint: '×4 cal/g' },
                    { key: 'protein', label: 'Protein (g)', hint: '×4 cal/g' },
                    { key: 'fat', label: 'Fat (g)', hint: '×9 cal/g' },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs mb-0.5 block" style={{ color: 'rgba(228,238,240,0.5)' }}>{label}</label>
                        <input type="number" step="0.1" data-testid={`nutrition-${key}-input`}
                          className="input-dark w-full text-sm" placeholder="0"
                          value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                      </div>
                      <span className="text-[10px] mt-4" style={{ color: 'rgba(228,238,240,0.3)' }}>{hint}</span>
                    </div>
                  ))}
                  {(form.carbs || form.protein || form.fat) && (
                    <p className="text-xs font-semibold" style={{ color: '#FF5B04' }}>
                      = {calcCalFromMacros()} cal total
                    </p>
                  )}
                </div>
              )}
              <button type="submit" disabled={saving} data-testid="nutrition-submit-btn"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#FF5B04' }}>
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={macros} cx="50%" cy="50%" innerRadius={40} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0} animationDuration={1200}>
              {macros.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <p className="text-lg font-bold stat-number" style={{ color: '#E4EEF0' }}>{hasNutrition ? totalCal : '—'}</p>
          <p className="text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>{hasNutrition ? 'cal eaten' : 'no data'}</p>
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-3">
        {macros.map((m) => (
          <div key={m.name} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            <span style={{ color: 'rgba(228,238,240,0.4)' }}>{m.name} {m.value}%</span>
          </div>
        ))}
      </div>

      {hasNutrition && (
        <div className="mt-3 space-y-1">
          {carbs > 0 && <div className="flex justify-between text-[10px]" style={{ color: 'rgba(228,238,240,0.5)' }}><span>Carbs</span><span className="font-semibold" style={{ color: '#E4EEF0' }}>{carbs}g</span></div>}
          {protein > 0 && <div className="flex justify-between text-[10px]" style={{ color: 'rgba(228,238,240,0.5)' }}><span>Protein</span><span className="font-semibold" style={{ color: '#E4EEF0' }}>{protein}g</span></div>}
          {fat > 0 && <div className="flex justify-between text-[10px]" style={{ color: 'rgba(228,238,240,0.5)' }}><span>Fat</span><span className="font-semibold" style={{ color: '#E4EEF0' }}>{fat}g</span></div>}
          {nutrition?.source && (
            <p className="text-[9px] text-center mt-1" style={{ color: 'rgba(228,238,240,0.25)' }}>
              {nutrition.source === 'copied_from_yesterday' ? 'copied from yesterday' : 'manually logged'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Activity Card ---
function ActivityCard() {
  const { stats, addSteps, selectedDate } = useFit();
  const [stepsInput, setStepsInput] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const burned = stats?.burned_today || 0;
  const burnedWorkouts = stats?.burned_workouts || 0;
  const stepsCalories = stats?.steps_calories || 0;
  const stepsToday = stats?.steps_today || 0;
  const goal = 600;
  const percentage = Math.min((burned / goal) * 100, 100);
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const today = new Date().toISOString().split('T')[0];

  const handleAddSteps = async (e) => {
    e.preventDefault();
    const val = parseInt(stepsInput);
    if (!val || val < 0) return;
    await addSteps(val, selectedDate);
    setStepsInput('');
    setShowSteps(false);
  };

  return (
    <div className="glass-card p-4 md:p-5 anim-scale-in delay-500" data-testid="activity-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#075056]/20">
            <Activity size={14} className="text-[#075056]" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Activity</span>
        </div>
        <button
          onClick={() => setShowSteps(!showSteps)}
          className="btn-glow p-1.5 rounded-lg bg-[#075056]/15 hover:bg-[#075056]/25 transition-colors"
          data-testid="toggle-steps-form"
        >
          <Footprints size={14} style={{ color: '#075056' }} />
        </button>
      </div>

      {showSteps ? (
        <form onSubmit={handleAddSteps} className="space-y-3">
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'rgba(228,238,240,0.4)' }}>
              Steps for {selectedDate === today ? 'today' : selectedDate}
            </label>
            <input
              type="number"
              className="input-dark w-full text-sm"
              placeholder={stepsToday ? String(stepsToday) : 'e.g. 8000'}
              value={stepsInput}
              onChange={e => setStepsInput(e.target.value)}
              data-testid="steps-input"
            />
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(228,238,240,0.35)' }}>
            Calories = stride length (height × 0.413) × MET 3.5
          </p>
          <button
            type="submit"
            className="btn-glow w-full py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#075056' }}
            data-testid="submit-steps-button"
          >
            Log Steps
          </button>
          {stepsToday > 0 && (
            <p className="text-[10px] text-center" style={{ color: 'rgba(228,238,240,0.4)' }}>
              Currently: {stepsToday.toLocaleString()} steps · {stepsCalories} cal
            </p>
          )}
        </form>
      ) : (
        <>
          <div className="relative w-[120px] h-[120px] mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full circular-progress">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(228,238,240,0.04)" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="url(#activityGrad)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
              <defs>
                <linearGradient id="activityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF5B04" />
                  <stop offset="100%" stopColor="#075056" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="stat-number text-2xl" style={{ color: '#E4EEF0' }}>{burned}</span>
              <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>cal burned</span>
            </div>
          </div>
          <div className="flex justify-between mt-4 text-[10px] px-2" style={{ color: 'rgba(228,238,240,0.3)' }}>
            <span>0</span>
            <span style={{ color: '#FF5B04' }}>{Math.round(percentage)}%</span>
            <span>{goal} cal</span>
          </div>

          {/* Breakdown */}
          <div className="mt-3 space-y-1">
            {burnedWorkouts > 0 && (
              <div className="flex justify-between text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>
                <span>Workout</span>
                <span style={{ color: '#E4EEF0' }}>{burnedWorkouts} cal</span>
              </div>
            )}
            {stepsToday > 0 && (
              <div className="flex justify-between text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>
                <span>{stepsToday.toLocaleString()} steps</span>
                <span style={{ color: '#E4EEF0' }}>{stepsCalories} cal</span>
              </div>
            )}
          </div>

          {stepsToday > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <Footprints size={12} style={{ color: '#075056' }} />
              <span className="text-xs font-semibold" style={{ color: '#E4EEF0' }}>{stepsToday.toLocaleString()}</span>
              <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.4)' }}>steps</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Workouts Card ---
function WorkoutsCard() {
  const { workouts, addWorkout, deleteWorkout } = useFit();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: '', duration: '', calories: '', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.duration || !form.calories) return;
    await addWorkout({
      type: form.type,
      duration: parseInt(form.duration),
      calories: parseInt(form.calories),
      notes: form.notes
    });
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#FF5B04', '#FF5B04', '#FF5B04'] });
    setForm({ type: '', duration: '', calories: '', notes: '' });
    setOpen(false);
  };

  return (
    <div className="glass-card p-4 md:p-5 anim-scale-in delay-600" data-testid="workouts-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FF5B04]/10">
            <Dumbbell size={14} className="text-[#FF5B04]" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Workouts</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="btn-glow p-1.5 rounded-lg bg-[#FF5B04]/10 hover:bg-[#FF5B04]/20 transition-colors" data-testid="add-workout-button">
              <Plus size={14} className="text-[#FF5B04]" />
            </button>
          </DialogTrigger>
          <DialogContent className="glass-card-static border-white/10 max-w-md" style={{ background: '#16232A' }} data-testid="add-workout-modal">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Log Workout</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">Record your workout details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Workout Type</label>
                <input className="input-dark w-full" placeholder="e.g. Chest + Triceps" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} data-testid="workout-type-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Duration (min)</label>
                  <input type="number" className="input-dark w-full" placeholder="45" value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} data-testid="workout-duration-input" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Calories</label>
                  <input type="number" className="input-dark w-full" placeholder="350" value={form.calories} onChange={(e) => setForm({...form, calories: e.target.value})} data-testid="workout-calories-input" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <input className="input-dark w-full" placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} data-testid="workout-notes-input" />
              </div>
              <button type="submit" className="btn-glow w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: '#FF5B04' }} data-testid="submit-workout-button">
                Add Workout
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {workouts.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">No workouts logged yet</p>
        ) : (
          workouts.slice(0, 5).map((w) => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group" data-testid={`workout-item-${w.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="workout-badge">{w.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span>{w.duration}min</span>
                  <span>{w.calories}cal</span>
                  <span>{w.date}</span>
                </div>
              </div>
              <button onClick={() => deleteWorkout(w.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all" data-testid={`delete-workout-${w.id}`}>
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Measurements Card ---
function MeasurementsCard() {
  const { measurements, addMeasurement } = useFit();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ waist: '', chest: '', hips: '', arms: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {};
    if (form.waist) data.waist = parseFloat(form.waist);
    if (form.chest) data.chest = parseFloat(form.chest);
    if (form.hips) data.hips = parseFloat(form.hips);
    if (form.arms) data.arms = parseFloat(form.arms);
    if (Object.keys(data).length === 0) return;
    await addMeasurement(data);
    setForm({ waist: '', chest: '', hips: '', arms: '' });
    setShowForm(false);
  };

  const waistData = measurements.slice(0, 8).reverse().map((m, i) => ({ i, val: m.waist || 0 })).filter(d => d.val > 0);
  const chestData = measurements.slice(0, 8).reverse().map((m, i) => ({ i, val: m.chest || 0 })).filter(d => d.val > 0);

  return (
    <div className="glass-card p-4 md:p-5 anim-scale-in delay-700" data-testid="measurements-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#075056]/10">
            <Ruler size={14} className="text-[#075056]" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Measurements</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-glow p-1.5 rounded-lg bg-[#075056]/10 hover:bg-[#075056]/20 transition-colors" data-testid="toggle-measurements-form">
          <Plus size={14} className="text-[#075056]" />
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {['waist', 'chest', 'hips', 'arms'].map((field) => (
              <div key={field}>
                <label className="text-[10px] text-slate-500 capitalize mb-0.5 block">{field} (cm)</label>
                <input type="number" step="0.1" className="input-dark w-full text-xs py-2" placeholder="0" value={form[field]} onChange={(e) => setForm({...form, [field]: e.target.value})} data-testid={`measurement-${field}-input`} />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-glow w-full py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#075056' }} data-testid="submit-measurement-button">
            Save Measurements
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {waistData.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Waist Trend</p>
              <div className="h-[50px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waistData}>
                    <Line type="monotone" dataKey="val" stroke="#075056" strokeWidth={2} dot={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <XAxis hide dataKey="i" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {chestData.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Chest Trend</p>
              <div className="h-[50px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chestData}>
                    <Line type="monotone" dataKey="val" stroke="#FF5B04" strokeWidth={2} dot={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <XAxis hide dataKey="i" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {measurements.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">No measurements recorded yet</p>
          )}
          {measurements.length > 0 && (
            <div className="text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-400 text-xs mb-1">Latest</p>
              {measurements[0].waist && <p>Waist: <span className="text-white">{measurements[0].waist}cm</span></p>}
              {measurements[0].chest && <p>Chest: <span className="text-white">{measurements[0].chest}cm</span></p>}
              {measurements[0].hips && <p>Hips: <span className="text-white">{measurements[0].hips}cm</span></p>}
              {measurements[0].arms && <p>Arms: <span className="text-white">{measurements[0].arms}cm</span></p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataCards() {
  return (
    <section className="px-4 md:px-6 py-4" data-testid="data-cards-section">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <NutritionCard />
        <ActivityCard />
        <WorkoutsCard />
        <MeasurementsCard />
      </div>
    </section>
  );
}
