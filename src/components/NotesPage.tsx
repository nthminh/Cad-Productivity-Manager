import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Pin, PinOff, Trash2, Pencil, Check, StickyNote } from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getCurrentUser } from '../lib/auth';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  username: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const NOTE_COLORS = [
  { value: 'bg-white', label: 'Trắng' },
  { value: 'bg-yellow-100', label: 'Vàng' },
  { value: 'bg-green-100', label: 'Xanh lá' },
  { value: 'bg-blue-100', label: 'Xanh dương' },
  { value: 'bg-pink-100', label: 'Hồng' },
  { value: 'bg-purple-100', label: 'Tím' },
  { value: 'bg-orange-100', label: 'Cam' },
  { value: 'bg-red-100', label: 'Đỏ' },
];

const COLOR_BORDER: Record<string, string> = {
  'bg-white': 'border-slate-200',
  'bg-yellow-100': 'border-yellow-300',
  'bg-green-100': 'border-green-300',
  'bg-blue-100': 'border-blue-300',
  'bg-pink-100': 'border-pink-300',
  'bg-purple-100': 'border-purple-300',
  'bg-orange-100': 'border-orange-300',
  'bg-red-100': 'border-red-300',
};

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // New note form
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('bg-white');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('bg-white');

  const newContentRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!db || !currentUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'notes'),
      where('username', '==', currentUser.username),
    );
    const unsub = onSnapshot(q, (snap) => {
      const notesList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
      notesList.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      setNotes(notesList);
      setLoading(false);
    }, (err) => { console.error('Failed to load notes:', err); setLoading(false); });
    return () => unsub();
  }, [currentUser?.username]);

  const handleCreateNote = async () => {
    if (!db || !currentUser || (!newTitle.trim() && !newContent.trim())) {
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      setNewColor('bg-white');
      return;
    }
    try {
      await addDoc(collection(db, 'notes'), {
        title: newTitle.trim(),
        content: newContent.trim(),
        color: newColor,
        pinned: false,
        username: currentUser.username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to create note:', e);
    }
    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
    setNewColor('bg-white');
  };

  const handleDelete = async (noteId: string) => {
    if (!db || !window.confirm('Xóa ghi chú này?')) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const handleTogglePin = async (note: Note) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notes', note.id), { pinned: !note.pinned, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditColor('bg-white');
  };

  const saveEdit = async (noteId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notes', noteId), {
        title: editTitle.trim(),
        content: editContent.trim(),
        color: editColor,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to update note:', e);
    }
    cancelEdit();
  };

  const pinnedNotes = notes.filter((n) => n.pinned);
  const unpinnedNotes = notes.filter((n) => !n.pinned);

  const renderNote = (note: Note) => {
    const isEditing = editingId === note.id;
    const borderClass = COLOR_BORDER[note.color] ?? 'border-slate-200';
    return (
      <div
        key={note.id}
        className={`relative rounded-2xl border ${borderClass} ${note.color} shadow-sm p-4 flex flex-col gap-2 group transition-shadow hover:shadow-md`}
      >
        {isEditing ? (
          <>
            <input
              className="w-full text-sm font-semibold bg-transparent border-b border-slate-300 outline-none pb-1 mb-1 placeholder-slate-400"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Tiêu đề"
            />
            <textarea
              className="w-full text-sm bg-transparent outline-none resize-none min-h-[80px] placeholder-slate-400"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Nội dung ghi chú..."
              rows={4}
            />
            <div className="flex items-center gap-1 flex-wrap">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setEditColor(c.value)}
                  className={`w-5 h-5 rounded-full border-2 ${c.value} ${editColor === c.value ? 'border-slate-700 scale-110' : 'border-slate-300'} transition-transform`}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={cancelEdit}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => saveEdit(note.id)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Check size={12} />
                Lưu
              </button>
            </div>
          </>
        ) : (
          <>
            {note.title && (
              <h3 className="font-semibold text-slate-900 text-sm leading-snug break-words">{note.title}</h3>
            )}
            {note.content && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{note.content}</p>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              <button
                title={note.pinned ? 'Bỏ ghim' : 'Ghim ghi chú'}
                onClick={() => handleTogglePin(note)}
                className="p-1.5 rounded-lg hover:bg-black/10 text-slate-500 hover:text-slate-800 transition-colors"
              >
                {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button
                title="Chỉnh sửa"
                onClick={() => startEdit(note)}
                className="p-1.5 rounded-lg hover:bg-black/10 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                title="Xóa ghi chú"
                onClick={() => handleDelete(note.id)}
                className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {note.pinned && (
              <div className="absolute top-2 right-2 text-amber-500">
                <Pin size={14} />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* New note input box (Google Keep style) */}
      <div className="max-w-xl mx-auto">
        {!isCreating ? (
          <button
            onClick={() => {
              setIsCreating(true);
              requestAnimationFrame(() => newContentRef.current?.focus());
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:shadow-md transition-shadow text-sm"
          >
            <Plus size={18} className="text-slate-400" />
            Tạo ghi chú mới...
          </button>
        ) : (
          <div className={`${newColor} border ${COLOR_BORDER[newColor] ?? 'border-slate-200'} rounded-2xl shadow-md p-4 flex flex-col gap-3`}>
            <input
              className="w-full text-sm font-semibold bg-transparent border-b border-slate-200 outline-none pb-1 placeholder-slate-400"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tiêu đề"
              onKeyDown={(e) => { if (e.key === 'Escape') handleCreateNote(); }}
            />
            <textarea
              ref={newContentRef}
              className="w-full text-sm bg-transparent outline-none resize-none min-h-[80px] placeholder-slate-400"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Ghi chú..."
              rows={4}
              onKeyDown={(e) => { if (e.key === 'Escape') handleCreateNote(); }}
            />
            <div className="flex items-center gap-1 flex-wrap">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setNewColor(c.value)}
                  className={`w-5 h-5 rounded-full border-2 ${c.value} ${newColor === c.value ? 'border-slate-700 scale-110' : 'border-slate-300'} transition-transform`}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsCreating(false); setNewTitle(''); setNewContent(''); setNewColor('bg-white'); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-black/10 transition-colors"
              >
                <X size={14} />
                Hủy
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newTitle.trim() && !newContent.trim()}
                className="flex items-center gap-1 px-4 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <Check size={14} />
                Lưu
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12 text-slate-400 text-sm">Đang tải ghi chú...</div>
      )}

      {!loading && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <StickyNote size={48} className="opacity-30" />
          <p className="text-sm">Chưa có ghi chú nào. Tạo ghi chú đầu tiên của bạn!</p>
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Đã ghim</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pinnedNotes.map(renderNote)}
          </div>
        </div>
      )}

      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Khác</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unpinnedNotes.map(renderNote)}
          </div>
        </div>
      )}
    </div>
  );
};
