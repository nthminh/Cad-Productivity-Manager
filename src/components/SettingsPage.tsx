import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getUsers,
  addUser,
  updateUser,
  removeUser,
  getCurrentUser,
  type AppUser,
} from '../lib/auth';
import {
  type UserRole,
  type Permissions,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  PERMISSION_LABELS,
  getCustomRolePermissions,
  saveCustomRolePermissions,
} from '../lib/permissions';

// ── tiny helpers ───────────────────────────────────────────────────────

type Tab = 'users' | 'permissions';
type NonAdminRole = Exclude<UserRole, 'admin'>;

function Badge({ role }: { role: UserRole }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_BADGE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── User modal ─────────────────────────────────────────────────────────

interface UserModalProps {
  user: AppUser | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSaved }) => {
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'engineer');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCreate = user === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Vui lòng nhập tên hiển thị.'); return; }
    if (isCreate) {
      if (!username.trim()) { setError('Vui lòng nhập tên đăng nhập.'); return; }
      if (!password.trim()) { setError('Vui lòng nhập mật khẩu.'); return; }
    }
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await addUser(username.trim(), displayName.trim(), role, password);
      } else {
        const updates: { displayName?: string; role?: UserRole; password?: string } = {
          displayName: displayName.trim(),
          role,
        };
        if (password.trim()) updates.password = password;
        await updateUser(user.username, updates);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {isCreate ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCreate && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder="vd: nguyenvan"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tên hiển thị</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
              placeholder="vd: Nguyễn Văn A"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              {isCreate ? 'Mật khẩu' : 'Mật khẩu mới (để trống nếu không đổi)'}
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── SettingsPage ───────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [modalUser, setModalUser] = useState<AppUser | null | undefined>(undefined); // undefined=closed, null=create
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Permissions tab
  const [customPerms, setCustomPerms] = useState<Record<NonAdminRole, Permissions>>(
    getCustomRolePermissions(),
  );
  const [permsSaved, setPermsSaved] = useState(false);

  const currentUser = getCurrentUser();

  const refreshUsers = () => setUsers(getUsers());

  useEffect(() => { refreshUsers(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = (username: string) => {
    const all = getUsers();
    const admins = all.filter((u) => u.role === 'admin');
    const targetUser = all.find((u) => u.username === username);
    if (targetUser?.role === 'admin' && admins.length === 1) {
      showToast('Không thể xóa admin duy nhất trong hệ thống.');
      return;
    }
    if (username === currentUser?.username) {
      showToast('Không thể xóa tài khoản đang đăng nhập.');
      return;
    }
    removeUser(username);
    refreshUsers();
    showToast('Đã xóa người dùng.');
    setDeleteConfirm(null);
  };

  const handleSavePerms = () => {
    saveCustomRolePermissions(customPerms);
    setPermsSaved(true);
    setTimeout(() => setPermsSaved(false), 3000);
  };

  const togglePerm = (role: NonAdminRole, perm: keyof Permissions) => {
    setCustomPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
  };

  const nonAdminRoles: NonAdminRole[] = ['manager', 'engineer'];
  const permKeys = Object.keys(PERMISSION_LABELS) as (keyof Permissions)[];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'users'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} />
          Quản lý người dùng
        </button>
        <button
          onClick={() => setTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'permissions'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck size={16} />
          Phân quyền
        </button>
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Danh sách người dùng</h3>
            <button
              onClick={() => setModalUser(null)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow shadow-emerald-500/20"
            >
              <Plus size={16} />
              Thêm người dùng
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.username} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                  {u.displayName.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{u.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                </div>
                <Badge role={u.role} />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalUser(u)}
                    title="Chỉnh sửa / Đổi mật khẩu"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(u.username)}
                    title="Xóa người dùng"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="px-6 py-8 text-sm text-slate-400 text-center">Chưa có người dùng nào.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Permissions tab ── */}
      {tab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">Phân quyền theo vai trò</h3>
              <p className="text-xs text-slate-400 mt-0.5">Quyền Admin luôn bật và không thể thay đổi.</p>
            </div>
            <button
              onClick={handleSavePerms}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow shadow-emerald-500/20"
            >
              {permsSaved ? <CheckCircle2 size={16} /> : null}
              {permsSaved ? 'Đã lưu!' : 'Lưu thay đổi'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-semibold text-slate-600 min-w-[200px]">Quyền hạn</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-center">
                    <Badge role="admin" />
                  </th>
                  {nonAdminRoles.map((r) => (
                    <th key={r} className="px-6 py-3 font-semibold text-slate-600 text-center">
                      <Badge role={r} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {permKeys.map((perm) => (
                  <tr key={perm} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-700 font-medium">{PERMISSION_LABELS[perm]}</td>
                    {/* Admin – always on */}
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-emerald-500 mx-auto" title="Luôn bật" />
                    </td>
                    {nonAdminRoles.map((r) => (
                      <td key={r} className="px-6 py-3 text-center">
                        <button
                          onClick={() => togglePerm(r, perm)}
                          role="switch"
                          aria-checked={customPerms[r][perm]}
                          aria-label={`${PERMISSION_LABELS[perm]} cho ${ROLE_LABELS[r]}`}
                          className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 inline-flex items-center ${
                            customPerms[r][perm] ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              customPerms[r][perm] ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User modal */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={() => {
            refreshUsers();
            setModalUser(undefined);
            showToast(modalUser === null ? 'Đã thêm người dùng.' : 'Đã cập nhật người dùng.');
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa</h3>
                <p className="text-sm text-slate-500">
                  Bạn có chắc muốn xóa tài khoản <span className="font-semibold text-slate-700">@{deleteConfirm}</span>?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
