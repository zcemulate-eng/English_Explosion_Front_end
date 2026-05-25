'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser, expiresAt?: number) => void;
  logout: () => void;
}

// ─── Context 创建 ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 应用启动时：从 localStorage 读取 Token，先做本地过期校验，再调用 /auth/me 恢复会话
  useEffect(() => {
    const restoreSession = async () => {
      const token     = localStorage.getItem('access_token');
      const expiresAt = localStorage.getItem('token_expires_at');

      if (!token) {
        setIsLoading(false);
        return;
      }

      // 本地过期检查：如果有记录的过期时间且已超过，直接清除，不请求后端
      if (expiresAt && Date.now() > Number(expiresAt)) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expires_at');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const userData: AuthUser = await res.json();
          setUser(userData);
        } else {
          // 后端验证失败（token 过期或无效）→ 清除
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_expires_at');
        }
      } catch {
        // 网络异常 → 保留登录态，等网络恢复
        console.warn('Could not reach auth server, staying logged in locally.');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // 登录：保存 Token + 过期时间戳 到 localStorage
  // expiresAt 由后端返回（毫秒时间戳），没有则默认 1 天后过期
  const login = useCallback((token: string, userData: AuthUser, expiresAt?: number) => {
    const expiry = expiresAt ?? Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('access_token',    token);
    localStorage.setItem('token_expires_at', String(expiry));
    setUser(userData);
  }, []);

  // 退出：清除所有认证数据
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expires_at');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within <AuthProvider>');
  return context;
}