import React, { useState, useEffect } from 'react';
import { useFit } from '../context/FitContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog';

export default function ProfileModal({ open, onOpenChange }) {
  const { profile, updateProfile } = useFit();
  const [form, setForm] = useState({
    name: '', weight: '', heightCm: '', age: '', gender: 'male', calTarget: '', goalKg: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        weight: profile.weight || '',
        heightCm: profile.heightCm || '',
        age: profile.age || '',
        gender: profile.gender || 'male',
        calTarget: profile.calTarget || '',
        goalKg: profile.goalKg || ''
      });
    }
  }, [profile, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        weight: parseFloat(form.weight),
        heightCm: parseFloat(form.heightCm),
        age: parseInt(form.age),
        gender: form.gender,
        calTarget: parseInt(form.calTarget),
        goalKg: parseFloat(form.goalKg)
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static border-white/10 max-w-md" style={{ background: '#16232A' }} data-testid="profile-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Update your fitness profile details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Name</label>
            <input className="input-dark w-full" placeholder="Your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} data-testid="profile-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Weight (kg)</label>
              <input type="number" step="0.1" className="input-dark w-full" value={form.weight} onChange={(e) => setForm({...form, weight: e.target.value})} data-testid="profile-weight-input" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Height (cm)</label>
              <input type="number" className="input-dark w-full" value={form.heightCm} onChange={(e) => setForm({...form, heightCm: e.target.value})} data-testid="profile-height-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Age</label>
              <input type="number" className="input-dark w-full" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} data-testid="profile-age-input" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Gender</label>
              <select className="select-dark w-full" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})} data-testid="profile-gender-select">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cal Target / day</label>
              <input type="number" className="input-dark w-full" value={form.calTarget} onChange={(e) => setForm({...form, calTarget: e.target.value})} data-testid="profile-cal-target-input" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Goal Weight (kg)</label>
              <input type="number" step="0.1" className="input-dark w-full" value={form.goalKg} onChange={(e) => setForm({...form, goalKg: e.target.value})} data-testid="profile-goal-input" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-glow w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: '#FF5B04' }}
            data-testid="save-profile-button"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
