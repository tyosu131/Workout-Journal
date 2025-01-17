const TOKEN_KEY = "token";

// トークンを保存する関数
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      console.log("[TokenUtils] トークン設定:", token);
    }
  } catch (error) {
    console.error("[TokenUtils] トークンの設定エラー:", error);
  }
};

// トークンを取得する関数
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      console.log("[TokenUtils] 取得されたトークン:", token);
      return token;
    }
    return null;
  } catch (error) {
    console.error("[TokenUtils] トークンの取得エラー:", error);
    return null;
  }
};

// トークンを削除する関数
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
