import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Eye, MoreVertical, Star, Download, Search, Filter, FileDown, X } from 'lucide-react';
import { Task } from '../types/database.types';
import { TaskContextMenu } from './TaskContextMenu';
import { EditTaskForm } from './EditTaskForm';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

function ActualHoursInput({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const [value, setValue] = useState(String(task.actual_hours ?? 0));

  useEffect(() => {
    setValue(String(task.actual_hours ?? 0));
  }, [task.actual_hours]);

  const handleSave = async () => {
    if (!db) return;
    const hours = parseFloat(value) || 0;
    if (hours === task.actual_hours) return;
    try {
      await updateDoc(doc(db, 'tasks', task.id), { actual_hours: hours });
      onRefresh();
    } catch (e) {
      console.error('Error updating actual hours:', e);
    }
  };

  return (
    <input
      type="number"
      min="0"
      step="0.5"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
    />
  );
}

interface TaskTableProps {
  tasks: Task[];
  onRefresh: () => void;
  onViewDrawing: (link: string) => void;
}

function exportToCSV(tasks: Task[]) {
  const headers = [
    'Tên dự án', 'Kỹ sư', 'Độ khó', 'Trạng thái', 'Hạn chót',
    'Giờ mục tiêu', 'Giờ thực tế', 'Năng suất (%)', 'Giá thành (VNĐ)', 'Ngày tạo',
  ];
  const rows = tasks.map(t => [
    t.drawing_name,
    t.engineer_name,
    t.difficulty,
    t.status,
    t.deadline ?? '',
    t.target_hours,
    t.actual_hours.toFixed(1),
    t.actual_hours > 0 ? ((t.target_hours / t.actual_hours) * 100).toFixed(1) : '',
    t.cost ?? 0,
    new Date(t.created_at).toLocaleDateString('vi-VN'),
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cad-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, onRefresh, onViewDrawing }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [filterEngineer, setFilterEngineer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const uniqueEngineers = useMemo(
    () => Array.from(new Set(tasks.map(t => t.engineer_name))).sort(),
    [tasks]
  );

  const filteredTasks = tasks.filter(t => {
    const matchSearch = search === '' || t.drawing_name.toLowerCase().includes(search.toLowerCase());
    const matchEngineer = filterEngineer === '' || t.engineer_name === filterEngineer;
    const matchStatus = filterStatus === '' || t.status === filterStatus;
    return matchSearch && matchEngineer && matchStatus;
  });

  const hasActiveFilters = search !== '' || filterEngineer !== '' || filterStatus !== '';

  const clearFilters = () => {
    setSearch('');
    setFilterEngineer('');
    setFilterStatus('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang làm': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Chờ duyệt': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Hoàn thành': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Đã hủy': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Tạm hoãn': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const isInactiveStatus = (status: string) =>
    status === 'Hoàn thành' || status === 'Đã hủy' || status === 'Tạm hoãn';

  const getProductivityColor = (target: number, actual: number) => {
    if (actual === 0) return 'text-slate-400';
    const ratio = (target / actual) * 100;
    if (ratio < 80) return 'text-rose-600 font-bold';
    if (ratio > 100) return 'text-emerald-600 font-bold';
    return 'text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên dự án..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <select
                value={filterEngineer}
                onChange={e => setFilterEngineer(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all appearance-none"
              >
                <option value="">Tất cả kỹ sư</option>
                {uniqueEngineers.map(eng => (
                  <option key={eng} value={eng}>{eng}</option>
                ))}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all appearance-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Đang làm">Đang làm</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
              <option value="Tạm hoãn">Tạm hoãn</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-medium transition-colors"
              >
                <X size={14} />
                Xóa lọc
              </button>
            )}
            <button
              onClick={() => exportToCSV(filteredTasks)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-medium transition-colors"
              title="Xuất CSV"
            >
              <FileDown size={16} />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
        {hasActiveFilters && (
          <p className="mt-2 text-xs text-slate-500">
            Hiển thị {filteredTasks.length} / {tasks.length} dự án
          </p>
        )}
      </div>

    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-bottom border-slate-200">
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tên dự án</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Thông tin dự án</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kỹ sư</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Độ khó</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hạn chót</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Năng suất (T/A)</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Giá thành</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Giờ thực tế</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tải về</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-10 text-center text-slate-400 text-sm">
                  {hasActiveFilters ? 'Không tìm thấy dự án phù hợp với bộ lọc.' : 'Chưa có dự án nào.'}
                </td>
              </tr>
            )}
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-slate-900">{task.drawing_name}</span>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">ID: {task.project_id.slice(0, 8)}...</span>
                    <span className="text-xs text-slate-400">{new Date(task.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{task.engineer_name}</td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={14} 
                        className={i < task.difficulty ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {task.deadline ? (
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${
                        new Date(task.deadline) < new Date() && !isInactiveStatus(task.status)
                          ? 'text-rose-600' 
                          : 'text-slate-700'
                      }`}>
                        {new Date(task.deadline).toLocaleDateString('vi-VN')}
                      </span>
                      {new Date(task.deadline) < new Date() && !isInactiveStatus(task.status) && (
                        <span className="text-[10px] text-rose-500 font-bold uppercase">Quá hạn</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Chưa đặt</span>
                  )}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className={`text-sm ${getProductivityColor(task.target_hours, task.actual_hours)}`}>
                      {task.actual_hours > 0 ? `${((task.target_hours / task.actual_hours) * 100).toFixed(1)}%` : '-%'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {task.target_hours}h / {task.actual_hours.toFixed(1)}h
                    </span>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {task.cost != null && task.cost > 0 ? (
                    <span className="text-sm font-medium text-slate-700">
                      {task.cost.toLocaleString('vi-VN')} ₫
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Chưa có</span>
                  )}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <ActualHoursInput task={task} onRefresh={onRefresh} />
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {task.drive_link ? (
                    <a
                      href={task.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                      title="Tải file từ Drive"
                    >
                      <Download size={14} />
                      Tải về
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Chưa có</span>
                  )}
                </td>
                <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 relative">
                    {task.viewer_link && (
                      <button 
                        onClick={() => onViewDrawing(task.viewer_link!)}
                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Xem bản vẽ"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    {task.drive_link && (
                      <a 
                        href={task.drive_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mở Drive"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === task.id && (
                      <TaskContextMenu
                        task={task}
                        onClose={() => setOpenMenuId(null)}
                        onRefresh={onRefresh}
                        onEdit={(t) => { setEditTask(t); setOpenMenuId(null); }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTask && (
        <EditTaskForm
          task={editTask}
          onClose={() => setEditTask(null)}
          onSuccess={() => { setEditTask(null); onRefresh(); }}
        />
      )}
    </div>
    </div>
  );
};
