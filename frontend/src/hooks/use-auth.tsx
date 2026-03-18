import React, { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "@/services/api";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  approvalStatus?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("lawtalk_token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    localStorage.setItem("lawtalk_token", token);
    setIsLoading(true);
    getMe()
      .then((data) => setUser(data))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) localStorage.removeItem("lawtalk_token");
  }, [token]);

  const login = (newToken: string) => setToken(newToken);

  const logout = () => {
    setToken(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
