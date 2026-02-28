import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Phone, Mail, User, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, Clock, Briefcase } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Engineer, Task } from '../types/database.types';

const DEPT_MAP: Record<string, string> = {
  'Giám đốc': 'Ban Giám đốc',
  'Quản lý dự án': 'Ban Giám đốc',
  'Kỹ sư trưởng': 'Kỹ thuật',
  'Kỹ sư': 'Kỹ thuật',
  'Thực tập sinh': 'Sản xuất',
  'Nhân viên': 'Hành chính',
};

const DEPT_ORDER = ['Ban Giám đốc', 'Kỹ thuật', 'Sản xuất', 'Hành chính'];

const DEPT_CONFIG: Record<string, { headerBg: string; nodeBorder: string; nodeText: string; nodeLight: string; badge: string }> = {
  'Ban Giám đốc': {
    headerBg: 'bg-rose-600',
    nodeBorder: 'border-rose-300',
    nodeText: 'text-rose-700',
    nodeLight: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
  },
  'Kỹ thuật': {
    headerBg: 'bg-blue-600',
    nodeBorder: 'border-blue-300',
    nodeText: 'text-blue-700',
    nodeLight: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  'Sản xuất': {
    headerBg: 'bg-amber-500',
    nodeBorder: 'border-amber-300',
    nodeText: 'text-amber-700',
    nodeLight: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
  },
  'Hành chính': {
    headerBg: 'bg-emerald-600',
    nodeBorder: 'border-emerald-300',
    nodeText: 'text-emerald-700',
    nodeLight: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

const STATUS_COLORS: Record<string, string> = {
  'Hoàn thành': 'bg-emerald-100 text-emerald-700',
  'Đang làm': 'bg-blue-100 text-blue-700',
  'Chờ duyệt': 'bg-amber-100 text-amber-700',
  'Tạm hoãn': 'bg-slate-100 text-slate-600',
  'Đã hủy': 'bg-rose-100 text-rose-700',
};

interface EngineerPopupProps {
  engineer: Engineer;
  tasks: Task[];
  onClose: () => void;
}

const EngineerPopup: React.FC<EngineerPopupProps> = ({ engineer, tasks, onClose }) => {
  const engTasks = tasks.filter(
    (t) => t.engineer_name === engineer.full_name && t.status !== 'Hoàn thành' && t.status !== 'Đã hủy',
  );
  const completedCount = tasks.filter(
    (t) => t.engineer_name === engineer.full_name && t.status === 'Hoàn thành',
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {engineer.photo_url ? (
              <img
                src={engineer.photo_url}
                alt={engineer.full_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-slate-500" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{engineer.full_name}</h3>
              <span className="text-xs text-slate-500">{engineer.position}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Contact info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin liên hệ</h4>
            {engineer.email ? (
              <a
                href={`mailto:${engineer.email}`}
                className="flex items-center gap-2.5 text-sm text-emerald-600 hover:underline"
              >
                <Mail size={15} className="flex-shrink-0 text-slate-400" />
                {engineer.email}
              </a>
            ) : (
              <p className="flex items-center gap-2.5 text-sm text-slate-400 italic">
                <Mail size={15} className="flex-shrink-0" />
                Chưa có email
              </p>
            )}
            {engineer.phone ? (
              <a
                href={`tel:${engineer.phone}`}
                className="flex items-center gap-2.5 text-sm text-emerald-600 hover:underline"
              >
                <Phone size={15} className="flex-shrink-0 text-slate-400" />
                {engineer.phone}
              </a>
            ) : (
              <p className="flex items-center gap-2.5 text-sm text-slate-400 italic">
                <Phone size={15} className="flex-shrink-0" />
                Chưa có số điện thoại
              </p>
            )}
          </div>

          {/* Task stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{engTasks.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">Task đang làm</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Task hoàn thành</p>
            </div>
          </div>

          {/* Active tasks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={13} />
              Task đang đảm nhận ({engTasks.length})
            </h4>
            {engTasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">
                Không có task đang hoạt động
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {engTasks.map((t) => (
                  <div key={t.id} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {t.status === 'Hoàn thành' ? (
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.drawing_name}</p>
                      {t.deadline && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface OrgChartPageProps {
  tasks: Task[];
}

export const OrgChartPage: React.FC<OrgChartPageProps> = ({ tasks }) => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEng, setSelectedEng] = useState<Engineer | null>(null);
  const [scale, setScale] = useState(0.9);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'engineers'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEngineers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Engineer));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(Math.max(s * factor, 0.25), 3));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    e.currentTarget instanceof HTMLElement && (e.currentTarget.style.cursor = 'grabbing');
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isPanning.current = false;
    e.currentTarget instanceof HTMLElement && (e.currentTarget.style.cursor = 'grab');
  }, []);

  const handleReset = () => {
    setScale(0.9);
    setTranslate({ x: 0, y: 0 });
  };

  const grouped = DEPT_ORDER.reduce<Record<string, Engineer[]>>((acc, dept) => {
    acc[dept] = engineers.filter((e) => (DEPT_MAP[e.position] ?? 'Hành chính') === dept);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Đang tải sơ đồ phòng ban...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Sơ đồ phòng ban</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Kéo để di chuyển · Cuộn để phóng to/thu nhỏ · Nhấn vào nhân sự để xem chi tiết
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            title="Phóng to"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s * 0.8, 0.25))}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            title="Thu nhỏ"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            title="Đặt lại"
          >
            <RotateCcw size={18} />
          </button>
          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-lg min-w-[52px] text-center">
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div
        ref={containerRef}
        className="relative bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden select-none"
        style={{ height: '70vh', cursor: 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="org-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#org-dots)" />
        </svg>

        {/* Zoomable / pannable content */}
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            position: 'absolute',
            top: 40,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Root company node */}
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 text-white px-8 py-4 rounded-2xl shadow-xl border-2 border-slate-700 text-center min-w-[180px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg width="20" height="20" viewBox="0 0 40 40">
                  <rect width="40" height="40" rx="6" fill="white" />
                  <text x="2" y="30" fontFamily="Arial Black,sans-serif" fontSize="28" fontWeight="900" fill="#dc2626">D</text>
                  <text x="16" y="30" fontFamily="Arial Black,sans-serif" fontSize="28" fontWeight="900" fill="#111827">G</text>
                </svg>
                <span className="font-bold text-base">DG Company</span>
              </div>
              <p className="text-slate-400 text-xs">Tổng công ty</p>
            </div>

            {/* Vertical line down from root */}
            <div className="w-0.5 bg-slate-400 h-8" />

            {/* Horizontal bar spanning all departments */}
            <div className="relative flex items-start justify-center gap-8">
              {/* Horizontal connector line */}
              <div
                className="absolute top-0 bg-slate-400"
                style={{
                  height: '2px',
                  left: '40px',
                  right: '40px',
                }}
              />

              {DEPT_ORDER.map((dept) => {
                const cfg = DEPT_CONFIG[dept];
                const members = grouped[dept] ?? [];

                return (
                  <div key={dept} className="flex flex-col items-center" style={{ minWidth: 160 }}>
                    {/* Vertical line from horizontal bar to dept node */}
                    <div className="w-0.5 bg-slate-400 h-8" />

                    {/* Department node */}
                    <div className={`${cfg.headerBg} text-white px-5 py-3 rounded-xl shadow-lg text-center w-full`}>
                      <p className="font-bold text-sm">{dept}</p>
                      <p className="text-xs opacity-75 mt-0.5">{members.length} thành viên</p>
                    </div>

                    {members.length > 0 && (
                      <>
                        {/* Vertical line to engineers */}
                        <div className="w-0.5 bg-slate-300 h-6" />

                        {/* Horizontal bar for engineers */}
                        <div className="relative flex items-start justify-center gap-3">
                          {members.length > 1 && (
                            <div
                              className="absolute top-0 bg-slate-300"
                              style={{
                                height: '2px',
                                left: '50%',
                                right: '50%',
                                transform: 'none',
                                width: `calc(100% - 80px)`,
                                marginLeft: '40px',
                              }}
                            />
                          )}
                          {/* Wider horizontal connector when multiple members */}
                          {members.length > 1 && (
                            <div
                              className="absolute top-0 bg-slate-300"
                              style={{
                                height: '2px',
                                left: 40,
                                right: 40,
                              }}
                            />
                          )}

                          {members.map((eng) => (
                            <div key={eng.id} className="flex flex-col items-center">
                              {/* Vertical line from branch to engineer node */}
                              <div className="w-0.5 bg-slate-300 h-5" />

                              {/* Engineer card */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEng(eng);
                                }}
                                className={`
                                  flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 shadow-sm
                                  hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                                  bg-white cursor-pointer text-left w-[130px]
                                  ${cfg.nodeBorder}
                                `}
                              >
                                {eng.photo_url ? (
                                  <img
                                    src={eng.photo_url}
                                    alt={eng.full_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full ${cfg.nodeLight} flex items-center justify-center flex-shrink-0`}>
                                    <User size={18} className={cfg.nodeText} />
                                  </div>
                                )}
                                <div className="text-center w-full">
                                  <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">
                                    {eng.full_name}
                                  </p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${cfg.badge}`}>
                                    {eng.position}
                                  </span>
                                </div>
                                {/* Task count badge */}
                                {(() => {
                                  const activeCount = tasks.filter(
                                    (t) => t.engineer_name === eng.full_name && t.status !== 'Hoàn thành' && t.status !== 'Đã hủy',
                                  ).length;
                                  return activeCount > 0 ? (
                                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                      {activeCount} task
                                    </span>
                                  ) : null;
                                })()}
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {members.length === 0 && (
                      <>
                        <div className="w-0.5 bg-slate-300 h-6" />
                        <div className="border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 text-center w-[130px]">
                          <p className="text-xs text-slate-400 italic">Chưa có thành viên</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Engineer popup */}
      {selectedEng && (
        <EngineerPopup
          engineer={selectedEng}
          tasks={tasks}
          onClose={() => setSelectedEng(null)}
        />
      )}
    </div>
  );
};
