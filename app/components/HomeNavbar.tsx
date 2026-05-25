'use client';

import { useState, useRef, useEffect } from 'react';
import { Leaf, LogOut, ChevronDown, LogIn, UserPlus, X, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export function HomeNavbar() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  // Notes / Records 点击拦截：未登录弹窗，已登录直接跳转
  const handleProtectedNav = (path: string) => {
    if (isLoggedIn) {
      router.push(path);
    } else {
      setShowAuthPrompt(true);
    }
  };

  return (
    <>
      <header
        className="w-full h-20 flex items-center justify-between px-8 md:px-16 shadow-md z-50 relative border-b border-[#d0bfa1]/40"
        style={{
          backgroundImage: "url('/wood-bg2.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Leaf className="text-[#1c452c] w-8 h-8" />
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-xl font-bold text-[#1c452c] tracking-wide">English</span>
            <span className="font-serif text-xl font-bold text-[#1c452c] tracking-wide">Explosion</span>
          </div>
        </div>

        {/* 右侧：导航 + 用户区域 */}
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex gap-6 font-medium text-[#5c3d2e]">
            <Link href="/" className="hover:text-[#1c452c] transition-colors">Home</Link>

            {/* Notes：未登录时弹窗，已登录直接跳转 */}
            <button
              onClick={() => handleProtectedNav('/notes')}
              className="hover:text-[#1c452c] transition-colors cursor-pointer bg-transparent border-none p-0 font-medium text-[#5c3d2e]"
            >
              Notes
            </button>

            {/* Records：未登录时弹窗，已登录直接跳转 */}
            <button
              onClick={() => handleProtectedNav('/progress')}
              className="hover:text-[#1c452c] transition-colors cursor-pointer bg-transparent border-none p-0 font-medium text-[#5c3d2e]"
            >
              Records
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 bg-[#d0bfa1]/60 hover:bg-[#d0bfa1] border border-[#8c7355] rounded-full pl-3 pr-2 py-1.5 transition-colors cursor-pointer"
                >
                  <span className="text-[#3a2818] font-semibold text-sm">{user?.nickname}</span>
                  {/* 头像：有图片显示图片，没有显示 nickname 首字母 */}
                  <div className="w-7 h-7 rounded-full bg-[#1c452c] flex items-center justify-center overflow-hidden">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#e8dcb8] text-xs font-bold uppercase">
                        {user?.nickname?.[0] ?? '?'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#3a2818] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-[#e6d5b8] overflow-hidden z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#5c3d2e] hover:bg-[#f4ede0] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#d0bfa1] border-2 border-[#8c7355] flex items-center justify-center shadow-sm">
                <User className="text-[#6b513b] w-6 h-6" />
              </div>
            )}

          </div>
        </div>
      </header>

      {/* ── 未登录提示弹窗（与主页卡片弹窗完全一致）── */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAuthPrompt(false)}
          />
          <div className="relative z-10 bg-[#f0e8d5] rounded-3xl shadow-2xl w-full max-w-sm p-8 border-2 border-[#c2a36d] text-center">
            <button
              onClick={() => setShowAuthPrompt(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#8c7355] hover:bg-[#d0bfa1] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Leaf className="text-[#1c452c] w-6 h-6" />
              <span className="font-serif text-base font-bold text-[#1c452c] tracking-wide">
                English Explosion
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#3a2818] mb-2">
              Sign in to continue
            </h2>
            <p className="text-sm text-[#6b513b] mb-8 leading-relaxed">
              You need an account to access this page.
              <br />
              Already have one? Log in. New here? Join for free!
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowAuthPrompt(false); router.push('/login'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold text-base shadow-md hover:bg-[#153621] transition-all"
              >
                <LogIn className="w-4 h-4" />
                Log In
              </button>
              <button
                onClick={() => { setShowAuthPrompt(false); router.push('/register'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#f0e8d5] text-[#1c452c] py-3 rounded-full font-bold text-base border-2 border-[#1c452c] hover:bg-[#d0bfa1] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Create an Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}