import React, { useState, useEffect } from 'react';
import { X, Save, HardHat, User, FileText, Target, Star, Clock, CheckCircle2, DollarSign, Link, AlignLeft, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { Engineer } from '../types/database.types';

interface TaskFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onClose, onSuccess }) => {
  const initialFormData = {
    drawing_name: '',
    engineer_name: '',
    description: '',
    project_id: 'default-project',
    difficulty: 3,
    target_hours: 8,
    target_hours_period: 'giờ' as 'giờ' | 'ngày' | 'tuần' | 'tháng' | 'năm',
    actual_hours: 0,
    cost: 0,
    status: 'Đang làm',
    drive_link: '',
    viewer_link: '',
    deadline: '',
  };

  const [formData, setFormData] = useState(initialFormData);
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
      await addDoc(collection(db, "tasks"), {
        ...formData,
        created_at: new Date().toISOString()
      });
      setFormData(initialFormData);
      onSuccess();
      setSuccess(true);
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Có lỗi xảy ra khi thêm task. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <HardHat className="text-white" size={20} />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Thêm dự án mới</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 size={16} />
              Thêm dự án thành công!
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
                placeholder="Ví dụ: MB-TANG-01.dwg"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none pr-10"
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
                  placeholder="Tên kỹ sư"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Target size={14} /> Thời gian mục tiêu (Target)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={formData.target_hours}
                  onChange={e => setFormData({...formData, target_hours: parseFloat(e.target.value)})}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <div className="relative">
                  <select
                    value={formData.target_hours_period}
                    onChange={e => setFormData({...formData, target_hours_period: e.target.value as 'giờ' | 'ngày' | 'tuần' | 'tháng' | 'năm'})}
                    className="h-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none pr-8"
                  >
                    <option value="giờ">Giờ</option>
                    <option value="ngày">Ngày</option>
                    <option value="tuần">Tuần</option>
                    <option value="tháng">Tháng</option>
                    <option value="năm">Năm</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Star size={14} /> Độ khó (1-5)
              </label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData({...formData, difficulty: parseInt(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                    className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
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
              placeholder="Nhập thông tin cơ bản của dự án (mô tả, yêu cầu, ghi chú...)"
              rows={4}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 italic">* Lưu ý: Hãy để chế độ "Bất kỳ ai có đường liên kết đều có thể xem"</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Link size={14} /> Link Google Drive (Folder/File)
            </label>
            <input
              value={formData.drive_link}
              onChange={e => setFormData({...formData, drive_link: e.target.value})}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Save size={20} />
              {loading ? 'Đang lưu...' : 'Lưu dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
