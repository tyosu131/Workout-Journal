export const URLS = {
  NOTE_NEW: (date: string) => `/note/new?date=${date}`,
  USER_PAGE: '/user',
  CONTACT_PAGE: '/contact',
  TOP_PAGE: '/top',
  FORGOT_PASSWORD_PAGE: '/forgot-password',
  LOGIN_PAGE: '/login',
  SIGNUP_PAGE: '/signup',
} as const;