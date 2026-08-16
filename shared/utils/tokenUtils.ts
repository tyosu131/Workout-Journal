const TOKEN_KEY = "token";

// Save a token
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      console.log("[TokenUtils] トークン設定:", Boolean(token));
    }
  } catch (error) {
    console.error("[TokenUtils] トークンの設定エラー:", error);
  }
};

// Get a token
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      console.log("[TokenUtils] トークン取得:", Boolean(token));
      return token;
    }
    return null;
  } catch (error) {
    console.error("[TokenUtils] トークンの取得エラー:", error);
    return null;
  }
};

// Remove a token
export const removeToken = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      console.log("[TokenUtils] トークン削除");
    }
  } catch (error) {
    console.error("[TokenUtils] トークン削除エラー:", error);
  }
};
