
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getServerBaseUrl } from "./utils";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se há autenticação válida no localStorage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const authData = localStorage.getItem("auth_data");
      if (authData) {
        const { expireAt } = JSON.parse(authData);
        const now = new Date().getTime();
        const expiration = new Date(expireAt).getTime();

        if (now < expiration) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("auth_data");
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      localStorage.removeItem("auth_data");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${getServerBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Armazenar dados de autenticação no localStorage
        localStorage.setItem("auth_data", JSON.stringify({
          expireAt: data.expire_at,
          authenticated: true,
        }));

        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_data");
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
