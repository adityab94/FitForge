import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fitforge_token'));
  const [loading, setLoading] = useState(true);

  const authAxios = useCallback(() => {
    const instance = axios.create();
    if (token) instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return instance;
  }, [token]);

  useEffect(() => {
    if (token) {
      authAxios().get(`${API}/auth/me`)
        .then(res => { setUser(res.data); setLoading(false); })
        .catch(() => { localStorage.removeItem('fitforge_token'); setToken(null); setUser(null); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token, authAxios]);

  const loginWithGoogle = async (credential) => {
    const res = await axios.post(`${API}/auth/google`, { credential });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('fitforge_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('fitforge_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithPassword = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('fitforge_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('fitforge_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, loginWithPassword, register, logout, authAxios, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
