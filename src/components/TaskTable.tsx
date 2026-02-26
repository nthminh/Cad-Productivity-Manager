import React, { useState } from 'react';
import { ExternalLink, Eye, MoreVertical, Star } from 'lucide-react';
import { Task } from '../types/database.types';
import { Timer } from './Timer';
import { TaskContextMenu } from './TaskContextMenu';

interface TaskTableProps {
  tasks: Task[];
  onRefresh: () => void;
  onViewDrawing: (link: string) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, onRefresh, onViewDrawing }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang làm': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Chờ duyệt': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Hoàn thành': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getProductivityColor = (target: number, actual: number) => {
    if (actual === 0) return 'text-slate-400';
    const ratio = (target / actual) * 100;
    if (ratio < 80) return 'text-rose-600 font-bold';
    if (ratio > 100) return 'text-emerald-600 font-bold';
    return 'text-slate-700';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-bottom border-slate-200">
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tên bản vẽ</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kỹ sư</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Độ khó</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hạn chót</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Năng suất (T/A)</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Theo dõi giờ</th>
              <th className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{task.drawing_name}</span>
                    <span className="text-xs text-slate-500">Dự án ID: {task.project_id.slice(0, 8)}...</span>
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
                        new Date(task.deadline) < new Date() && task.status !== 'Hoàn thành' 
                          ? 'text-rose-600' 
                          : 'text-slate-700'
                      }`}>
                        {new Date(task.deadline).toLocaleDateString('vi-VN')}
                      </span>
                      {new Date(task.deadline) < new Date() && task.status !== 'Hoàn thành' && (
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
                  <Timer 
                    taskId={task.id} 
                    onTimeUpdate={onRefresh} 
                    isRunning={task.status === 'Đang làm'} 
                  />
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
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
