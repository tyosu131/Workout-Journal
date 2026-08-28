import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { getToken, setToken, removeToken } from "../../../shared/utils/tokenUtils";
import { useRouter } from "next/router";
import { loginUser, logoutUser, fetchSession, refreshAccessToken } from "./api";
import { getErrorSummary } from "../../lib/errorSummary";

type AuthContextProps = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const PUBLIC_AUTH_PATHNAMES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const isPublicAuthRoute = PUBLIC_AUTH_PATHNAMES.has(router.pathname);

  // ================================
  // Logout
  // ================================
  const logout = async () => {
    try {
      await logoutUser();
    } catch (error: unknown) {
      console.error("Logout request failed (non-critical):", getErrorSummary(error));
    } finally {
      setUser(null);
      removeToken();
      router.push("/login");
    }
  };

  // ================================
  // Fetch session
  // ================================
  const getSession = async () => {
    setLoading(true);

    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Call /auth/session through fetchSession(token)
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
            console.error("Failed to refresh access token:", getErrorSummary(refreshError));
            await logout();
          }
        } else {
          console.error(`Failed to get session (status: ${status})`, getErrorSummary(error));
        }
      } else {
        console.error("Failed to get session:", getErrorSummary(error));
      }
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // Refresh token
  // ================================
  const handleTokenRefresh = async () => {
    try {
      const resp = await refreshAccessToken();
      if (resp.access_token) {
        setToken(resp.access_token);
        await getSession();
      }
    } catch (error) {
      console.error("Token refresh failed:", getErrorSummary(error));
      throw error;
    }
  };

  // ================================
  // Initialize on mount
  // ================================
  useEffect(() => {
    if (isPublicAuthRoute) {
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
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
  }, [isPublicAuthRoute, router.pathname, user]);

  // ================================
  // Log in
  // ================================
  const login = async (email: string, password: string) => {
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      setToken(data.token);
      router.push("/top");

      // Fetch the latest session information immediately after login
      await getSession();
    } catch (error: any) {
      console.error("Login failed:", getErrorSummary(error));
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
