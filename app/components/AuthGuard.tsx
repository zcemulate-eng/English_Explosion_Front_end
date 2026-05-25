'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Leaf, LogIn, UserPlus, Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  // 可选：自定义提示语
  message?: string;
}

export function AuthGuard({ children, message }: Props) {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  // Auth 初始化中：显示加载态，避免闪烁
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4]">
        <Loader2 className="w-10 h-10 text-[#1c452c] animate-spin" />
      </div>
    );
  }

  // 未登录：显示友好提示，不报错
  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundImage: "url('/wood-bg1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative w-full max-w-sm">
          {/* 金角装饰 */}
          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#c2a36d] rounded-tl-lg z-10" />
          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#c2a36d] rounded-tr-lg z-10" />
          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#c2a36d] rounded-bl-lg z-10" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#c2a36d] rounded-br-lg z-10" />

          <div className="bg-[#f0e8d5] rounded-xl border-2 border-[#8c7355] shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="bg-[#1c452c] px-8 py-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Leaf className="text-[#e8dcb8] w-5 h-5" />
                <span className="text-[#e8dcb8] font-serif text-base tracking-wide">
                  English Explosion
                </span>
              </div>
            </div>

            {/* 内容 */}
            <div className="px-8 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#d0bfa1] border-2 border-[#8c7355] flex items-center justify-center mx-auto mb-5">
                <LogIn className="text-[#6b513b] w-8 h-8" />
              </div>

              <h2 className="text-xl font-bold text-[#3a2818] mb-2">
                Login Required
              </h2>
              <p className="text-sm text-[#6b513b] mb-7 leading-relaxed">
                {message || 'You need to be logged in to access this page.'}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center justify-center gap-2 w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold hover:bg-[#153621] transition-all shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  Log In
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="flex items-center justify-center gap-2 w-full bg-[#f0e8d5] text-[#1c452c] py-3 rounded-full font-bold border-2 border-[#1c452c] hover:bg-[#d0bfa1] transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Create an Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已登录：正常渲染子组件
  return <>{children}</>;
}