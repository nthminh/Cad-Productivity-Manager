export type UserRole = 'admin' | 'manager' | 'engineer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  engineer: 'Kỹ sư',
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  engineer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canAddTask: true,
    canEditTask: true,
    canDeleteTask: true,
    canViewEngineers: true,
    canManageEngineers: true,
    canViewSalary: true,
    canEditSalary: true,
    canViewReports: true,
    canViewSettings: true,
  },
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
};

export function getPermissions(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role];
}
