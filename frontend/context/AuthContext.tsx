import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; 
import { User } from '@supabase/supabase-js';
import { getToken, setToken, removeToken } from '../utils/tokenUtils';

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

  useEffect(() => {
    const getSession = async () => {
      try {
        const token = getToken(); // 保存されているトークンを取得
        console.log('Retrieved token:', token); // 取得したトークンをログ出力
        if (!token) {
          console.error('No token found during session retrieval.');
          return;
        }
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true, 
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

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        email,
        password,
      });
      setUser(data.user); 
      setToken(data.token); 
      console.log('Login successful, token set:', data.token);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`);
      setUser(null);
      removeToken(); 
      console.log('Logout successful, token removed.');
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
