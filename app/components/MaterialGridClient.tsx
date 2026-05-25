'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, X, LogIn, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PAGE_SIZE = 12;

interface Material {
  id: number;
  title: string;
  difficulty_level: string;
  total_duration: number | null;
  total_sentences: number | null;
  description: string | null;
}

interface MaterialProgress {
  pct: number;
  completed: boolean;
}

export function MaterialGridClient() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  const [materials,    setMaterials]    = useState<Material[]>([]);
  const [progressMap,  setProgressMap]  = useState<Record<number, MaterialProgress>>({});
  const [loadingData,  setLoadingData]  = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // 加载材料列表
  useEffect(() => {
    fetch(`${API}/materials`)
      .then((r) => r.ok ? r.json() : [])
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setLoadingData(false));
  }, []);

  // 加载用户进度（已登录时）
  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    const token = localStorage.getItem('access_token');
    fetch(`${API}/progress/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : {})
      .then(setProgressMap)
      .catch(() => {});
  }, [isLoggedIn, isLoading]);

  const handleCardClick = (materialId: number) => {
    if (isLoggedIn) {
      router.push(`/practice?materialId=${materialId}`);
    } else {
      setShowAuthPrompt(true);
    }
  };

  // 搜索过滤
  const filtered = searchQuery.trim()
    ? materials.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : materials;

  // 分页
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayItems = searchQuery.trim()
    ? filtered  // 搜索时显示所有匹配结果
    : filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 搜索时重置页码
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-[#1c452c] animate-spin" />
        <p className="text-[#8c7355] text-sm">Loading materials...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center text-[#8c7355] py-10">
        <p>Unable to connect to backend. Please make sure the server is running.</p>
      </div>
    );
  }

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
            placeholder="Search... e.g. C9T4"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-full border-2 border-[#d0bfa1] bg-white text-sm text-[#3a2818] placeholder-[#a08060] focus:outline-none focus:border-[#1c452c] focus:ring-2 focus:ring-[#1c452c]/10 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c7355] hover:text-[#1c452c] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 无结果 */}
      {displayItems.length === 0 && (
        <div className="text-center py-16 text-[#8c7355]">
          <p className="text-xl font-medium mb-2">No materials found</p>
          <p className="text-sm">Try a different keyword, e.g. &quot;C9T4&quot; or &quot;C11&quot;</p>
        </div>
      )}

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {displayItems.map((item) => {
          const prog = progressMap[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-white border border-[#e6d5b8] shadow-lg hover:scale-105 hover:shadow-[0_20px_40px_rgba(92,61,46,0.3)] hover:z-20 hover:rotate-[-1deg]"
            >
              <div className="h-36 p-5 flex flex-col justify-start relative overflow-hidden">
                <div className="absolute inset-0 z-0" style={{ backgroundImage: "url('/card-wood.jpg')", backgroundSize: '125%', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 bg-[#4a2e1b]/60 mix-blend-multiply z-0" />
                <div className="relative z-10">
                  <span className="inline-block bg-[#1c452c] text-[#e8dcb8] text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm border border-[#0d2617]">
                    {item.difficulty_level || 'B2 Upper Intermediate'}
                  </span>
                  <h3 className="text-white text-xl font-bold leading-snug drop-shadow-md">{item.title}</h3>
                </div>
                {prog?.completed && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#1c452c] text-[#e8dcb8] text-xs font-bold px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </div>
                )}
              </div>

              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 text-sm mb-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M4 6h16M4 10h16M4 14h16M4 18h7" strokeLinecap="round"/>
                      </svg>
                      <span>{item.total_sentences ? `${item.total_sentences} parts` : '— parts'}</span>
                    </div>
                    {prog && !prog.completed && prog.pct > 0 && (
                      <span className="text-xs font-bold text-[#1c452c] bg-[#e8f5e9] px-2 py-0.5 rounded-full">{prog.pct}% done</span>
                    )}
                  </div>
                  <p className="text-[#5c3d2e] text-sm leading-relaxed">
                    {item.description || `${item.title} - High quality listening practice material.`}
                  </p>
                </div>
                {prog && prog.pct > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-[#e6d5b8] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${prog.completed ? 'bg-[#1c452c]' : 'bg-[#5a9a6a]'}`} style={{ width: `${prog.pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 分页（搜索时隐藏）*/}
      {!searchQuery && totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-16">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-6 py-2 bg-[#fbf9f4] text-[#1c452c] border-2 border-[#1c452c] rounded-full font-bold hover:bg-[#1c452c] hover:text-[#e8dcb8] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-[#5c3d2e] font-serif font-medium text-lg">
            Page <span className="font-bold">{currentPage}</span> of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-6 py-2 bg-[#fbf9f4] text-[#1c452c] border-2 border-[#1c452c] rounded-full font-bold hover:bg-[#1c452c] hover:text-[#e8dcb8] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* 未登录弹窗 */}
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