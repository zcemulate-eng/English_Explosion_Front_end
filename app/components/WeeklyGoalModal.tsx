'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import { useState } from 'react';
import { Target, Clock, Leaf } from 'lucide-react';

interface Props {
  onComplete: () => void; // 设置完成后关闭弹窗
}

// 预设选项，用户也可以自定义输入
const PRESETS = [
  { label: '1 hr / week',  value: 1,  desc: 'Light practice' },
  { label: '3 hrs / week', value: 3,  desc: 'Steady progress' },
  { label: '5 hrs / week', value: 5,  desc: 'Intensive training' },
  { label: '7 hrs / week', value: 7,  desc: 'Full immersion' },
];

export function WeeklyGoalModal({ onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 最终目标值：优先用自定义输入，否则用预设
  const finalHours = custom ? parseInt(custom) : selected;

  const handleSubmit = async () => {
    if (!finalHours || finalHours < 1 || finalHours > 40) {
      setError('Please choose a goal between 1 and 40 hours.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/weekly-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_hours: finalHours }),
      });

      if (res.ok) {
        onComplete();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save goal.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩（不可点击关闭，强制设置） */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 弹窗主体 */}
      <div className="relative z-10 bg-[#f0e8d5] rounded-3xl shadow-2xl w-full max-w-md border-2 border-[#c2a36d] overflow-hidden">

        {/* 头部 */}
        <div className="bg-[#1c452c] px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="text-[#e8dcb8] w-5 h-5" />
            <span className="text-[#e8dcb8] font-serif text-base tracking-wide">English Explosion</span>
          </div>
          <h2 className="text-[#e8dcb8] text-2xl font-bold mb-1">Set Your Weekly Goal</h2>
          <p className="text-[#c2a36d] text-sm">How many hours do you want to practice this week?</p>
        </div>

        <div className="px-8 py-7 space-y-6">

          {/* 预设选项 */}
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => { setSelected(preset.value); setCustom(''); setError(''); }}
                className={`flex flex-col items-center gap-1 py-4 px-3 rounded-2xl border-2 transition-all
                  ${selected === preset.value && !custom
                    ? 'bg-[#1c452c] border-[#1c452c] text-[#e8dcb8] shadow-lg scale-[1.02]'
                    : 'bg-white border-[#d0bfa1] text-[#3a2818] hover:border-[#1c452c] hover:shadow-md'
                  }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-bold text-base">{preset.label}</span>
                <span className={`text-xs ${selected === preset.value && !custom ? 'text-[#c2a36d]' : 'text-[#8c7355]'}`}>
                  {preset.desc}
                </span>
              </button>
            ))}
          </div>

          {/* 自定义输入 */}
          <div>
            <label className="block text-[#3a2818] text-sm font-bold mb-2 ml-1">
              Or enter a custom goal
            </label>
            <div className="relative flex items-center">
              <Target className="absolute left-4 w-5 h-5 text-[#6b513b]" />
              <input
                type="number"
                min={1}
                max={40}
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setSelected(null); setError(''); }}
                placeholder="e.g. 4"
                className="w-full pl-12 pr-20 py-3 bg-white border-2 border-[#1c452c] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1c452c]/30 text-[#3a2818] font-medium placeholder-[#8c7355]"
              />
              <span className="absolute right-5 text-[#6b513b] font-medium text-sm">hrs / week</span>
            </div>
          </div>

          {/* 当前选择预览 */}
          {finalHours && finalHours >= 1 && (
            <div className="bg-[#1c452c]/10 border border-[#1c452c]/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-[#1c452c] font-bold text-base">
                🎯 Goal: <span className="text-xl">{finalHours}</span> hour{finalHours > 1 ? 's' : ''} per week
              </p>
              <p className="text-[#6b513b] text-xs mt-0.5">
                That&apos;s about {Math.round((finalHours / 7) * 10) / 10} hours a day
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-xl border border-red-200">
              {error}
            </p>
          )}

          {/* 确认按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !finalHours}
            className="w-full bg-[#1c452c] text-[#e8dcb8] py-3.5 rounded-full font-bold text-base hover:bg-[#153621] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {isLoading ? 'Saving...' : "Let's Go 🚀"}
          </button>

          {/* 跳过（用户可以选择本周不设置） */}
          <p className="text-center text-xs text-[#8c7355]">
            You can update your goal anytime from your profile.{' '}
            <button
              onClick={onComplete}
              className="underline hover:text-[#3a2818] transition-colors"
            >
              Skip for now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}