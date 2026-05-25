'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Leaf, X, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Material {
  id: number;
  title: string;
  difficulty_level: string;
  total_duration: number | null;
  description: string | null;
}

interface Props {
  materials: Material[];       // 当前页的材料（分页用）
  allMaterials: Material[];    // 全量材料（搜索用）
  currentPage: number;
  totalPages: number;
}

interface MaterialProgress {
  pct: number;
  completed: boolean;
}

export function MaterialGrid({ materials, allMaterials, currentPage, totalPages }: Props) {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, MaterialProgress>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    const token = localStorage.getItem('access_token');
    fetch(`${API}/progress/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : {})
      .then((data) => setProgressMap(data))
      .catch(() => {});
  }, [isLoggedIn, isLoading]);

  const handleCardClick = (materialId: number) => {
    if (isLoggedIn) {
      router.push(`/practice?materialId=${materialId}`);
    } else {
      setShowAuthPrompt(true);
    }
  };

  // 搜索时在全量数据里过滤，不搜索时用当前页数据
  const filtered = searchQuery.trim()
    ? allMaterials.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : materials;

  return (
    <>
      {/* 搜索框 */}
      <div className="flex items-center justify-end mb-10">
        <div className="relative w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c7355]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search materials... e.g. C9T4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-full border-2 border-[#d0bfa1] bg-white text-sm text-[#3a2818] placeholder-[#a08060] focus:outline-none focus:border-[#1c452c] focus:ring-2 focus:ring-[#1c452c]/10 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c7355] hover:text-[#1c452c] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 无结果提示 */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#8c7355]">
          <p className="text-xl font-medium mb-2">No materials found</p>
          <p className="text-sm">Try a different keyword, e.g. &quot;C9T4&quot; or &quot;C11&quot;</p>
        </div>
      )}

      {/* 材料卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {filtered.map((item) => {
          const prog = progressMap[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-white border border-[#e6d5b8] shadow-lg hover:scale-105 hover:shadow-[0_20px_40px_rgba(92,61,46,0.3)] hover:z-20 hover:rotate-[-1deg]"
            >
              {/* 卡片头部 */}
              <div className="h-36 p-5 flex flex-col justify-start relative overflow-hidden">
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: "url('/card-wood.jpg')",
                    backgroundSize: '125%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <div className="absolute inset-0 bg-[#4a2e1b]/60 mix-blend-multiply z-0" />
                <div className="relative z-10">
                  <span className="inline-block bg-[#1c452c] text-[#e8dcb8] text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm border border-[#0d2617]">
                    {item.difficulty_level || 'B2 Upper Intermediate'}
                  </span>
                  <h3 className="text-white text-xl font-bold leading-snug drop-shadow-md">
                    {item.title}
                  </h3>
                </div>
                {prog?.completed && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#1c452c] text-[#e8dcb8] text-xs font-bold px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </div>
                )}
              </div>

              {/* 卡片内容 */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 text-sm mb-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{item.total_duration ? `${item.total_duration} min` : '30 min'}</span>
                    </div>
                    {prog && !prog.completed && prog.pct > 0 && (
                      <span className="text-xs font-bold text-[#1c452c] bg-[#e8f5e9] px-2 py-0.5 rounded-full">
                        {prog.pct}% done
                      </span>
                    )}
                  </div>
                  <p className="text-[#5c3d2e] text-sm leading-relaxed">
                    {item.description || `${item.title} - High quality listening practice material.`}
                  </p>
                </div>
                {prog && prog.pct > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-[#e6d5b8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${prog.completed ? 'bg-[#1c452c]' : 'bg-[#5a9a6a]'}`}
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 搜索时隐藏分页器 */}
      {!searchQuery && totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-16">
          {currentPage > 1 ? (
            <Link href={`/?page=${currentPage - 1}`} className="px-6 py-2 bg-[#fbf9f4] text-[#1c452c] border-2 border-[#1c452c] rounded-full font-bold hover:bg-[#1c452c] hover:text-[#e8dcb8] transition-colors shadow-sm">
              Previous
            </Link>
          ) : (
            <span className="px-6 py-2 bg-[#e6d5b8]/50 text-[#8c7355] border-2 border-transparent rounded-full font-bold cursor-not-allowed">Previous</span>
          )}
          <span className="text-[#5c3d2e] font-serif font-medium text-lg">
            Page <span className="font-bold">{currentPage}</span> of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={`/?page=${currentPage + 1}`} className="px-6 py-2 bg-[#fbf9f4] text-[#1c452c] border-2 border-[#1c452c] rounded-full font-bold hover:bg-[#1c452c] hover:text-[#e8dcb8] transition-colors shadow-sm">
              Next
            </Link>
          ) : (
            <span className="px-6 py-2 bg-[#e6d5b8]/50 text-[#8c7355] border-2 border-transparent rounded-full font-bold cursor-not-allowed">Next</span>
          )}
        </div>
      )}

      {/* 未登录提示弹窗 */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuthPrompt(false)} />
          <div className="relative z-10 bg-[#f0e8d5] rounded-3xl shadow-2xl w-full max-w-sm p-8 border-2 border-[#c2a36d] text-center">
            <button onClick={() => setShowAuthPrompt(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#8c7355] hover:bg-[#d0bfa1] transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Leaf className="text-[#1c452c] w-6 h-6" />
              <span className="font-serif text-base font-bold text-[#1c452c] tracking-wide">English Explosion</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#3a2818] mb-2">Sign in to start listening</h2>
            <p className="text-sm text-[#6b513b] mb-8 leading-relaxed">
              You need an account to access practice materials.<br />
              Already have one? Log in. New here? Join for free!
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowAuthPrompt(false); router.push('/login'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold text-base shadow-md hover:bg-[#153621] transition-all">
                <LogIn className="w-4 h-4" /> Log In
              </button>
              <button onClick={() => { setShowAuthPrompt(false); router.push('/register'); }}
                className="flex items-center justify-center gap-2 w-full bg-[#f0e8d5] text-[#1c452c] py-3 rounded-full font-bold text-base border-2 border-[#1c452c] hover:bg-[#d0bfa1] transition-all">
                <UserPlus className="w-4 h-4" /> Create an Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}