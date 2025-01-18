// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "@supabase/supabase-js";
import { getToken, setToken, removeToken } from "../../shared/utils/tokenUtils";
import { useRouter } from "next/router";
import { API_ENDPOINTS } from "../../shared/constants/endpoints";

type AuthContextProps = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  console.log("Base URL for session:", process.env.NEXT_PUBLIC_API_URL);

  // ================================
  //  ログアウト処理
  // ================================
  const logout = async () => {
    try {
      // もしサーバー側に /api/auth/logout があるなら呼び出す（存在しないなら削除でOK）
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`);
    } catch (error: any) {
      console.error("Logout request failed (non-critical):", error?.message);
    } finally {
      // ログアウト時はフロント側トークン・ユーザー情報をクリア
      setUser(null);
      removeToken();
      router.push("/login");
    }
  };

  // ================================
  //  セッションの取得処理
  // ================================
  const getSession = async () => {
    console.log("getSession called");
    setLoading(true);

    try {
      const token = getToken();
      console.log("Token in getSession:", token);

      // トークンが無ければログイン画面へ
      if (!token) {
        router.push("/login");
        return;
      }

      // /api/auth/session を呼び、ユーザー情報を取得
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.SESSION}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      // ユーザー情報をステートに保存
      setUser(data?.user ?? null);

      // もしサーバーがアクセストークンを更新して返すなら、それを保存
      setToken(data?.access_token ?? token);
    } catch (error: any) {
      // ================================
      //  401 or 403 のとき
      // ================================
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          console.warn("Access token expired or invalid. Attempting to refresh...");

          try {
            await handleTokenRefresh(); // トークンのリフレッシュを試みる
          } catch (refreshError) {
            // リフレッシュ自体が失敗した場合 -> 即ログアウト & /login へ
            console.error("Failed to refresh access token:", refreshError);
            logout(); // removeToken + setUser(null) + router.push("/login")
          }
        } else {
          console.error(`Failed to get session (status: ${status})`, error);
        }
      } else {
        console.error("Failed to get session:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // ================================
  //  トークンのリフレッシュ処理
  // ================================
  const handleTokenRefresh = async () => {
    try {
      const refreshResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.REFRESH}`,
        {},
        { withCredentials: true }
      );
      // リフレッシュで新しいアクセストークンが返る想定
      setToken(refreshResponse.data.access_token);
      console.log("Token refreshed:", refreshResponse.data.access_token);

      // リフレッシュ後にセッションを再取得
      await getSession();
    } catch (error) {
      // リフレッシュ失敗 -> ここで例外を投げる (呼び出し元が catch して logout)
      console.error("Token refresh failed:", error);
      throw error;
    }
  };

  // ================================
  //  初期化処理 (コンポーネントマウント時)
  // ================================
  useEffect(() => {
    const token = getToken();
    console.log("Token in useEffect:", token);

    // トークンがある & userが未取得ならセッション取得
    if (token && !user) {
      console.log("Valid token found, fetching session...");
      getSession();
    } else if (!token) {
      console.log("No valid token found, redirecting to login...");
      router.push("/login");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ================================
  //  ログイン処理
  // ================================
  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login`,
        { email, password }
      );
      // サーバーから返ってきたユーザー情報 & トークンを保存
      setUser(data.user);
      setToken(data.token);
      console.log("Token set in login:", data.token);
      console.log("Login successful.");

      // ログイン後トップページへ
      router.push("/top");

      // 再度セッションを取って最新情報を反映
      await getSession();
    } catch (error: any) {
      console.error("Login failed:", error);
    }
  };

  // ローディング中は簡易表示
  if (loading) {
    return <div>Loading...</div>;
  }

  // ================================
  //  Contextに値を提供
  // ================================
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
