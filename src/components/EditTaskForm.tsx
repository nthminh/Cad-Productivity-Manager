import React, { useState, useEffect } from 'react';
import { X, Save, HardHat, User, FileText, Target, Star, Clock, CheckCircle2, DollarSign, Link, AlignLeft, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { Task, Engineer } from '../types/database.types';

interface EditTaskFormProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    drawing_name: task.drawing_name,
    engineer_name: task.engineer_name,
    description: task.description ?? '',
    project_id: task.project_id,
    difficulty: task.difficulty,
    target_hours: task.target_hours,
    actual_hours: task.actual_hours,
    cost: task.cost ?? 0,
    status: task.status,
    drive_link: task.drive_link ?? '',
    viewer_link: task.viewer_link ?? '',
    deadline: task.deadline ?? '',
  });
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!db) return;
    getDocs(query(collection(db, 'engineers'), orderBy('full_name'))).then(snap => {
      setEngineers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Engineer));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [success, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'tasks', task.id), { ...formData });
      onSuccess();
      setSuccess(true);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Có lỗi xảy ra khi cập nhật task. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <HardHat className="text-white" size={20} />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Chỉnh sửa dự án</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 size={16} />
              Cập nhật thành công!
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <FileText size={14} /> Tên dự án
              </label>
              <input
                required
                value={formData.drawing_name}
                onChange={e => setFormData({...formData, drawing_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <User size={14} /> Kỹ sư thực hiện
              </label>
              {engineers.length > 0 ? (
                <div className="relative">
                  <select
                    required
                    value={formData.engineer_name}
                    onChange={e => setFormData({...formData, engineer_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none pr-10"
                  >
                    <option value="">-- Chọn kỹ sư --</option>
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.full_name}>{eng.full_name} ({eng.position})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <input
                  required
                  value={formData.engineer_name}
                  onChange={e => setFormData({...formData, engineer_name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Target size={14} /> Giờ mục tiêu (Target)
              </label>
              <input
                type="number"
                required
                min="0.5"
                step="0.5"
                value={formData.target_hours}
                onChange={e => setFormData({...formData, target_hours: parseFloat(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Star size={14} /> Độ khó (1-5)
              </label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData({...formData, difficulty: parseInt(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} Sao</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Clock size={14} /> Hạn chót (Deadline)
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <DollarSign size={14} /> Giá thành (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: parseInt(e.target.value, 10) || 0})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: '100K', value: 100_000 },
                  { label: '500K', value: 500_000 },
                  { label: '1Tr', value: 1_000_000 },
                  { label: '5Tr', value: 5_000_000 },
                  { label: '10Tr', value: 10_000_000 },
                  { label: '50Tr', value: 50_000_000 },
                  { label: '100Tr', value: 100_000_000 },
                  { label: '1Tỷ', value: 1_000_000_000 },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cost: prev.cost + value }))}
                    className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    +{label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, cost: 0 }))}
                  className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <AlignLeft size={14} /> Thông tin dự án
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Link size={14} /> Link xem bản vẽ (Viewer)
            </label>
            <input
              value={formData.viewer_link}
              onChange={e => setFormData({...formData, viewer_link: e.target.value})}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Link size={14} /> Link Google Drive (Folder/File)
            </label>
            <input
              value={formData.drive_link}
              onChange={e => setFormData({...formData, drive_link: e.target.value})}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Save size={20} />
              {loading ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
