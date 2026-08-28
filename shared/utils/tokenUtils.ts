const TOKEN_KEY = "token";

// Save a token
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    console.error("[TokenUtils] トークンの設定エラー");
  }
};

// Get a token
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      return token;
    }
    return null;
  } catch {
    console.error("[TokenUtils] トークンの取得エラー");
    return null;
  }
};

// Remove a token
export const removeToken = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    console.error("[TokenUtils] トークン削除エラー");
  }
};
