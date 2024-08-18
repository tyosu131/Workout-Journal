import React, { createContext, useContext, useState } from 'react';

// ユーザー型の定義
type User = {
  id: string;
  email: string;
};

type AuthContextProps = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

// AuthContextの作成
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (user: User) => {
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuthフックの作成
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
