'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { useEffect, useState } from 'react';
import { HomeNavbar } from '../components/HomeNavbar';
import { Search, Trash2, Loader2, Download, Pencil, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: number;
  content: string;
  created_at: string;
  material: { id: number; title: string };
  sentence: { id: number; content: string; order_index: number } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── 页面内容 ─────────────────────────────────────────────────────────────────

function NotesContent() {
  const router = useRouter();
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editText,    setEditText]    = useState('');
  const [savingId,    setSavingId]    = useState<number | null>(null);

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

  // ── 编辑笔记 ────────────────────────────────────────────────────────────────
  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: number) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSavingId(id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content: updated.content } : n)));
        cancelEdit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
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

  // ── 搜索 ────────────────────────────────────────────────────────────────────
  const filtered = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.content.toLowerCase().includes(q) ||
      n.material.title.toLowerCase().includes(q) ||
      (n.sentence?.content.toLowerCase().includes(q) ?? false)
    );
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
              {searchQuery ? 'No notes match your search.' : 'No notes yet.'}
            </p>
            {!searchQuery && (
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
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => startEdit(note)}
                      disabled={editingId === note.id}
                      className="text-gray-300 hover:text-[#1c452c] transition-colors disabled:opacity-50"
                      title="Edit note"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 对应句子原文 */}
                {note.sentence && (
                  <p className="text-xs text-[#8c7355] bg-[#f8f4ee] rounded-lg px-3 py-2 leading-relaxed italic">
                    &ldquo;{note.sentence.content}&rdquo;
                  </p>
                )}

                {/* 笔记内容（编辑态显示输入框）*/}
                {editingId === note.id ? (
                  <div className="flex flex-col gap-2 flex-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c452c]/20 focus:border-[#1c452c] resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        disabled={savingId === note.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(note.id)}
                        disabled={savingId === note.id || !editText.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-[#1c452c] rounded-full hover:bg-[#163a24] transition-colors disabled:opacity-50"
                      >
                        {savingId === note.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{note.content}</p>
                )}

                {/* 底部：日期 */}
                <div className="flex items-center justify-end pt-2 border-t border-gray-50">
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