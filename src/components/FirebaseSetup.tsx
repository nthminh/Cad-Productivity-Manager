import React, { useState, useEffect } from 'react';
import { Database, Save, AlertCircle, CheckCircle2, ShieldAlert, Code2 } from 'lucide-react';
import { isHardcodedConfigActive } from '../lib/firebase';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const FirebaseSetup: React.FC = () => {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('firebase_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    setSaved(true);
    // Reload to re-initialize Firebase with new config
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isHardcodedConfigActive && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex gap-3 text-emerald-800">
          <Code2 className="shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-bold">Cấu hình đã được nhúng sẵn trong code</p>
            <p>Firebase đang dùng cấu hình được nhúng trực tiếp trong mã nguồn (<code className="bg-emerald-100 px-1 rounded">src/lib/firebase.ts</code>). Tất cả người dùng chia sẻ cùng một database mà không cần cài đặt thêm.</p>
          </div>
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800">
        <ShieldAlert className="shrink-0" size={20} />
        <div className="text-sm">
          <p className="font-bold">Lưu ý bảo mật:</p>
          <p>Việc nhập trực tiếp vào đây chỉ dành cho mục đích demo/thử nghiệm nhanh. Để bảo mật và sử dụng lâu dài, bạn nên nhập các giá trị này vào phần <strong>Secrets</strong> của AI Studio.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Database className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Cấu hình Firebase</h2>
            <p className="text-sm text-slate-500">Nhập thông tin từ Firebase Console để kết nối Database</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">API Key</label>
            <input
              name="apiKey"
              value={config.apiKey}
              onChange={handleChange}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Auth Domain</label>
            <input
              name="authDomain"
              value={config.authDomain}
              onChange={handleChange}
              placeholder="project-id.firebaseapp.com"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Project ID</label>
            <input
              name="projectId"
              value={config.projectId}
              onChange={handleChange}
              placeholder="project-id"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Storage Bucket</label>
            <input
              name="storageBucket"
              value={config.storageBucket}
              onChange={handleChange}
              placeholder="project-id.appspot.com"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Messaging Sender ID</label>
            <input
              name="messagingSenderId"
              value={config.messagingSenderId}
              onChange={handleChange}
              placeholder="123456789"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">App ID</label>
            <input
              name="appId"
              value={config.appId}
              onChange={handleChange}
              placeholder="1:123456789:web:abc123"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                Đã lưu! Đang khởi động lại...
              </span>
            ) : (
              <span className="text-slate-400 text-xs italic">
                * Nhấn lưu sẽ tải lại trang để áp dụng cấu hình mới.
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Save size={20} />
            Lưu cấu hình
          </button>
        </div>
      </div>

      <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <AlertCircle size={18} className="text-blue-500" />
          Cách lấy thông tin này?
        </h3>
        <ol className="text-sm text-slate-600 space-y-2 list-decimal ml-4">
          <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a>.</li>
          <li>Chọn dự án của bạn (hoặc tạo mới).</li>
          <li>Nhấp vào biểu tượng <strong>Project Settings</strong> (hình bánh răng).</li>
          <li>Ở phần <strong>General</strong>, cuộn xuống <strong>Your apps</strong>.</li>
          <li>Nếu chưa có app, hãy tạo một Web App mới.</li>
          <li>Copy các giá trị từ đối tượng <code>firebaseConfig</code> và dán vào các ô trên.</li>
        </ol>
      </div>
    </div>
  );
};
