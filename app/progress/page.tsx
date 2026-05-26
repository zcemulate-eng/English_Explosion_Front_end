'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { useEffect, useState } from 'react';
import { X, Clock, BookOpen, Target, Flame, Play, CheckCircle2, Loader2, AlignLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HomeNavbar } from '../components/HomeNavbar';
import { WeeklyGoalModal } from '../components/WeeklyGoalModal';

interface ProgressRecord {
  id: number;
  material_id: number;
  progress_percentage: string | null;
  last_accessed_at: string;
  completed_at: string | null;
  material: { id: number; title: string; difficulty_level: string | null };
}
interface WeeklyGoalData {
  target_hours: string;
  completed_hours: string;
  is_achieved: boolean;
}
interface ProgressStats {
  totalHours: string;
  accuracy: number | null;
  streak: number;
  sentencesCount?: number;
}
interface TrendPoint { date: string; accuracy: number }
interface DailyPoint { date: string; minutes: number }
interface ProgressData {
  inProgress: ProgressRecord[];
  completed: ProgressRecord[];
  weeklyGoal: WeeklyGoalData | null;
  stats: ProgressStats;
  accuracyTrend: TrendPoint[];
  dailyDuration: DailyPoint[];
}

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: string }) => (
  <div className="bg-[#fdf8e7] rounded-2xl border-[3.5px] border-[#2a5732] p-4 flex flex-col items-center justify-center shadow-[0_4px_6px_rgba(42,87,50,0.15)]">
    <div className="w-12 h-12 mb-1 flex items-center justify-center">
      <Icon className="w-10 h-10 text-[#2a5732] stroke-[2]" />
    </div>
    <p className="text-[#4a3018] text-[13px] font-bold mb-0.5">{title}</p>
    <p className="text-[#4a3018] text-3xl font-black tracking-tight">{value}</p>
  </div>
);

const CapsuleProgressBar = ({ label, percentage }: { label: string, percentage: number }) => (
  <div className="w-full bg-[#1b3d22] h-[22px] rounded-full relative overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
    <div className="absolute top-0 left-0 h-full bg-[#3ca354]" style={{ width: `${percentage}%` }} />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-[11px] font-bold z-10">{label}</span>
  </div>
);

// 准确率趋势折线图（纯 SVG，0–100%）
const AccuracyTrendChart = ({ data }: { data: TrendPoint[] }) => {
  if (data.length < 2) {
    return <p className="text-[#8a6b4a] text-[11px] text-center py-6">Practice on more days to see your trend.</p>;
  }
  const W = 320, H = 90, padX = 6, padY = 8;
  const xs = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const ys = (v: number) => padY + (1 - v / 100) * (H - padY * 2);
  const line = data.map((d, i) => `${xs(i)},${ys(d.accuracy)}`).join(' ');
  const area = `${padX},${H - padY} ${line} ${xs(data.length - 1)},${H - padY}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 90 }}>
      {[0, 50, 100].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={ys(g)} y2={ys(g)} stroke="#d2c4a8" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      <polygon points={area} fill="#3ca354" opacity="0.15" />
      <polyline points={line} fill="none" stroke="#2a5732" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.accuracy)} r="3" fill="#2a5732" />
      ))}
    </svg>
  );
};

// 每日练习时长柱状图（分钟，纯 SVG）
const DailyDurationChart = ({ data }: { data: DailyPoint[] }) => {
  if (data.length === 0) {
    return <p className="text-[#8a6b4a] text-[11px] text-center py-6">No practice time logged yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.minutes), 1);
  return (
    <div className="flex items-end justify-between gap-[3px] h-[90px] pt-2">
      {data.map((d, i) => {
        const h = Math.max((d.minutes / max) * 72, 2);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: ${d.minutes} min`}>
            <div className="w-full bg-[#3ca354] rounded-t-[3px] border border-[#2a5732]" style={{ height: `${h}px` }} />
          </div>
        );
      })}
    </div>
  );
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY_DATA: ProgressData = {
  inProgress: [], completed: [], weeklyGoal: null,
  stats: { totalHours: '0', accuracy: null, streak: 0, sentencesCount: 0 },
  accuracyTrend: [], dailyDuration: [],
};

function ProgressContent() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(`${API}/progress/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        // 确保返回的数据结构符合预期，stats 字段也做兜底
        if (d && Array.isArray(d.inProgress) && Array.isArray(d.completed)) {
          setData({
            ...EMPTY_DATA,
            ...d,
            stats: d.stats ?? EMPTY_DATA.stats,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalMaterials = (data?.inProgress.length ?? 0) + (data?.completed.length ?? 0);
  const latest = data?.inProgress[0] ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ backgroundImage: "url('/wood_bg3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <HomeNavbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[800px] rounded-[2.2rem] shadow-[0_25px_50px_rgba(0,0,0,0.5)] border-2 border-[#16301a] relative bg-black/15">
          <div className="absolute inset-0 rounded-[2.1rem] border-[12px] border-[#316439] pointer-events-none z-10" />
          <div className="absolute inset-[12px] rounded-[1.5rem] border-[2.5px] border-[#224a2a] shadow-[inset_0_0_24px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

          <div className="relative z-20 p-9">
            {/* 标题 */}
            <div className="flex justify-center items-center mb-6 relative">
              <h2 className="text-white text-[28px] font-bold drop-shadow-md">My Progress</h2>
              <button onClick={() => router.push('/')} className="absolute right-0 text-[#fdf8e7] hover:text-white transition-all">
                <X className="w-7 h-7 stroke-[3] drop-shadow-md" />
              </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
              <StatCard icon={Clock}     title="Total Hours" value={data?.stats.totalHours ?? '0'} />
              <StatCard icon={BookOpen}  title="Materials"   value={String(totalMaterials)} />
              <StatCard icon={AlignLeft} title="Sentences"   value={String(data?.stats.sentencesCount ?? 0)} />
              <StatCard icon={Target}    title="Accuracy"    value={data?.stats.accuracy != null ? `${data.stats.accuracy}%` : '—'} />
              <StatCard icon={Flame}     title="Streak"      value={data?.stats.streak ? `${data.stats.streak}d` : '—'} />
            </div>

            {/* 趋势分析：准确率趋势 + 每日练习时长 */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 w-full md:w-1/2">
                <h3 className="text-[#4a3018] font-bold text-[14px] mb-2">Accuracy Trend</h3>
                <AccuracyTrendChart data={data?.accuracyTrend ?? []} />
              </div>
              <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 w-full md:w-1/2">
                <h3 className="text-[#4a3018] font-bold text-[14px] mb-2">Daily Practice (min)</h3>
                <DailyDurationChart data={data?.dailyDuration ?? []} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* 左栏 */}
              <div className="flex flex-col gap-4 w-full md:w-[48%]">
                {/* Weekly Goal */}
                <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4">
                  <h3 className="text-[#4a3018] font-bold text-[14px] mb-2.5">Weekly Goal</h3>
                  {data?.weeklyGoal ? (() => {
                    const target    = Number(data.weeklyGoal.target_hours);
                    const completed = Number(data.weeklyGoal.completed_hours);
                    const pct       = Math.min(Math.round((completed / target) * 100), 100);
                    return (
                      <>
                        <CapsuleProgressBar
                          label={data.weeklyGoal.is_achieved ? '🎉 Done!' : `${pct}%`}
                          percentage={pct}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[#8a6b4a] text-[11px] font-semibold">
                            {completed.toFixed(1)} / {target} hrs this week
                          </p>
                          <button
                            onClick={() => setShowGoalModal(true)}
                            className="text-[#2a5732] text-[11px] font-bold underline hover:opacity-70 transition-opacity"
                          >
                            Change
                          </button>
                        </div>
                      </>
                    );
                  })() : (
                    <>
                      <CapsuleProgressBar label="No goal set" percentage={0} />
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => setShowGoalModal(true)}
                          className="inline-flex items-center gap-1.5 bg-[#2a5732] text-white text-[12px] font-bold px-4 py-1.5 rounded-full hover:bg-[#1e3f24] transition-colors shadow-sm"
                        >
                          🎯 Set Weekly Goal
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* In Progress 最近一条 */}
                {latest ? (
                  <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[#8a6b4a] text-[11px] font-bold mb-1 uppercase tracking-wide">In Progress</p>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 mt-0.5 rounded-full bg-[#2a5732] flex items-center justify-center shrink-0">
                          <Play className="w-3 h-3 text-[#fdf8e7] fill-current ml-0.5" />
                        </div>
                        <div>
                          <p className="text-[#4a3018] font-bold text-[14px] leading-[1.2] mb-1">{latest.material.title}</p>
                          <p className="text-[#8a6b4a] text-[11px] font-semibold">{fmtDate(latest.last_accessed_at)}</p>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const pct = Math.round(Number(latest.progress_percentage) || 0);
                      return (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ background: `conic-gradient(#2a5732 ${pct}%, #1b3d22 0)` }}
                        >
                          <div className="w-11 h-11 bg-[#fdf8e7] rounded-full flex items-center justify-center border-2 border-[#2a5732]">
                            <span className="text-[#2a5732] font-black text-xs">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 text-center text-[#8a6b4a] text-sm">
                    No materials in progress yet.
                  </div>
                )}
              </div>

              {/* 右栏：Recent Activity */}
              <div className="w-full md:w-[52%] flex flex-col">
                <h3 className="text-white font-bold text-[15px] mb-2 drop-shadow-sm ml-1">Recent Activity</h3>
                <div className="bg-[#fdf8e7] flex-1 rounded-2xl border-[3px] border-[#2a5732] p-4 flex flex-col gap-3 max-h-52 overflow-y-auto">
                  {data?.inProgress.map((r, i) => (
                    <React.Fragment key={r.id}>
                      {i > 0 && <div className="h-[1px] w-full bg-[#d2c4a8]" />}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 mt-0.5 rounded-full bg-[#2a5732] flex items-center justify-center shrink-0 shadow-sm">
                          <Play className="w-3.5 h-3.5 text-[#fdf8e7] fill-current ml-0.5" />
                        </div>
                        <div>
                          <p className="text-[#8a6b4a] text-[11px] font-bold mb-0.5">
                            In Progress · {Math.round(Number(r.progress_percentage) || 0)}%
                          </p>
                          <p className="text-[#4a3018] font-bold text-[14px] leading-tight mb-0.5">{r.material.title}</p>
                          <p className="text-[#8a6b4a] text-[11px] font-semibold">{fmtDate(r.last_accessed_at)}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {(data?.inProgress.length ?? 0) > 0 && (data?.completed.length ?? 0) > 0 && (
                    <div className="h-[1px] w-full bg-[#d2c4a8]" />
                  )}

                  {data?.completed.map((r, i) => (
                    <React.Fragment key={r.id}>
                      {i > 0 && <div className="h-[1px] w-full bg-[#d2c4a8]" />}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 mt-0.5 rounded-full bg-[#3ca354] flex items-center justify-center shrink-0 border border-[#2a5732] shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[#8a6b4a] text-[11px] font-bold mb-0.5">Completed</p>
                          <p className="text-[#4a3018] font-bold text-[14px] leading-tight mb-0.5">{r.material.title}</p>
                          <p className="text-[#8a6b4a] text-[11px] font-semibold">
                            {r.completed_at ? fmtDate(r.completed_at) : ''}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {totalMaterials === 0 && (
                    <p className="text-[#8a6b4a] text-sm text-center py-4">No activity yet. Start practicing!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Continue Learning / Resume */}
            {latest ? (
              <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 flex items-center justify-between">
                <div className="flex-1 pr-6">
                  <h3 className="text-[#4a3018] font-bold text-[15px] mb-3">Continue Learning</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2a5732] flex items-center justify-center shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      <Play className="w-5 h-5 text-[#fdf8e7] fill-current ml-1" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#4a3018] font-bold text-[15px] mb-2">{latest.material.title}</p>
                      <CapsuleProgressBar
                        label={`${Math.round(Number(latest.progress_percentage) || 0)}%`}
                        percentage={Math.round(Number(latest.progress_percentage) || 0)}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/practice?materialId=${latest.material_id}`)}
                  className="bg-[#2a5732] text-white px-7 py-3 rounded-xl font-bold text-[15px] border-[2px] border-[#16301a] shadow-[0_4px_0_#16301a] active:translate-y-1 active:shadow-none transition-all mr-2 mt-4"
                >
                  Resume
                </button>
              </div>
            ) : (
              <div className="bg-[#fdf8e7] rounded-2xl border-[3px] border-[#2a5732] p-4 text-center text-[#8a6b4a]">
                <p className="font-bold text-[15px]">Ready to start?</p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-3 bg-[#2a5732] text-white px-7 py-2 rounded-xl font-bold text-[14px] border-[2px] border-[#16301a] shadow-[0_4px_0_#16301a] active:translate-y-1 transition-all"
                >
                  Browse Materials
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Goal 设置弹窗 */}
      {showGoalModal && (
        <WeeklyGoalModal
          onComplete={() => {
            setShowGoalModal(false);
            // 刷新进度数据，让进度条立即更新
            const token = localStorage.getItem('access_token');
            fetch(`${API}/progress/me`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.json())
              .then((d) => {
                if (d && Array.isArray(d.inProgress)) {
                  setData({ ...EMPTY_DATA, ...d, stats: d.stats ?? EMPTY_DATA.stats });
                }
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

export default function ProgressPage() {
  return <ProgressContent />;
}