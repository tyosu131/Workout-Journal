import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "@supabase/supabase-js";
import { getToken, setToken, removeToken } from "../../../shared/utils/tokenUtils";
import { useRouter } from "next/router";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";
import { loginUser, fetchSession, refreshAccessToken } from "./api";

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

  // ================================
  // ログアウト処理
  // ================================
  const logout = async () => {
    try {
      // await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`);
    } catch (error: any) {
      console.error("Logout request failed (non-critical):", error?.message);
    } finally {
      setUser(null);
      removeToken();
      router.push("/login");
    }
  };

  // ================================
  // セッションの取得処理
  // ================================
  const getSession = async () => {
    console.log("getSession called");
    setLoading(true);

    try {
      const token = getToken();
      if (!token) {
        console.log("No token found, not calling session API.");
        router.push("/login");
        return;
      }

      // fetchSession(token) で /api/auth/session を呼ぶ
      const sessionRes = await fetchSession(token);
      if (sessionRes.user) {
        setUser(sessionRes.user);
      }

    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          console.warn("Access token expired or invalid. Attempting to refresh...");
          try {
            await handleTokenRefresh();
          } catch (refreshError) {
            console.error("Failed to refresh access token:", refreshError);
            logout();
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
  // トークンのリフレッシュ処理
  // ================================
  const handleTokenRefresh = async () => {
    try {
      const resp = await refreshAccessToken();
      if (resp.access_token) {
        setToken(resp.access_token);
        console.log("Token refreshed:", resp.access_token);
        await getSession();
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  };

  // ================================
  // マウント時の初期化処理
  // ================================
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.log("No token found, skipping session check");
      router.push("/login");
      setLoading(false);
      return;
    }

    if (!user) {
      getSession();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ================================
  // ログイン処理
  // ================================
  const login = async (email: string, password: string) => {
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      setToken(data.token);
      router.push("/top");

      // ログイン直後にもセッション取得して最新情報を反映
      await getSession();
    } catch (error: any) {
      console.error("Login failed:", error);
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
