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

  console.log('Base URL for session:', process.env.NEXT_PUBLIC_API_URL);
  // セッションの取得処理
  const getSession = async () => {
    console.log("getSession called");
    setLoading(true);
    try {
      const token = getToken();
      console.log("Token in getSession:", token);
      if (!token) {
        router.push("/login");
        return;
      }

      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.SESSION}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      setUser(data?.user ?? null);
      setToken(data?.access_token ?? token); // 更新されたトークンを保存
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn("Access token expired. Attempting to refresh...");
        try {
          await handleTokenRefresh(); // トークンのリフレッシュを試みる
        } catch (refreshError) {
          console.error("Failed to refresh access token:", refreshError);
          removeToken();
          setUser(null);
          router.push("/login");
        }
      } else {
        console.error("Failed to get session:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // トークンのリフレッシュ処理
  const handleTokenRefresh = async () => {
    try {
      const refreshResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.REFRESH}`,
        {},
        { withCredentials: true }
      );
      
      setToken(refreshResponse.data.access_token); // 新しいアクセストークンを保存
      console.log("Token refreshed:", refreshResponse.data.access_token);
      await getSession(); // リフレッシュ後にセッションを更新
    } catch (error) {
      removeToken();
      setUser(null);
      router.push("/login");
      console.error("Token refresh failed:", error);
    }
  };

  // 初期化処理
  useEffect(() => {
    const token = getToken();
    console.log("Token in useEffect:", token);
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

  // ログイン処理
  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login`,
        { email, password }
      );
      setUser(data.user);
      setToken(data.token);
      console.log("Token set in login:", data.token);
      console.log("Login successful.");
      router.push("/top");
      await getSession();
    } catch (error: any) {
      console.error("Login failed:", error);
    }
  };

  // ログアウト処理
  const logout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`);
      setUser(null);
      removeToken();
      router.push("/login");
    } catch (error: any) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

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
