import React, { useEffect, useRef } from 'react';
import { Trash2, CheckCircle, Clock, RefreshCw, Pencil, XCircle, PauseCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Task } from '../types/database.types';

interface TaskContextMenuProps {
  task: Task;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: (task: Task) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({ task, onClose, onRefresh, onEdit, canEdit = true, canDelete = true }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleDelete = async () => {
    if (!db) return;
    if (!window.confirm(`Bạn có chắc muốn xóa bản vẽ "${task.drawing_name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      onRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Có lỗi xảy ra khi xóa task.');
    }
    onClose();
  };

  const handleStatusChange = async (status: Task['status']) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status });
      onRefresh();
    } catch (err) {
      console.error('Error updating task status:', err);
      alert('Có lỗi xảy ra khi cập nhật trạng thái.');
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden"
    >
      <div className="py-1">
        {canEdit && (
          <button
            onClick={() => { onEdit(task); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={16} />
            Chỉnh sửa
          </button>
        )}
        {canEdit && <div className="my-1 border-t border-slate-100" />}
        {canEdit && task.status !== 'Hoàn thành' && (
          <button
            onClick={() => handleStatusChange('Hoàn thành')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <CheckCircle size={16} />
            Đánh dấu hoàn thành
          </button>
        )}
        {canEdit && task.status !== 'Đang làm' && (
          <button
            onClick={() => handleStatusChange('Đang làm')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <RefreshCw size={16} />
            Chuyển sang Đang làm
          </button>
        )}
        {canEdit && task.status !== 'Chờ duyệt' && (
          <button
            onClick={() => handleStatusChange('Chờ duyệt')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Clock size={16} />
            Chuyển sang Chờ duyệt
          </button>
        )}
        {canEdit && task.status !== 'Đã hủy' && (
          <button
            onClick={() => handleStatusChange('Đã hủy')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <XCircle size={16} />
            Đã hủy
          </button>
        )}
        {canEdit && task.status !== 'Tạm hoãn' && (
          <button
            onClick={() => handleStatusChange('Tạm hoãn')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <PauseCircle size={16} />
            Tạm hoãn
          </button>
        )}
        {canDelete && <div className="my-1 border-t border-slate-100" />}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={16} />
            Xóa
          </button>
        )}
      </div>
    </div>
  );
};
