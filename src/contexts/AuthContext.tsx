/**
 * 认证上下文
 * 管理用户登录状态和全局认证信息
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, AuthState, LoginRequest, RegisterRequest } from "@/types/auth";
import { loginApi, registerApi, getCurrentUserApi, logoutApi } from "@/services/mock-auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);

  // 初始化时从本地存储恢复用户状态
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      // 从 Tauri 后端读取存储的 token
      const storedToken = await invoke<string>("get_store", { key: "access_token" });

      if (storedToken) {
        // 根据 token 获取用户信息
        const user = await getCurrentUserApi(storedToken);

        setAuthState({
          user,
          token: storedToken,
          isAuthenticated: true
        });
      } else {
        // 没有 token 也是正常状态（用户未登录）
        setLoading(false);
      }
    } catch (error) {
      // 忽略错误，可能是首次使用或存储为空
      console.log("未找到已保存的登录状态:", error);
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    const response = await loginApi(credentials);

    // 保存 token 到 Tauri 后端
    await invoke("set_store", {
      key: "access_token",
      value: response.access_token
    });

    setAuthState({
      user: response.user,
      token: response.access_token,
      isAuthenticated: true
    });
  };

  const register = async (data: RegisterRequest) => {
    const response = await registerApi(data);

    // 保存 token 到 Tauri 后端
    await invoke("set_store", {
      key: "access_token",
      value: response.access_token
    });

    setAuthState({
      user: response.user,
      token: response.access_token,
      isAuthenticated: true
    });
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      // 清除本地存储
      await invoke("delete_store", { key: "access_token" });

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        loading
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
