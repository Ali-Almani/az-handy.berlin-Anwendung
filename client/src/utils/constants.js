/** Gleiche Logik wie api.js: leer in Prod = /api unter aktueller Domain */
const raw = import.meta.env.VITE_API_URL;
export const API_URL =
  raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : '/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard'
};
