'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'; // 新增

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); // 新增：从 Context 获取 login 方法

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');

  // 新增：注册完跳转过来时，自动填入邮箱
  useEffect(() => {
    const prefillEmail = sessionStorage.getItem('prefill_email');
    if (prefillEmail) {
      setEmail(prefillEmail);
      sessionStorage.removeItem('prefill_email'); // 读取一次后立即清除
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok) {
        // 修改：不再手动操作 localStorage，统一交给 AuthContext 管理
        login(data.access_token, data.user, data.expires_at);
        router.push('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Connection refused. Please check if your backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f4ebd0] bg-cover bg-center flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-[1000px] w-full p-8 md:p-12 flex flex-col">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a4027] mb-3 tracking-tight">
            An English Explosion
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-[#1a4027]">
            English Listening Training Platform
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-[#1a4027] text-lg font-bold mb-2 ml-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-6 w-6 text-[#1a4027]" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border-[2.5px] border-[#1a4027] rounded-full focus:outline-none focus:ring-4 focus:ring-[#1a4027]/20 text-gray-800 font-medium text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1a4027] text-lg font-bold mb-2 ml-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-6 w-6 text-[#1a4027]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border-[2.5px] border-[#1a4027] rounded-full focus:outline-none focus:ring-4 focus:ring-[#1a4027]/20 text-gray-800 font-bold tracking-[0.3em] text-lg placeholder:tracking-[0.3em] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex items-center ml-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 accent-[#1a4027] rounded cursor-pointer"
                />
                <label htmlFor="remember" className="ml-3 text-[#1a4027] font-semibold cursor-pointer">
                  Remember Me <span className="font-normal text-sm text-[#6b513b]">(7 days)</span>
                </label>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-end justify-between pt-4 gap-4">
                <div className="text-[#1a4027] text-sm font-medium">
                  <Link href="/forgot-password" className="underline block mb-1">Forgot Password?</Link>
                  <span>Don&apos;t have an account? </span>
                  <Link href="/register" className="font-bold underline">Register</Link>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#1a4027] text-white px-10 py-3 rounded-full text-xl font-bold shadow-lg hover:bg-[#0f2617] disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Logging in...' : 'Log In'}
                </button>
              </div>
            </form>
          </div>

          <div className="flex-1 hidden md:block relative">
            <div
              className="absolute inset-0 w-full h-full rounded-[2rem] overflow-hidden shadow-inner border border-gray-100"
              style={{ backgroundImage: "url('/login-illustration.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}