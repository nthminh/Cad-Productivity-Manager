import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Save, Pencil, Trash2, User, Camera } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Engineer } from '../types/database.types';

const POSITIONS = ['Kỹ sư', 'Kỹ sư trưởng', 'Quản lý dự án', 'Giám đốc', 'Nhân viên', 'Thực tập sinh'];

interface EngineerFormProps {
  initial?: Partial<Engineer>;
  onClose: () => void;
  onSaved: () => void;
}

const EngineerForm: React.FC<EngineerFormProps> = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? '',
    date_of_birth: initial?.date_of_birth ?? '',
    position: initial?.position ?? 'Kỹ sư',
    photo_url: initial?.photo_url ?? '',
    basic_salary: initial?.basic_salary ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initial?.photo_url ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError('Ảnh không được lớn hơn 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setForm(f => ({ ...f, photo_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      if (initial?.id) {
        await updateDoc(doc(db, 'engineers', initial.id), { ...form });
      } else {
        await addDoc(collection(db, 'engineers'), { ...form, created_at: new Date().toISOString() });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <User className="text-white" size={20} />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">
              {initial?.id ? 'Chỉnh sửa kỹ sư' : 'Thêm kỹ sư mới'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
          )}

          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-400 transition-colors relative group"
              onClick={() => fileRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="text-slate-400 group-hover:text-emerald-400 transition-colors" size={32} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              {photoPreview ? 'Đổi ảnh' : 'Tải ảnh lên (≤500KB)'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên</label>
            <input
              required
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Ngày tháng năm sinh</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Chức danh</label>
            <select
              value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Lương căn bản (VNĐ/tháng)</label>
            <input
              type="number"
              min="0"
              step="100000"
              value={form.basic_salary}
              onChange={e => setForm(f => ({ ...f, basic_salary: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              <Save size={18} />
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EngineerList: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEngineer, setEditEngineer] = useState<Engineer | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'engineers'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setEngineers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Engineer));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (engineer: Engineer) => {
    if (!db) return;
    if (!window.confirm(`Bạn có chắc muốn xóa kỹ sư "${engineer.full_name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'engineers', engineer.id));
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xóa.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Danh sách kỹ sư</h3>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý thông tin các kỹ sư và nhân viên</p>
        </div>
        <button
          onClick={() => { setEditEngineer(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <Plus size={18} />
          Thêm kỹ sư
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ảnh</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Họ và tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ngày sinh</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Chức danh</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lương căn bản</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">Đang tải...</td></tr>
              )}
              {!loading && engineers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">Chưa có kỹ sư nào. Nhấn "Thêm kỹ sư" để bắt đầu.</td></tr>
              )}
              {engineers.map(eng => (
                <tr key={eng.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    {eng.photo_url ? (
                      <img src={eng.photo_url} alt={eng.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={18} className="text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{eng.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    {eng.date_of_birth ? (() => {
                      const d = new Date(eng.date_of_birth);
                      return isNaN(d.getTime()) ? <span className="text-slate-400 italic">Không hợp lệ</span> : d.toLocaleDateString('vi-VN');
                    })() : <span className="text-slate-400 italic">Chưa có</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                      {eng.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                    {eng.basic_salary > 0 ? eng.basic_salary.toLocaleString('vi-VN') + ' ₫' : <span className="text-slate-400 italic">Chưa có</span>}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditEngineer(eng); setShowForm(true); }}
                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(eng)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EngineerForm
          initial={editEngineer ?? undefined}
          onClose={() => { setShowForm(false); setEditEngineer(null); }}
          onSaved={() => {}}
        />
      )}
    </div>
  );
};
