'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, LogIn, UserPlus, X } from 'lucide-react';

export function HeroSection() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleStartListening = () => {
    if (isLoggedIn) {
      // 已登录：滚动到材料列表
      document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowAuthPrompt(true);
    }
  };

  return (
    <>
      <section
        className="relative w-full h-[400px] flex items-center px-8 md:px-16"
        style={{
          backgroundImage: "url('/forest-hero.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
        <div className="relative z-10 max-w-2xl text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight shadow-sm">
            Welcome to Your English <br /> Listening Journey
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 opacity-90">
            Master Cambridge IELTS and more with natural audio
          </p>
          <button
            onClick={handleStartListening}
            className="bg-white text-[#1c452c] font-bold px-8 py-3 rounded-full text-lg shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:bg-[#f0e8d5] hover:scale-105 transition-all active:scale-95"
          >
            Start Listening
          </button>
        </div>
      </section>

      {/* 未登录弹窗（与卡片/导航栏完全一致）*/}
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
              Sign in to start listening
            </h2>
            <p className="text-sm text-[#6b513b] mb-8 leading-relaxed">
              You need an account to access practice materials.
              <br />
              Already have one? Log in. New here? Join for free!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowAuthPrompt(false); router.push('/login'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold text-base shadow-md hover:bg-[#153621] transition-all"
              >
                <LogIn className="w-4 h-4" /> Log In
              </button>
              <button
                onClick={() => { setShowAuthPrompt(false); router.push('/register'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#f0e8d5] text-[#1c452c] py-3 rounded-full font-bold text-base border-2 border-[#1c452c] hover:bg-[#d0bfa1] transition-all"
              >
                <UserPlus className="w-4 h-4" /> Create an Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}