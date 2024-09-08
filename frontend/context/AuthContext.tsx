import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../../backend/supabaseClient'; // Supabase クライアント
import { User } from '@supabase/supabase-js';
import { getToken, setToken, removeToken } from '../utils/tokenUtils'; // トークン管理用関数をインポート

type AuthContextProps = {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setToken(session.access_token); // トークンを保存
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token); // ログイン時にトークンを保存
  };

  const logout = () => {
    supabase.auth.signOut().then(() => {
      setUser(null);
      removeToken(); // ログアウト時にトークンを削除
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
