import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('zg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/api/dashboard/stats');
export const getDashboardTrends = () => api.get('/api/dashboard/trends');

// ─── APIs ──────────────────────────────────────────────────────
export const getAPIs = (params = {}) => api.get('/api/apis', { params });
export const getAPI = (id) => api.get(`/api/apis/${id}`);
export const createAPI = (data) => api.post('/api/apis', data);
export const updateAPI = (id, data) => api.patch(`/api/apis/${id}`, data);
export const deleteAPI = (id) => api.delete(`/api/apis/${id}`);
export const quarantineAPI = (id) => api.post(`/api/apis/${id}/quarantine`);
export const decommissionAPI = (id, data) => api.post(`/api/apis/${id}/decommission`, data);
export const reanalyzeAPI = (id) => api.post(`/api/apis/${id}/reanalyze`);
export const getZombieAPIs = () => api.get('/api/apis/zombies');

// ─── Scan ──────────────────────────────────────────────────────
export const runDemoScan = () => api.post('/api/scan/demo');
export const uploadSwagger = (formData) => api.post('/api/scan/swagger', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const scanEndpoints = (endpoints) => api.post('/api/scan/endpoints', { endpoints });
export const getScanHistory = () => api.get('/api/scan/history');

// ─── Security ─────────────────────────────────────────────────
export const getSecurityPosture = () => api.get('/api/security/posture');
export const getSecurityViolations = () => api.get('/api/security/violations');

// ─── Alerts ───────────────────────────────────────────────────
export const getAlerts = (params = {}) => api.get('/api/alerts', { params });
export const resolveAlert = (id, resolvedBy) => api.patch(`/api/alerts/${id}/resolve`, { resolvedBy });

// ─── Auth ─────────────────────────────────────────────────────
export const login = (email, password) => api.post('/api/auth/login', { email, password });

export default api;
