const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  const { maxAge, ...clearOptions } = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);
};

module.exports = {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  setRefreshCookie,
  clearRefreshCookie,
};
