export const API_ENDPOINTS = {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    SESSION: '/api/auth/session',
    REFRESH: '/api/auth/refresh',
    NOTES: (date: string) => `/api/notes/${date}`,
  };
  