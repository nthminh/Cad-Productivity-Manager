import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Trash2, ClipboardPaste, KeyRound, Eye, EyeOff, LogOut, UserPlus, Users, ShieldCheck } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';
import { isUsingDefaultPassword, logout, getCurrentUser, updateUser, getUsers, addUser, removeUser, type AppUser } from '../lib/auth';
import { type UserRole, ROLE_LABELS, ROLE_BADGE_COLORS } from '../lib/permissions';

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

const parseFirebaseConfigText = (text: string): FirebaseConfig | null => {
  // Try plain JSON first
  try {
    const parsed = JSON.parse(text.trim());
    if (parsed && typeof parsed === 'object' && (parsed.apiKey || parsed.projectId)) {
      return {
        apiKey: parsed.apiKey ?? '',
        authDomain: parsed.authDomain ?? '',
        projectId: parsed.projectId ?? '',
        storageBucket: parsed.storageBucket ?? '',
        messagingSenderId: parsed.messagingSenderId ?? '',
        appId: parsed.appId ?? '',
      };
    }
  } catch {
    // Not plain JSON – try extracting from JS/TS snippet
  }

  // Extract each key directly from the full text to avoid issues with nested
  // braces or closing braces inside string values.
  const extract = (key: string): string => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`["']?${escapedKey}["']?\\s*:\\s*["'\`]([^"'\`]*)["'\`]`));
    return m ? m[1] : '';
  };

  const result: FirebaseConfig = {
    apiKey: extract('apiKey'),
    authDomain: extract('authDomain'),
    projectId: extract('projectId'),
    storageBucket: extract('storageBucket'),
    messagingSenderId: extract('messagingSenderId'),
    appId: extract('appId'),
  };

  if (!result.apiKey && !result.projectId) return null;
  return result;
};

export const SettingsPage: React.FC = () => {
  const currentSession = getCurrentUser();
  const isAdmin = currentSession?.role === 'admin';

  const [config, setConfig] = useState<FirebaseConfig>(emptyConfig);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [usingDefaultPwd, setUsingDefaultPwd] = useState(false);

  // User management state (admin only)
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('engineer');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSaved, setAddUserSaved] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);

  useEffect(() => {
    isUsingDefaultPassword().then(setUsingDefaultPwd);
  }, [passwordSaved]);

  useEffect(() => {
    if (isAdmin) setUsers(getUsers());
  }, [isAdmin, addUserSaved]);

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

  const handleAutoParse = () => {
    setPasteError(null);
    const parsed = parseFirebaseConfigText(pasteText);
    if (!parsed) {
      setPasteError('Không thể đọc cấu hình. Hãy dán đúng đoạn JSON hoặc JavaScript từ Firebase Console.');
      return;
    }
    setConfig(parsed);
    setPasteText('');
  };

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

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!currentSession) return;
    try {
      await updateUser(currentSession.username, { password: newPassword });
      setPasswordSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch {
      setPasswordError('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleAddUser = async () => {
    setAddUserError(null);
    if (!newUsername.trim() || !newDisplayName.trim()) {
      setAddUserError('Tên đăng nhập và tên hiển thị là bắt buộc.');
      return;
    }
    if (newUserPassword.length < 8) {
      setAddUserError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    setAddUserLoading(true);
    try {
      await addUser(newUsername.trim(), newDisplayName.trim(), newUserRole, newUserPassword);
      setNewUsername('');
      setNewDisplayName('');
      setNewUserRole('engineer');
      setNewUserPassword('');
      setShowAddUser(false);
      setAddUserSaved((v) => !v);
    } catch (err: unknown) {
      setAddUserError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleRemoveUser = (username: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa người dùng "${username}"?`)) return;
    removeUser(username);
    setUsers(getUsers());
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

          {/* Auto-paste section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Dán cấu hình tự động</p>
            <p className="text-xs text-slate-500">
              Sao chép toàn bộ đoạn <code className="bg-slate-200 px-1 rounded">firebaseConfig</code> từ{' '}
              Firebase Console rồi dán vào đây — tất cả các trường sẽ được điền tự động.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setPasteError(null); }}
              rows={5}
              placeholder={`Dán cấu hình vào đây, ví dụ:\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  ...\n};`}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-xs font-mono resize-none"
            />
            {pasteError && (
              <p className="text-xs text-rose-600">{pasteError}</p>
            )}
            <button
              type="button"
              onClick={handleAutoParse}
              disabled={!pasteText.trim()}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              <ClipboardPaste size={16} />
              Tự động điền các trường
            </button>
          </div>

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

      {/* Change Password section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-slate-500" />
          <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu đăng nhập</h3>
        </div>

        {usingDefaultPwd && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Bạn đang dùng mật khẩu mặc định <strong>admin</strong>. Hãy đổi ngay để bảo vệ dữ liệu.</span>
          </div>
        )}

        {passwordSaved && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            Mật khẩu đã được cập nhật thành công!
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
            {passwordError}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={!newPassword.trim() || !confirmPassword.trim()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <Save size={16} />
            Lưu mật khẩu mới
          </button>
        </div>
      </div>

      {/* User Management section — admin only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-500" />
              <h3 className="text-base font-bold text-slate-900">Quản lý người dùng</h3>
            </div>
            <button
              onClick={() => { setShowAddUser((v) => !v); setAddUserError(null); }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              <UserPlus size={16} />
              Thêm người dùng
            </button>
          </div>

          {showAddUser && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">Tạo người dùng mới</p>
              {addUserError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">{addUserError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Tên đăng nhập</label>
                  <input
                    value={newUsername}
                    onChange={(e) => { setNewUsername(e.target.value); setAddUserError(null); }}
                    placeholder="vd: nguyenvana"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Tên hiển thị</label>
                  <input
                    value={newDisplayName}
                    onChange={(e) => { setNewDisplayName(e.target.value); setAddUserError(null); }}
                    placeholder="vd: Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Quyền</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all"
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onChange={(e) => { setNewUserPassword(e.target.value); setAddUserError(null); }}
                      placeholder="≥ 8 ký tự"
                      className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all"
                    />
                    <button type="button" onClick={() => setShowNewUserPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddUser}
                  disabled={addUserLoading}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  <Save size={15} />
                  {addUserLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  onClick={() => { setShowAddUser(false); setAddUserError(null); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 rounded-xl">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tên đăng nhập</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tên hiển thị</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Quyền</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.username} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{u.displayName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_BADGE_COLORS[u.role]}`}>
                        <ShieldCheck size={11} className="inline mr-1" />
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.username !== currentSession?.username && (
                        <button
                          onClick={() => handleRemoveUser(u.username)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa người dùng"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Logout section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Đăng xuất</h3>
            <p className="text-sm text-slate-500 mt-0.5">Kết thúc phiên làm việc hiện tại</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-sm transition-all"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};
