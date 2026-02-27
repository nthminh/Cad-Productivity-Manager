import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY = 'firebase_config';
// Delay before reloading so the user can see the success message
const RELOAD_DELAY_MS = 1500;

const FIELDS: { key: keyof FirebaseConfig; label: string; placeholder: string }[] = [
  { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...' },
  { key: 'authDomain', label: 'Auth Domain', placeholder: 'your-project.firebaseapp.com' },
  { key: 'projectId', label: 'Project ID', placeholder: 'your-project-id' },
  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'your-project.appspot.com' },
  { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
  { key: 'appId', label: 'App ID', placeholder: '1:123456789:web:abc123' },
];

const emptyConfig = (): FirebaseConfig => ({
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
});

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<FirebaseConfig>(emptyConfig);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnvConfigured =
    !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        setHasSavedConfig(true);
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const handleSave = () => {
    if (!config.apiKey.trim() || !config.projectId.trim()) {
      setError('API Key và Project ID là bắt buộc.');
      return;
    }
    setError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, RELOAD_DELAY_MS);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(emptyConfig());
    setHasSavedConfig(false);
    setSaved(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Cài đặt Firebase</h3>
        <p className="text-sm text-slate-500 mt-0.5">Cấu hình kết nối Firebase Firestore Database</p>
      </div>

      {/* Connection status */}
      <div
        className={`p-4 rounded-2xl border flex items-center gap-3 ${
          isFirebaseConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}
      >
        {isFirebaseConfigured ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        <div>
          <p className="font-semibold text-sm">
            {isFirebaseConfigured
              ? 'Firebase đã kết nối thành công'
              : 'Firebase chưa được cấu hình'}
          </p>
          {isEnvConfigured && (
            <p className="text-xs mt-0.5 opacity-80">
              Đang sử dụng cấu hình từ biến môi trường (Environment Variables)
            </p>
          )}
        </div>
      </div>

      {isEnvConfigured ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
          <p className="font-semibold">Cấu hình từ Environment Variables đang được sử dụng</p>
          <p className="mt-1 opacity-80">
            Firebase đã được cấu hình thông qua biến môi trường. Bạn không cần nhập thủ công.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <p className="text-sm text-slate-600">
            Nhập thông tin Firebase của bạn. Bạn có thể tìm thấy các thông tin này trong{' '}
            <strong>Firebase Console → Project Settings → Your apps</strong>.
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
              {error}
            </div>
          )}

          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Đã lưu! Đang tải lại trang để kết nối...
            </div>
          )}

          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
              <input
                type="text"
                value={config[key]}
                onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-mono"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saved}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Save size={18} />
              Lưu & Kết nối
            </button>
            {hasSavedConfig && (
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all"
                title="Xóa cấu hình đã lưu"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
