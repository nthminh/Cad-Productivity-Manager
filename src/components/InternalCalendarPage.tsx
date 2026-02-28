import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  X,
  Edit2,
  AtSign,
  Hash,
  Bell,
  CheckCircle2,
} from 'lucide-react';
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
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { getCurrentUser, getUsers } from '../lib/auth';
import { useProjectNames } from '../lib/useProjectNames';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  description?: string;
  color?: string;
  createdBy: string;
  createdByUsername: string;
  createdAt: Timestamp | null;
}

interface CalendarMentionNotification {
  id: string;
  messageId: string;
  sourceTitle: string;
  mentionerName: string;
  eventDate?: string;
}

const EVENT_COLORS = [
  { key: 'emerald', label: 'Xanh lá', dotClass: 'bg-emerald-500', bgClass: 'bg-emerald-50 border-emerald-200' },
  { key: 'blue', label: 'Xanh dương', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50 border-blue-200' },
  { key: 'rose', label: 'Đỏ', dotClass: 'bg-rose-500', bgClass: 'bg-rose-50 border-rose-200' },
  { key: 'amber', label: 'Vàng', dotClass: 'bg-amber-500', bgClass: 'bg-amber-50 border-amber-200' },
  { key: 'purple', label: 'Tím', dotClass: 'bg-purple-500', bgClass: 'bg-purple-50 border-purple-200' },
];

function getColorConfig(colorKey?: string) {
  return EVENT_COLORS.find((c) => c.key === colorKey) ?? EVENT_COLORS[0];
}

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const ALL_USER_ENTRY = { username: 'all', displayName: 'Tất cả mọi người' };

function renderTextWithMentions(text: string, currentUsername?: string) {
  const parts = text.split(/(@\w+|#\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const isSelf = part === '@all' || (currentUsername && part === `@${currentUsername}`);
      return (
        <span
          key={i}
          className={`font-semibold ${isSelf ? 'bg-yellow-200 text-yellow-800 rounded px-0.5' : 'text-emerald-600'}`}
        >
          {part}
        </span>
      );
    }
    if (/^#\[.+\]$/.test(part)) {
      return (
        <span key={i} className="font-semibold text-blue-500">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const InternalCalendarPage: React.FC<{
  calendarMentionNotifications?: CalendarMentionNotification[];
  onAcknowledgeNotification?: (id: string) => void;
}> = ({ calendarMentionNotifications = [], onAcknowledgeNotification }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newColor, setNewColor] = useState('emerald');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editColor, setEditColor] = useState('emerald');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // @ mention state for add form
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [projectMentionQuery, setProjectMentionQuery] = useState<string | null>(null);
  const [activeMentionField, setActiveMentionField] = useState<'title' | 'desc' | null>(null);

  // @ mention state for edit form
  const [editMentionQuery, setEditMentionQuery] = useState<string | null>(null);
  const [editProjectMentionQuery, setEditProjectMentionQuery] = useState<string | null>(null);
  const [editActiveMentionField, setEditActiveMentionField] = useState<'title' | 'desc' | null>(null);

  const [allUsers, setAllUsers] = useState<{ username: string; displayName: string }[]>([]);
  const projectNames = useProjectNames();

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);
  const editTitleInputRef = useRef<HTMLInputElement>(null);
  const editDescInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    setAllUsers(getUsers().map((u) => ({ username: u.username, displayName: u.displayName })));
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'calendar_events'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });
    return () => unsub();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dayStr);
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedEvents = events.filter((e) => e.date === selectedDateStr);

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !db || !currentUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const docRef = await addDoc(collection(db, 'calendar_events'), {
        title: newTitle.trim(),
        date: selectedDateStr,
        time: newTime || null,
        description: newDesc.trim() || null,
        color: newColor,
        createdBy: currentUser.displayName,
        createdByUsername: currentUser.username,
        createdAt: serverTimestamp(),
      });
      // Create mention notifications for mentioned users
      const allText = `${newTitle} ${newDesc}`;
      const mentions = allText.match(/@(\w+)/g)?.map((m) => m.slice(1)) ?? [];
      const expandedMentions = mentions.includes('all')
        ? [...new Set([...allUsers.map((u) => u.username), ...mentions.filter((m) => m !== 'all')])]
        : mentions;
      const uniqueMentions = [...new Set(expandedMentions)].filter((m) => m !== currentUser.username);
      await Promise.all(
        uniqueMentions.map(async (mentionedUsername) => {
          try {
            await addDoc(collection(db, 'mention_notifications'), {
              mentionedUsername,
              mentionerName: currentUser.displayName,
              messageText: newTitle.trim(),
              messageId: docRef.id,
              acknowledged: false,
              source: 'calendar',
              sourceTitle: newTitle.trim(),
              eventDate: selectedDateStr,
              createdAt: serverTimestamp(),
            });
          } catch (e) {
            console.error('Failed to create calendar mention notification:', e);
          }
        }),
      );
      setNewTitle('');
      setNewDesc('');
      setNewTime('');
      setNewColor('emerald');
      setShowAddForm(false);
    } catch (err) {
      console.error('Add event error:', err);
      setSaveError('Không thể thêm sự kiện. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!db || !window.confirm('Xóa sự kiện này?')) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      console.error('Delete event error:', err);
    }
  };

  const handleEditEvent = async () => {
    if (!editingEventId || !editTitle.trim() || !db) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateDoc(doc(db, 'calendar_events', editingEventId), {
        title: editTitle.trim(),
        time: editTime || null,
        description: editDesc.trim() || null,
        color: editColor,
      });
      setEditingEventId(null);
      setEditMentionQuery(null);
      setEditProjectMentionQuery(null);
    } catch (err) {
      console.error('Edit event error:', err);
      setEditError('Không thể cập nhật sự kiện. Vui lòng thử lại.');
    } finally {
      setEditSaving(false);
    }
  };

  const startEditEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id);
    setEditTitle(ev.title);
    setEditDesc(ev.description ?? '');
    setEditTime(ev.time ?? '');
    setEditColor(ev.color ?? 'emerald');
    setEditError(null);
    setEditMentionQuery(null);
    setEditProjectMentionQuery(null);
  };

  const canEditEvent = (event: CalendarEvent) =>
    event.createdByUsername === currentUser?.username || currentUser?.role === 'admin';

  const canDeleteEvent = (event: CalendarEvent) =>
    event.createdByUsername === currentUser?.username || currentUser?.role === 'admin';

  // Mention helpers for add form
  const filteredUsers = mentionQuery !== null
    ? [ALL_USER_ENTRY, ...allUsers].filter(
        (u) =>
          u.username.toLowerCase().includes(mentionQuery) ||
          u.displayName.toLowerCase().includes(mentionQuery),
      )
    : [];

  const filteredProjects = projectMentionQuery !== null
    ? projectNames.filter((p) => p.toLowerCase().includes(projectMentionQuery)).slice(0, 6)
    : [];

  const handleMentionInput = (val: string, field: 'title' | 'desc') => {
    setActiveMentionField(field);
    const mentionMatch = val.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setProjectMentionQuery(null);
    } else {
      setMentionQuery(null);
      const projMatch = val.match(/#([^#\n]*)$/);
      if (projMatch) {
        setProjectMentionQuery(projMatch[1].toLowerCase());
      } else {
        setProjectMentionQuery(null);
      }
    }
  };

  const insertMention = (username: string) => {
    if (activeMentionField === 'title') {
      setNewTitle((v) => v.replace(/@(\w*)$/, `@${username} `));
      setTimeout(() => titleInputRef.current?.focus(), 0);
    } else {
      setNewDesc((v) => v.replace(/@(\w*)$/, `@${username} `));
      setTimeout(() => descInputRef.current?.focus(), 0);
    }
    setMentionQuery(null);
  };

  const insertProjectMention = (projectName: string) => {
    if (activeMentionField === 'title') {
      setNewTitle((v) => v.replace(/#([^#\n]*)$/, `#[${projectName}] `));
      setTimeout(() => titleInputRef.current?.focus(), 0);
    } else {
      setNewDesc((v) => v.replace(/#([^#\n]*)$/, `#[${projectName}] `));
      setTimeout(() => descInputRef.current?.focus(), 0);
    }
    setProjectMentionQuery(null);
  };

  // Mention helpers for edit form
  const editFilteredUsers = editMentionQuery !== null
    ? [ALL_USER_ENTRY, ...allUsers].filter(
        (u) =>
          u.username.toLowerCase().includes(editMentionQuery) ||
          u.displayName.toLowerCase().includes(editMentionQuery),
      )
    : [];

  const editFilteredProjects = editProjectMentionQuery !== null
    ? projectNames.filter((p) => p.toLowerCase().includes(editProjectMentionQuery)).slice(0, 6)
    : [];

  const handleEditMentionInput = (val: string, field: 'title' | 'desc') => {
    setEditActiveMentionField(field);
    const mentionMatch = val.match(/@(\w*)$/);
    if (mentionMatch) {
      setEditMentionQuery(mentionMatch[1].toLowerCase());
      setEditProjectMentionQuery(null);
    } else {
      setEditMentionQuery(null);
      const projMatch = val.match(/#([^#\n]*)$/);
      if (projMatch) {
        setEditProjectMentionQuery(projMatch[1].toLowerCase());
      } else {
        setEditProjectMentionQuery(null);
      }
    }
  };

  const insertEditMention = (username: string) => {
    if (editActiveMentionField === 'title') {
      setEditTitle((v) => v.replace(/@(\w*)$/, `@${username} `));
      setTimeout(() => editTitleInputRef.current?.focus(), 0);
    } else {
      setEditDesc((v) => v.replace(/@(\w*)$/, `@${username} `));
      setTimeout(() => editDescInputRef.current?.focus(), 0);
    }
    setEditMentionQuery(null);
  };

  const insertEditProjectMention = (projectName: string) => {
    if (editActiveMentionField === 'title') {
      setEditTitle((v) => v.replace(/#([^#\n]*)$/, `#[${projectName}] `));
      setTimeout(() => editTitleInputRef.current?.focus(), 0);
    } else {
      setEditDesc((v) => v.replace(/#([^#\n]*)$/, `#[${projectName}] `));
      setTimeout(() => editDescInputRef.current?.focus(), 0);
    }
    setEditProjectMentionQuery(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Calendar mention notifications banner */}
      {calendarMentionNotifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Bạn được nhắc đến trong lịch nội bộ:</p>
          </div>
          {calendarMentionNotifications.map((notif) => (
            <div key={notif.id} className="flex items-center gap-2 bg-white border border-amber-100 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-800 font-medium truncate">{notif.sourceTitle}</span>
                <span className="text-xs text-slate-500 ml-1.5">bởi {notif.mentionerName}</span>
              </div>
              <button
                onClick={() => {
                  if (notif.eventDate) {
                    const [year, month, day] = notif.eventDate.split('-').map(Number);
                    const d = new Date(year, month - 1, day);
                    setSelectedDate(d);
                    setCurrentDate(d);
                  }
                  onAcknowledgeNotification?.(notif.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
              >
                <Calendar size={12} />
                Xem
              </button>
              <button
                onClick={() => onAcknowledgeNotification?.(notif.id)}
                title="Đánh dấu đã đọc"
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
              >
                <CheckCircle2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-bold text-slate-900 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: vi })}
            </h3>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DOW_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setShowAddForm(false);
                  }}
                  className={[
                    'relative p-1.5 rounded-xl text-sm transition-colors flex flex-col items-center gap-0.5 min-h-[44px]',
                    !inMonth ? 'text-slate-300' : 'text-slate-700',
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : isCurrentDay
                      ? 'bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-300'
                      : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="leading-none text-xs sm:text-sm">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map((ev, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' : getColorConfig(ev.color).dotClass
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
            </h3>
            {currentUser && (
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {showAddForm ? <X size={14} /> : <Plus size={14} />}
                {showAddForm ? 'Đóng' : 'Thêm'}
              </button>
            )}
          </div>

          {/* Add event form */}
          {showAddForm && (
            <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              {/* @ mention dropdown for add form */}
              {mentionQuery !== null && filteredUsers.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredUsers.slice(0, 6).map((u) => (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => insertMention(u.username)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-left text-sm"
                    >
                      <AtSign size={14} className="text-emerald-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800">{u.displayName}</span>
                      <span className="text-slate-400 text-xs">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* # project mention dropdown for add form */}
              {projectMentionQuery !== null && filteredProjects.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredProjects.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertProjectMention(p)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-sm"
                    >
                      <Hash size={14} className="text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800">{p}</span>
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={titleInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); handleMentionInput(e.target.value, 'title'); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEvent();
                  if (e.key === 'Escape') { setMentionQuery(null); setProjectMentionQuery(null); }
                }}
                placeholder="Tên sự kiện * (@ nhắc ai đó, # nhắc công việc)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 flex-shrink-0">Thời gian:</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <input
                ref={descInputRef}
                type="text"
                value={newDesc}
                onChange={(e) => { setNewDesc(e.target.value); handleMentionInput(e.target.value, 'desc'); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setMentionQuery(null); setProjectMentionQuery(null); }
                }}
                placeholder="Ghi chú (@ nhắc ai đó, # nhắc công việc)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Màu:</span>
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setNewColor(c.key)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full ${c.dotClass} transition-transform ${
                      newColor === c.key ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''
                    }`}
                  />
                ))}
              </div>
              {saveError && <p className="text-xs text-rose-600">{saveError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSaveError(null);
                    setNewTitle('');
                    setNewDesc('');
                    setNewTime('');
                    setMentionQuery(null);
                    setProjectMentionQuery(null);
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddEvent}
                  disabled={saving || !newTitle.trim()}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          )}

          {/* Events list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedEvents.length === 0 && !showAddForm && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8">
                <Calendar size={28} className="opacity-30" />
                <p className="text-sm">Không có sự kiện nào.</p>
              </div>
            )}
            {selectedEvents.map((ev) => {
              const colorConf = getColorConfig(ev.color);
              const isEditing = editingEventId === ev.id;
              return (
                <div key={ev.id}>
                  {isEditing ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      {/* @ mention dropdown for edit form */}
                      {editMentionQuery !== null && editFilteredUsers.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {editFilteredUsers.slice(0, 6).map((u) => (
                            <button
                              key={u.username}
                              type="button"
                              onClick={() => insertEditMention(u.username)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-left text-sm"
                            >
                              <AtSign size={14} className="text-emerald-500 flex-shrink-0" />
                              <span className="font-medium text-slate-800">{u.displayName}</span>
                              <span className="text-slate-400 text-xs">@{u.username}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* # project mention dropdown for edit form */}
                      {editProjectMentionQuery !== null && editFilteredProjects.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {editFilteredProjects.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => insertEditProjectMention(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-sm"
                            >
                              <Hash size={14} className="text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-slate-800">{p}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <input
                        ref={editTitleInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => { setEditTitle(e.target.value); handleEditMentionInput(e.target.value, 'title'); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setEditMentionQuery(null); setEditProjectMentionQuery(null); }
                        }}
                        placeholder="Tên sự kiện *"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 flex-shrink-0">Thời gian:</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <input
                        ref={editDescInputRef}
                        type="text"
                        value={editDesc}
                        onChange={(e) => { setEditDesc(e.target.value); handleEditMentionInput(e.target.value, 'desc'); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setEditMentionQuery(null); setEditProjectMentionQuery(null); }
                        }}
                        placeholder="Ghi chú (tuỳ chọn)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 mr-1">Màu:</span>
                        {EVENT_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setEditColor(c.key)}
                            title={c.label}
                            className={`w-5 h-5 rounded-full ${c.dotClass} transition-transform ${
                              editColor === c.key ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''
                            }`}
                          />
                        ))}
                      </div>
                      {editError && <p className="text-xs text-rose-600">{editError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setEditingEventId(null); setEditMentionQuery(null); setEditProjectMentionQuery(null); }}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleEditEvent}
                          disabled={editSaving || !editTitle.trim()}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          {editSaving ? 'Đang lưu...' : 'Cập nhật'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-xl border ${colorConf.bgClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colorConf.dotClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 break-words">{renderTextWithMentions(ev.title, currentUser?.username)}</p>
                        {ev.time && (
                          <p className="text-xs font-medium text-emerald-600 mt-0.5">🕐 {ev.time}</p>
                        )}
                        {ev.description && (
                          <p className="text-xs text-slate-500 mt-0.5 break-words">{renderTextWithMentions(ev.description, currentUser?.username)}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{ev.createdBy}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {canEditEvent(ev) && (
                          <button
                            onClick={() => startEditEvent(ev)}
                            className="p-1 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                            title="Chỉnh sửa sự kiện"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {canDeleteEvent(ev) && (
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa sự kiện"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
