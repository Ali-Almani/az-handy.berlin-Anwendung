import { resolveApiBasePath } from './runtimeApiBase.js';

/** Gleiche Basis wie api.js (inkl. Host-Anpassung bei falscher VITE_API_URL im Build) */
export const API_URL = resolveApiBasePath();

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard'
};
