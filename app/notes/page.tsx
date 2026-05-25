'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { useEffect, useState } from 'react';
import { HomeNavbar } from '../components/HomeNavbar';
import { Search, Trash2, Loader2, Download, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: number;
  content: string;
  note_type: string | null;
  created_at: string;
  material: { id: number; title: string };
  sentence: { id: number; content: string; order_index: number } | null;
}

const NOTE_TYPES = ['all', 'personal', 'difficult_word', 'grammar', 'pronunciation'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── 页面内容 ─────────────────────────────────────────────────────────────────

function NotesContent() {
  const router = useRouter();
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType,  setFilterType]  = useState('all');
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [showFilter,  setShowFilter]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(`${API}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setNotes(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── 删除笔记 ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // ── 导出笔记为 .txt ─────────────────────────────────────────────────────────
  const handleExport = () => {
    const lines: string[] = [
      'English Explosion — My Notes',
      `Exported on ${new Date().toLocaleDateString()}`,
      '='.repeat(50),
      '',
    ];

    filtered.forEach((note, i) => {
      lines.push(`[${i + 1}] ${note.material.title}${note.sentence ? ` · Sentence ${note.sentence.order_index}` : ''}`);
      if (note.sentence) lines.push(`  Original: "${note.sentence.content}"`);
      lines.push(`  Note: ${note.content}`);
      if (note.note_type) lines.push(`  Type: ${note.note_type.replace('_', ' ')}`);
      lines.push(`  Date: ${fmtDate(note.created_at)}`);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `my-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 搜索 + 类型筛选 ─────────────────────────────────────────────────────────
  const filtered = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      n.content.toLowerCase().includes(q) ||
      n.material.title.toLowerCase().includes(q) ||
      (n.sentence?.content.toLowerCase().includes(q) ?? false);
    const matchType =
      filterType === 'all' || n.note_type === filterType;
    return matchSearch && matchType;
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <HomeNavbar />

      {/* 标题与工具栏 */}
      <div className="px-8 md:px-16 py-8 md:py-10 bg-white">
        <h1 className="text-4xl md:text-5xl font-serif text-[#111] mb-8">My Notes</h1>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-3 flex-wrap">
            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1c452c]/20 focus:border-[#1c452c]"
              />
            </div>

            {/* 类型筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-colors
                  ${filterType !== 'all'
                    ? 'bg-[#1c452c] text-[#e8dcb8] border-[#1c452c]'
                    : 'bg-white text-[#5c3d2e] border-gray-200 hover:border-[#1c452c]'
                  }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {filterType === 'all' ? 'All Types' : filterType.replace('_', ' ')}
              </button>
              {showFilter && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 w-44">
                  {NOTE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => { setFilterType(type); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm capitalize transition-colors
                        ${filterType === type ? 'bg-[#f0e8d5] text-[#1c452c] font-bold' : 'text-[#5c3d2e] hover:bg-[#f8f4ee]'}`}
                    >
                      {type === 'all' ? 'All Types' : type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {filtered.length} note{filtered.length !== 1 ? 's' : ''}
            </span>
            {/* 导出按钮 */}
            {filtered.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#1c452c] border border-[#1c452c] rounded-full hover:bg-[#f0e8d5] transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 笔记列表 */}
      <main className="flex-1 px-8 md:px-16 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#1c452c] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-medium mb-2">
              {searchQuery || filterType !== 'all' ? 'No notes match your filter.' : 'No notes yet.'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <p className="text-sm">
                Start practicing and add notes from the{' '}
                <button onClick={() => router.push('/')} className="text-[#1c452c] underline">
                  practice page
                </button>.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((note) => (
              <div
                key={note.id}
                className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                {/* 材料标题（点击跳转精听页并高亮对应句子）*/}
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => router.push(
                      note.sentence
                        ? `/practice?materialId=${note.material.id}&highlightSentenceId=${note.sentence.id}`
                        : `/practice?materialId=${note.material.id}`
                    )}
                    className="text-sm font-bold text-[#1c452c] hover:underline text-left leading-snug"
                  >
                    {note.material.title}
                    {note.sentence && (
                      <span className="text-[#8c7355] font-normal ml-1">
                        · Sentence {note.sentence.order_index}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-2 shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 对应句子原文 */}
                {note.sentence && (
                  <p className="text-xs text-[#8c7355] bg-[#f8f4ee] rounded-lg px-3 py-2 leading-relaxed italic">
                    &ldquo;{note.sentence.content}&rdquo;
                  </p>
                )}

                {/* 笔记内容 */}
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{note.content}</p>

                {/* 底部：类型 + 日期 */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  {note.note_type ? (
                    <span className="text-xs text-[#8c7355] bg-[#f0e8d5] px-2 py-0.5 rounded-full font-medium capitalize">
                      {note.note_type.replace('_', ' ')}
                    </span>
                  ) : <span />}
                  <span className="text-xs text-gray-400">{fmtDate(note.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function NotesPage() {
  return <NotesContent />;
}