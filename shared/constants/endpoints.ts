// portfolio real\shared\constants\endpoints.ts
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  SESSION: '/api/auth/session',
  REFRESH: '/api/auth/refresh',
  NOTES: (date: string) => `/api/notes/${date}`,
  NOTES_ALL_TAGS: '/api/notes/all-tags',
  NOTES_BY_TAGS: '/api/notes/by-tags',
  NOTES_TAG: '/api/notes/tag',
};
