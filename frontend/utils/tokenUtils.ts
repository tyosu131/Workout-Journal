const TOKEN_KEY = "access_token"; // トークンキー名を指定

// トークンを保存する関数
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error setting token:", error);
  }
};

// トークンを取得する関数
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// トークンを削除する関数
export const removeToken = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
};

// トークンが存在するかを確認する関数
export const hasToken = (): boolean => {
  try {
    return !!getToken(); // トークンが存在するかをチェック
  } catch (error) {
    console.error("Error checking token:", error);
    return false;
  }
};
