const TOKEN_KEY = "access_token";

// トークンを保存する関数
export const setToken = (token: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token); // sessionStorage から localStorage に変更
      console.log("トークン設定:", token);
    }
  } catch (error) {
    console.error("トークンの設定エラー:", error);
  }
};

// トークンを取得する関数
export const getToken = (): string | null => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY); // sessionStorage から localStorage に変更
      console.log("取得されたトークン:", token);
      return token;
    }
    return null;
  } catch (error) {
    console.error("トークンの取得エラー:", error);
    return null;
  }
};

// トークンを削除する関数
export const removeToken = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY); // sessionStorage から localStorage に変更
      console.log("トークン削除");
    }
  } catch (error) {
    console.error("トークン削除エラー:", error);
  }
};
