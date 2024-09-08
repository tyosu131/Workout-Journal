const TOKEN_KEY = "token";

// トークンを保存する関数
export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// トークンを取得する関数
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// トークンを削除する関数
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};
