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
  const startTimeRef = useRef<number | null>(null);

  // Restore timer state from Firestore on mount (cross-device compatible)
  useEffect(() => {
    const restore = async () => {
      if (!db) return;
      try {
        // Query Firestore directly for an active (unfinished) time log for this task
        const q = query(
          collection(db, 'time_logs'),
          where('task_id', '==', taskId),
          where('end_time', '==', null)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          // Clean up stale localStorage entry if present
          const stored = localStorage.getItem(ACTIVE_TIMER_KEY);
          if (stored) {
            try {
              const active: ActiveTimer = JSON.parse(stored);
              if (active.taskId === taskId) localStorage.removeItem(ACTIVE_TIMER_KEY);
            } catch (_) {}
          }
          return;
        }

        const logDoc = snapshot.docs[0];
        const startMs = new Date(logDoc.data().start_time).getTime();
        const elapsed = Math.floor((Date.now() - startMs) / 1000);

        startTimeRef.current = startMs;
        setActiveLogId(logDoc.id);
        setSeconds(elapsed);
        setIsRunning(true);

        // Sync localStorage so other tabs on the same device also know
        localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify({ taskId, logId: logDoc.id }));
      } catch (e) {
        console.error('Error restoring timer:', e);
      }
    };
    restore();
  }, [taskId, db]);

  // Tick: recalculate from start_time each second to avoid drift
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
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

      startTimeRef.current = new Date(startTime).getTime();
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

        startTimeRef.current = null;
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
