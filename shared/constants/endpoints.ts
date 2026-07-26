// portfolio real\shared\constants\endpoints.ts
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  SESSION: '/auth/session',
  REFRESH: '/auth/refresh',
  GET_USER: '/auth/get-user',
  UPDATE_USER: '/auth/update-user',
  FORGOT_PASSWORD: '/auth/forgot-password',
  NOTES: (date: string) => `/notes/${date}`,
  NOTES_RANGE: (start: string, end: string) =>
    `/notes/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  NOTES_ALL_TAGS: '/notes/all-tags',
  NOTES_BY_TAGS: '/notes/by-tags',
  NOTES_TAG: '/notes/tag',
};
