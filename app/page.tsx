import React from 'react';
import { HomeNavbar } from './components/HomeNavbar';
import { MaterialGridClient } from './components/MaterialGridClient';
import { WeeklyGoalChecker } from './components/WeeklyGoalChecker';
import { HeroSection } from './components/HeroSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fbf9f4] font-sans text-[#3a2818] overflow-x-hidden relative">
      <WeeklyGoalChecker />
      <HomeNavbar />
      <HeroSection />

      {/* 材料库 — 全部在客户端加载 */}
      <main className="max-w-7xl mx-auto px-8 py-16 relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-[#4a3320] mb-12 drop-shadow-sm">
          Cambridge IELTS Material Library
        </h2>
        <MaterialGridClient />
      </main>
    </div>
  );
}