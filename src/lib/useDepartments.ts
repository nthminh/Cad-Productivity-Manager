import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';

export type Department = {
  id: string;
  name: string;
  colorKey: string;
  order: number;
};

export const COLOR_OPTIONS = ['rose', 'blue', 'amber', 'emerald', 'purple', 'slate', 'cyan', 'orange'] as const;
export type ColorKey = (typeof COLOR_OPTIONS)[number];

export const COLOR_CONFIGS: Record<string, { headerBg: string; nodeBorder: string; nodeText: string; nodeLight: string; badge: string; dot: string }> = {
  rose: {
    headerBg: 'bg-rose-600',
    nodeBorder: 'border-rose-300',
    nodeText: 'text-rose-700',
    nodeLight: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
  },
  blue: {
    headerBg: 'bg-blue-600',
    nodeBorder: 'border-blue-300',
    nodeText: 'text-blue-700',
    nodeLight: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  amber: {
    headerBg: 'bg-amber-500',
    nodeBorder: 'border-amber-300',
    nodeText: 'text-amber-700',
    nodeLight: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  emerald: {
    headerBg: 'bg-emerald-600',
    nodeBorder: 'border-emerald-300',
    nodeText: 'text-emerald-700',
    nodeLight: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  purple: {
    headerBg: 'bg-purple-600',
    nodeBorder: 'border-purple-300',
    nodeText: 'text-purple-700',
    nodeLight: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  slate: {
    headerBg: 'bg-slate-600',
    nodeBorder: 'border-slate-300',
    nodeText: 'text-slate-700',
    nodeLight: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
  },
  cyan: {
    headerBg: 'bg-cyan-600',
    nodeBorder: 'border-cyan-300',
    nodeText: 'text-cyan-700',
    nodeLight: 'bg-cyan-50',
    badge: 'bg-cyan-100 text-cyan-700',
    dot: 'bg-cyan-500',
  },
  orange: {
    headerBg: 'bg-orange-500',
    nodeBorder: 'border-orange-300',
    nodeText: 'text-orange-700',
    nodeLight: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
  },
};

const DEFAULT_DEPARTMENTS: Omit<Department, 'id'>[] = [
  { name: 'Ban Giám đốc', colorKey: 'rose', order: 0 },
  { name: 'Kỹ thuật', colorKey: 'blue', order: 1 },
  { name: 'Sản xuất', colorKey: 'amber', order: 2 },
  { name: 'Hành chính', colorKey: 'emerald', order: 3 },
];

// Legacy position → department mapping (for engineers without a department field)
export const LEGACY_DEPT_MAP: Record<string, string> = {
  'Giám đốc': 'Ban Giám đốc',
  'Quản lý dự án': 'Ban Giám đốc',
  'Kỹ sư trưởng': 'Kỹ thuật',
  'Kỹ sư': 'Kỹ thuật',
  'Thực tập sinh': 'Sản xuất',
  'Nhân viên': 'Hành chính',
  'Công nhân': 'Sản xuất',
};

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      if (!db) return;
      // Check if departments collection is empty and seed if needed
      if (!seeded.current) {
        seeded.current = true;
        const snap = await getDocs(collection(db, 'departments'));
        if (snap.empty) {
          await Promise.all(
            DEFAULT_DEPARTMENTS.map((d) => addDoc(collection(db, 'departments'), d)),
          );
        }
      }

      const q = query(collection(db, 'departments'), orderBy('order', 'asc'));
      unsubscribe = onSnapshot(q, (snap) => {
        setDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Department));
        setLoading(false);
      });
    };

    void init();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const addDepartment = async (name: string, colorKey: string): Promise<void> => {
    if (!db) return;
    const maxOrder = departments.length > 0 ? Math.max(...departments.map((d) => d.order)) : -1;
    await addDoc(collection(db, 'departments'), { name, colorKey, order: maxOrder + 1 });
  };

  const updateDepartment = async (id: string, name: string, colorKey: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'departments', id), { name, colorKey });
  };

  const deleteDepartment = async (id: string): Promise<void> => {
    if (!db) return;
    await deleteDoc(doc(db, 'departments', id));
  };

  return { departments, loading, addDepartment, updateDepartment, deleteDepartment };
}
