const TOKEN_KEY = "access_token"; // トークンキー名を指定

// トークンを保存する関数
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      console.log("Token set:", token); // トークンが正しくセットされたか確認
    }
  } catch (error) {
    console.error("Error setting token:", error);
  }
};

// トークンを取得する関数
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      console.log("Token retrieved:", token); // トークンが正しく取得されたか確認
      return token;
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
      console.log("Token removed"); // トークンが削除されたか確認
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
};
