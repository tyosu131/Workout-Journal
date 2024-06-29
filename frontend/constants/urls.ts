
const urls = {
  NOTE_NEW: (date: string) => `/note/new/${date}`,
  USER_PAGE: '/user',
  CONTACT_PAGE: '/contact',
  TOP_PAGE: '/',
  TIMER_PAGE: '/timer'
} as const satisfies {
  NOTE_NEW: (date: string) => string;
  USER_PAGE: string;
  CONTACT_PAGE: string;
  TOP_PAGE: string;
  TIMER_PAGE: string;
};

export const URLS = urls;