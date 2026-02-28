export type UserRole = 'admin' | 'manager' | 'engineer' | 'employee';
type NonAdminRole = Exclude<UserRole, 'admin'>;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  engineer: 'Kỹ sư',
  employee: 'Nhân viên',
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  engineer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  employee: 'bg-amber-100 text-amber-700 border-amber-200',
};

export interface Permissions {
  canAddTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canViewEngineers: boolean;
  canManageEngineers: boolean;
  canViewSalary: boolean;
  canEditSalary: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;
}

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  canAddTask: 'Thêm Task',
  canEditTask: 'Sửa Task',
  canDeleteTask: 'Xóa Task',
  canViewEngineers: 'Xem danh sách kỹ sư',
  canManageEngineers: 'Quản lý kỹ sư',
  canViewSalary: 'Xem trang lương',
  canEditSalary: 'Chỉnh sửa lương',
  canViewReports: 'Xem báo cáo',
  canViewSettings: 'Xem cài đặt',
};

/** Admin always has all permissions – these cannot be changed. */
const ADMIN_PERMISSIONS: Permissions = {
  canAddTask: true,
  canEditTask: true,
  canDeleteTask: true,
  canViewEngineers: true,
  canManageEngineers: true,
  canViewSalary: true,
  canEditSalary: true,
  canViewReports: true,
  canViewSettings: true,
};

const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<UserRole, 'admin'>, Permissions> = {
  manager: {
    canAddTask: true,
    canEditTask: true,
    canDeleteTask: false,
    canViewEngineers: true,
    canManageEngineers: false,
    canViewSalary: true,
    canEditSalary: false,
    canViewReports: true,
    canViewSettings: false,
  },
  engineer: {
    canAddTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canViewEngineers: false,
    canManageEngineers: false,
    canViewSalary: false,
    canEditSalary: false,
    canViewReports: false,
    canViewSettings: false,
  },
  employee: {
    canAddTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canViewEngineers: false,
    canManageEngineers: false,
    canViewSalary: false,
    canEditSalary: false,
    canViewReports: false,
    canViewSettings: false,
  },
};

const CUSTOM_PERMISSIONS_KEY = 'app_role_permissions';

/** Returns the persisted custom permissions for non-admin roles, falling back to defaults. */
export function getCustomRolePermissions(): Record<Exclude<UserRole, 'admin'>, Permissions> {
  try {
    const stored = localStorage.getItem(CUSTOM_PERMISSIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, Permissions>;
      // Validate that all required role keys are present with all expected permission keys
      const expectedRoles: NonAdminRole[] = ['manager', 'engineer', 'employee'];
      const expectedPerms = Object.keys(DEFAULT_ROLE_PERMISSIONS.manager) as (keyof Permissions)[];
      const isValid = expectedRoles.every(
        (r) =>
          r in parsed &&
          typeof parsed[r] === 'object' &&
          expectedPerms.every((p) => typeof parsed[r][p] === 'boolean'),
      );
      if (isValid) return parsed as Record<Exclude<UserRole, 'admin'>, Permissions>;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

/** Persists custom permissions for non-admin roles. */
export function saveCustomRolePermissions(
  permissions: Record<Exclude<UserRole, 'admin'>, Permissions>,
): void {
  localStorage.setItem(CUSTOM_PERMISSIONS_KEY, JSON.stringify(permissions));
}

export function getPermissions(role: UserRole): Permissions {
  if (role === 'admin') return ADMIN_PERMISSIONS;
  return getCustomRolePermissions()[role];
}
