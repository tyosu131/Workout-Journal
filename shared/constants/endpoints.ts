// portfolio real\shared\constants\endpoints.ts
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  SESSION: '/api/auth/session',
  REFRESH: '/api/auth/refresh',
  GET_USER: '/api/auth/get-user',
  UPDATE_USER: '/api/auth/update-user',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  NOTES: (date: string) => `/api/notes/${date}`,
  NOTES_RANGE: (start: string, end: string) =>
    `/api/notes/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  NOTES_ALL_TAGS: '/api/notes/all-tags',
  NOTES_BY_TAGS: '/api/notes/by-tags',
  NOTES_TAG: '/api/notes/tag',
};
