import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, User, TrendingUp, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { Engineer, Task } from '../types/database.types';

interface SalaryRecord {
  engineer: Engineer;
  taskCount: number;
  projectSalary: number;
  totalSalary: number;
}

type SalarySortKey = 'full_name' | 'position' | 'taskCount' | 'basic_salary' | 'projectSalary' | 'totalSalary';
type SortDir = 'asc' | 'desc';

const SAL_COLUMNS: { key: string; label: string; defaultWidth: number; sortKey?: SalarySortKey }[] = [
  { key: 'photo', label: 'Ảnh', defaultWidth: 72 },
  { key: 'full_name', label: 'Họ và tên', defaultWidth: 160, sortKey: 'full_name' },
  { key: 'position', label: 'Chức danh', defaultWidth: 130, sortKey: 'position' },
  { key: 'taskCount', label: 'Dự án HT', defaultWidth: 110, sortKey: 'taskCount' },
  { key: 'basic_salary', label: 'Lương căn bản (VNĐ)', defaultWidth: 180, sortKey: 'basic_salary' },
  { key: 'projectSalary', label: 'Lương công việc (VNĐ)', defaultWidth: 185, sortKey: 'projectSalary' },
  { key: 'totalSalary', label: 'Tổng lương (VNĐ)', defaultWidth: 160, sortKey: 'totalSalary' },
];
type SalColKey = typeof SAL_COLUMNS[number]['key'];
const DEFAULT_SAL_COL_WIDTHS: Record<SalColKey, number> = Object.fromEntries(
  SAL_COLUMNS.map(c => [c.key, c.defaultWidth])
) as Record<SalColKey, number>;

function EditableSalary({ engineer, readOnly }: { engineer: Engineer; readOnly?: boolean }) {
  const [value, setValue] = useState(String(engineer.basic_salary ?? 0));

  useEffect(() => {
    setValue(String(engineer.basic_salary ?? 0));
  }, [engineer.basic_salary]);

  const handleSave = async () => {
    if (!db) return;
    const salary = parseInt(value, 10) || 0;
    if (salary === engineer.basic_salary) return;
    try {
      await updateDoc(doc(db, 'engineers', engineer.id), { basic_salary: salary });
    } catch (e) {
      console.error(e);
    }
  };

  if (readOnly) {
    return (
      <span className="text-sm text-slate-700">
        {(engineer.basic_salary ?? 0) > 0
          ? (engineer.basic_salary ?? 0).toLocaleString('vi-VN') + ' ₫'
          : <span className="text-slate-400 italic">Chưa có</span>}
      </span>
    );
  }

  return (
    <input
      type="number"
      min="0"
      step="100000"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-36 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
    />
  );
}

export const SalaryPage: React.FC<{ canEditSalary?: boolean }> = ({ canEditSalary = true }) => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SalarySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [colWidths, setColWidths] = useState<Record<SalColKey, number>>({ ...DEFAULT_SAL_COL_WIDTHS });
  const resizeRef = useRef<{ col: SalColKey; startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    let engLoaded = false;
    let taskLoaded = false;
    const checkDone = () => { if (engLoaded && taskLoaded) setLoading(false); };

    const unsubEng = onSnapshot(
      query(collection(db, 'engineers'), orderBy('created_at', 'desc')),
      snap => {
        setEngineers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Engineer));
        engLoaded = true;
        checkDone();
      }
    );

    const unsubTask = onSnapshot(
      query(collection(db, 'tasks'), orderBy('created_at', 'desc')),
      snap => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
        taskLoaded = true;
        checkDone();
      }
    );

    return () => { unsubEng(); unsubTask(); };
  }, []);

  const salaryData: SalaryRecord[] = engineers.map(eng => {
    const engTasks = tasks.filter(
      t => t.engineer_name === eng.full_name && t.status === 'Hoàn thành'
    );
    const projectSalary = engTasks.reduce((sum, t) => sum + (t.cost ?? 0), 0);
    return {
      engineer: eng,
      taskCount: engTasks.length,
      projectSalary,
      totalSalary: (eng.basic_salary ?? 0) + projectSalary,
    };
  });

  const totalBasic = salaryData.reduce((s, r) => s + (r.engineer.basic_salary ?? 0), 0);
  const totalProject = salaryData.reduce((s, r) => s + r.projectSalary, 0);
  const totalAll = salaryData.reduce((s, r) => s + r.totalSalary, 0);

  const handleSort = (key: SalarySortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, col: SalColKey) => {
    e.preventDefault();
    resizeRef.current = { col, startX: e.clientX, startW: colWidths[col] };
    const onMouseMove = (ev: MouseEvent) => {
      const current = resizeRef.current;
      if (!current) return;
      const newWidth = Math.max(60, current.startW + ev.clientX - current.startX);
      setColWidths(prev => ({ ...prev, [current.col]: newWidth }));
    };
    const onMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const sorted = sortKey
    ? [...salaryData].sort((a, b) => {
        let av: string | number = '';
        let bv: string | number = '';
        if (sortKey === 'full_name' || sortKey === 'position') {
          av = (a.engineer[sortKey] ?? '').toLowerCase();
          bv = (b.engineer[sortKey] ?? '').toLowerCase();
        } else if (sortKey === 'basic_salary') {
          av = a.engineer.basic_salary ?? 0;
          bv = b.engineer.basic_salary ?? 0;
        } else {
          av = a[sortKey] as number;
          bv = b[sortKey] as number;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : salaryData;

  const SortIcon = ({ col }: { col: SalarySortKey }) => (
    <span className="inline-flex flex-col ml-1 leading-none">
      <ChevronUp size={10} className={sortKey === col && sortDir === 'asc' ? 'text-emerald-500' : 'text-slate-300'} />
      <ChevronDown size={10} className={sortKey === col && sortDir === 'desc' ? 'text-emerald-500' : 'text-slate-300'} />
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Tính lương</h3>
        <p className="text-sm text-slate-500 mt-0.5">Lương căn bản + lương theo công việc hoàn thành</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg"><DollarSign size={18} className="text-blue-600" /></div>
            <span className="text-sm font-semibold text-slate-600">Tổng lương căn bản</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalBasic.toLocaleString('vi-VN')} ₫</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-2 rounded-lg"><TrendingUp size={18} className="text-amber-600" /></div>
            <span className="text-sm font-semibold text-slate-600">Tổng lương công việc</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalProject.toLocaleString('vi-VN')} ₫</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg"><Save size={18} className="text-emerald-600" /></div>
            <span className="text-sm font-semibold text-slate-600">Tổng chi lương</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{totalAll.toLocaleString('vi-VN')} ₫</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed', minWidth: SAL_COLUMNS.reduce((s, c) => s + colWidths[c.key], 0) }}>
            <colgroup>
              {SAL_COLUMNS.map(col => (
                <col key={col.key} style={{ width: colWidths[col.key] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                {SAL_COLUMNS.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap relative select-none ${col.sortKey ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                    onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {col.sortKey && <SortIcon col={col.sortKey} />}
                    </span>
                    {idx < SAL_COLUMNS.length - 1 && (
                      <div
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-400/60 active:bg-emerald-500/80"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={(e) => handleResizeMouseDown(e, col.key as SalColKey)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={SAL_COLUMNS.length} className="px-6 py-10 text-center text-slate-400 text-sm">Đang tải...</td></tr>
              )}
              {!loading && salaryData.length === 0 && (
                <tr><td colSpan={SAL_COLUMNS.length} className="px-6 py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu. Hãy thêm kỹ sư trong menu Danh sách kỹ sư.</td></tr>
              )}
              {sorted.map(row => (
                <tr key={row.engineer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4">
                    {row.engineer.photo_url ? (
                      <img src={row.engineer.photo_url} alt={row.engineer.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={18} className="text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900 truncate">{row.engineer.full_name}</td>
                  <td className="px-4 py-4 truncate">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                      {row.engineer.position}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 truncate">{row.taskCount} task</td>
                  <td className="px-4 py-4 truncate">
                    <EditableSalary engineer={row.engineer} readOnly={!canEditSalary} />
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-amber-700 truncate">
                    {row.projectSalary > 0 ? row.projectSalary.toLocaleString('vi-VN') + ' ₫' : <span className="text-slate-400">0 ₫</span>}
                  </td>
                  <td className="px-4 py-4 truncate">
                    <span className="text-sm font-bold text-emerald-700">
                      {row.totalSalary.toLocaleString('vi-VN')} ₫
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
