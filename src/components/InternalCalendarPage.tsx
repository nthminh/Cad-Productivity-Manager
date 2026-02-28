import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  X,
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
} from 'firebase/firestore';
import { getCurrentUser } from '../lib/auth';
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
  description?: string;
  color?: string;
  createdBy: string;
  createdByUsername: string;
  createdAt: Timestamp | null;
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

export const InternalCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('emerald');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const currentUser = getCurrentUser();

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
      await addDoc(collection(db, 'calendar_events'), {
        title: newTitle.trim(),
        date: selectedDateStr,
        description: newDesc.trim() || null,
        color: newColor,
        createdBy: currentUser.displayName,
        createdByUsername: currentUser.username,
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewDesc('');
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

  const canDeleteEvent = (event: CalendarEvent) =>
    event.createdByUsername === currentUser?.username || currentUser?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-4">
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
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEvent();
                }}
                placeholder="Tên sự kiện *"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                autoFocus
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ghi chú (tuỳ chọn)"
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
              return (
                <div
                  key={ev.id}
                  className={`flex items-start gap-2 p-3 rounded-xl border ${colorConf.bgClass}`}
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colorConf.dotClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 break-words">{ev.title}</p>
                    {ev.description && (
                      <p className="text-xs text-slate-500 mt-0.5 break-words">{ev.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{ev.createdBy}</p>
                  </div>
                  {canDeleteEvent(ev) && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors flex-shrink-0"
                      title="Xóa sự kiện"
                    >
                      <Trash2 size={13} />
                    </button>
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
