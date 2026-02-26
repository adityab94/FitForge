import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FitContext = createContext(null);

export function FitProvider({ children }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [nutrition, setNutrition] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const api = useCallback(() => axios.create({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchAll = useCallback(async (date) => {
    if (!token) return;
    const d = date || selectedDate;
    try {
      const a = api();
      const [profileRes, statsRes, weightsRes, workoutsRes, measurementsRes, nutritionRes, stepsRes] = await Promise.all([
        a.get(`${API}/profile`),
        a.get(`${API}/stats?date=${d}`),
        a.get(`${API}/weight-logs`),
        a.get(`${API}/workouts`),
        a.get(`${API}/measurements`),
        a.get(`${API}/nutrition?date=${d}`),
        a.get(`${API}/steps`),
      ]);
      setProfile(profileRes.data);
      setStats(statsRes.data);
      setWeightLogs(weightsRes.data);
      setWorkouts(workoutsRes.data);
      setMeasurements(measurementsRes.data);
      setNutrition(nutritionRes.data);
      setSteps(stepsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, api, selectedDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const changeDate = useCallback(async (date) => {
    setSelectedDate(date);
    const a = api();
    const [statsRes, nutritionRes] = await Promise.all([
      a.get(`${API}/stats?date=${date}`),
      a.get(`${API}/nutrition?date=${date}`),
    ]);
    setStats(statsRes.data);
    setNutrition(nutritionRes.data);
  }, [api]);

  const updateProfile = async (data) => {
    const res = await api().put(`${API}/profile`, data);
    setProfile(res.data);
    const statsRes = await api().get(`${API}/stats?date=${selectedDate}`);
    setStats(statsRes.data);
    const weightsRes = await api().get(`${API}/weight-logs`);
    setWeightLogs(weightsRes.data);
  };

  const addWeightLog = async (weight) => {
    await api().post(`${API}/weight-logs`, { weight });
    await fetchAll();
  };

  const addWorkout = async (workout) => {
    await api().post(`${API}/workouts`, workout);
    await fetchAll();
  };

  const deleteWorkout = async (id) => {
    await api().delete(`${API}/workouts/${id}`);
    await fetchAll();
  };

  const addMeasurement = async (measurement) => {
    await api().post(`${API}/measurements`, measurement);
    const res = await api().get(`${API}/measurements`);
    setMeasurements(res.data);
  };

  const logNutritionManual = async (data) => {
    await api().post(`${API}/nutrition/manual`, { ...data, date: selectedDate });
    const [nutritionRes, statsRes] = await Promise.all([
      api().get(`${API}/nutrition?date=${selectedDate}`),
      api().get(`${API}/stats?date=${selectedDate}`),
    ]);
    setNutrition(nutritionRes.data);
    setStats(statsRes.data);
  };

  const copyNutritionFromYesterday = async () => {
    const res = await api().get(`${API}/nutrition/copy-yesterday?date=${selectedDate}`);
    const [nutritionRes, statsRes] = await Promise.all([
      api().get(`${API}/nutrition?date=${selectedDate}`),
      api().get(`${API}/stats?date=${selectedDate}`),
    ]);
    setNutrition(nutritionRes.data);
    setStats(statsRes.data);
    return res.data;
  };

  const addSteps = async (stepsCount, date) => {
    const d = date || selectedDate;
    await api().post(`${API}/steps`, { steps: stepsCount, date: d });
    const [stepsRes, statsRes] = await Promise.all([
      api().get(`${API}/steps`),
      api().get(`${API}/stats?date=${selectedDate}`),
    ]);
    setSteps(stepsRes.data);
    setStats(statsRes.data);
  };

  const updateWater = async (glasses) => {
    await api().post(`${API}/water`, { glasses, date: selectedDate });
    const statsRes = await api().get(`${API}/stats?date=${selectedDate}`);
    setStats(statsRes.data);
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api().post(`${API}/upload/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    await fetchAll();
    return res.data;
  };

  const syncDiary = useCallback(async (username) => {
    const res = await api().post(`${API}/mfp`, { username });
    const nutritionRes = await api().get(`${API}/nutrition?date=${selectedDate}`);
    setNutrition(nutritionRes.data);
    await fetchAll();
    return res.data;
  }, [api, fetchAll, selectedDate]);

  const calcBodyComp = useCallback(async (waist, neck, hip) => {
    const res = await api().post(`${API}/body-composition`, { waist, neck, hip });
    return res.data;
  }, [api]);

  const getBodyCompHistory = useCallback(async () => {
    const res = await api().get(`${API}/body-composition`);
    return res.data;
  }, [api]);

  const getWorkoutHeatmap = useCallback(async () => {
    const res = await api().get(`${API}/workout-heatmap`);
    return res.data;
  }, [api]);

  const uploadProgressPhoto = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api().post(`${API}/progress-photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    return res.data;
  }, [api, token]);

  const getProgressPhotos = useCallback(async () => {
    const res = await api().get(`${API}/progress-photos`);
    return res.data;
  }, [api]);

  const deleteProgressPhoto = useCallback(async (id) => {
    await api().delete(`${API}/progress-photos/${id}`);
  }, [api]);

  const workoutsForDate = workouts.filter(w => w.date === selectedDate);
  const stepsForDate = steps.find(s => s.date === selectedDate) || null;

  return (
    <FitContext.Provider value={{
      profile, stats, weightLogs, workouts, workoutsForDate, measurements, nutrition, steps, stepsForDate,
      loading, selectedDate, changeDate,
      updateProfile, addWeightLog, addWorkout, deleteWorkout, addMeasurement,
      logNutritionManual, copyNutritionFromYesterday, syncDiary,
      addSteps, updateWater, uploadAvatar,
      calcBodyComp, getBodyCompHistory, getWorkoutHeatmap,
      uploadProgressPhoto, getProgressPhotos, deleteProgressPhoto, fetchAll
    }}>
      {children}
    </FitContext.Provider>
  );
}

export function useFit() {
  const ctx = useContext(FitContext);
  if (!ctx) throw new Error('useFit must be used within FitProvider');
  return ctx;
}
