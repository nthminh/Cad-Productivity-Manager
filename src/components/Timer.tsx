import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Timer as TimerIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

const ACTIVE_TIMER_KEY = 'active_timer';

interface ActiveTimer {
  taskId: string;
  logId: string;
}

interface TimerProps {
  taskId: string;
  onTimeUpdate: () => void;
  isRunning: boolean;
}

export const Timer: React.FC<TimerProps> = ({ taskId, onTimeUpdate, isRunning: initialIsRunning }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore timer state from localStorage/Firestore on mount
  useEffect(() => {
    const restore = async () => {
      if (!db) return;
      try {
        const stored = localStorage.getItem(ACTIVE_TIMER_KEY);
        if (!stored) return;
        const active: ActiveTimer = JSON.parse(stored);
        if (active.taskId !== taskId) return;

        const logRef = doc(db, 'time_logs', active.logId);
        const logSnap = await getDoc(logRef);
        if (!logSnap.exists() || logSnap.data().end_time) return;

        const start = new Date(logSnap.data().start_time).getTime();
        const elapsed = Math.floor((Date.now() - start) / 1000);

        setActiveLogId(active.logId);
        setSeconds(elapsed);
        setIsRunning(true);
      } catch (e) {
        console.error('Error restoring timer:', e);
      }
    };
    restore();
  }, [taskId, db]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!db || isRunning) return;
    try {
      const startTime = new Date().toISOString();
      const docRef = await addDoc(collection(db, "time_logs"), {
        task_id: taskId,
        start_time: startTime,
        end_time: null,
        duration: null
      });

      const active: ActiveTimer = { taskId, logId: docRef.id };
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(active));

      setActiveLogId(docRef.id);
      setSeconds(0);
      setIsRunning(true);
      
      // Update task status
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: 'Đang làm' });
      onTimeUpdate();
    } catch (e) {
      console.error("Error starting timer:", e);
    }
  };

  const handleStop = async () => {
    if (!activeLogId) return;
    try {
      const endTime = new Date().toISOString();
      const logRef = doc(db, "time_logs", activeLogId);
      const logSnap = await getDoc(logRef);
      
      if (logSnap.exists()) {
        const start = new Date(logSnap.data().start_time).getTime();
        const end = new Date(endTime).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);

        await updateDoc(logRef, {
          end_time: endTime,
          duration: durationSeconds
        });

        // Calculate total hours for the task
        const q = query(collection(db, "time_logs"), where("task_id", "==", taskId));
        const querySnapshot = await getDocs(q);
        let totalSeconds = 0;
        querySnapshot.forEach((doc) => {
          totalSeconds += doc.data().duration || 0;
        });
        
        const totalHours = totalSeconds / 3600;
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { actual_hours: totalHours });

        localStorage.removeItem(ACTIVE_TIMER_KEY);

        setIsRunning(false);
        setSeconds(0);
        setActiveLogId(null);
        onTimeUpdate();
      }
    } catch (e) {
      console.error("Error stopping timer:", e);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 font-mono text-lg font-bold text-slate-700">
        <TimerIcon size={20} className={isRunning ? "text-emerald-500 animate-pulse" : "text-slate-400"} />
        {formatTime(seconds)}
      </div>
      {isRunning ? (
        <button
          onClick={handleStop}
          className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium"
        >
          <Square size={14} fill="currentColor" />
          Dừng
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium"
        >
          <Play size={14} fill="currentColor" />
          Bắt đầu
        </button>
      )}
    </div>
  );
};
