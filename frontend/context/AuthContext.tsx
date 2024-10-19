import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // axios を利用してバックエンド API を呼び出す
import { User } from '@supabase/supabase-js';
import { getToken, setToken, removeToken } from '../utils/tokenUtils'; // トークン管理用関数をインポート

type AuthContextProps = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>; // login 関数の型を修正
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
      try {
        const token = getToken(); // 保存されているトークンを取得
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`, {
          headers: { Authorization: `Bearer ${token}` }, // トークンをヘッダーに追加
          withCredentials: true, // Cookie による認証情報をバックエンドに送信
        });
        setUser(data?.session?.user ?? null);
        if (data?.session?.access_token) {
          setToken(data.session.access_token); // トークンを保存
        }
      } catch (error) {
        console.error('Failed to get session:', error);
      }
    };

    getSession();
  }, []);

  const login = async (email: string, password: string) => { // email と password を引数にするよう修正
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        email,
        password,
      });
      setUser(data.user); // ユーザー情報をセット
      setToken(data.token); // ログイン時にトークンを保存
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`);
      setUser(null);
      removeToken(); // ログアウト時にトークンを削除
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
