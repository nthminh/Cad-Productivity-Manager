import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Timer as TimerIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
export const Timer = ({ taskId, onTimeUpdate, isRunning: initialIsRunning }) => {
    const [isRunning, setIsRunning] = useState(initialIsRunning);
    const [seconds, setSeconds] = useState(0);
    const [activeLogId, setActiveLogId] = useState(null);
    const timerRef = useRef(null);
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        }
        else {
            if (timerRef.current)
                clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current)
                clearInterval(timerRef.current);
        };
    }, [isRunning]);
    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    const handleStart = async () => {
        if (!db)
            return;
        try {
            const startTime = new Date().toISOString();
            const docRef = await addDoc(collection(db, "time_logs"), {
                task_id: taskId,
                start_time: startTime,
                end_time: null,
                duration: null
            });
            setActiveLogId(docRef.id);
            setIsRunning(true);
            // Update task status
            const taskRef = doc(db, "tasks", taskId);
            await updateDoc(taskRef, { status: 'Đang làm' });
            onTimeUpdate();
        }
        catch (e) {
            console.error("Error starting timer:", e);
        }
    };
    const handleStop = async () => {
        if (!activeLogId)
            return;
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
                setIsRunning(false);
                setSeconds(0);
                setActiveLogId(null);
                onTimeUpdate();
            }
        }
        catch (e) {
            console.error("Error stopping timer:", e);
        }
    };
    return (_jsxs("div", { className: "flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2 font-mono text-lg font-bold text-slate-700", children: [_jsx(TimerIcon, { size: 20, className: isRunning ? "text-emerald-500 animate-pulse" : "text-slate-400" }), formatTime(seconds)] }), isRunning ? (_jsxs("button", { onClick: handleStop, className: "flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium", children: [_jsx(Square, { size: 14, fill: "currentColor" }), "D\u1EEBng"] })) : (_jsxs("button", { onClick: handleStart, className: "flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium", children: [_jsx(Play, { size: 14, fill: "currentColor" }), "B\u1EAFt \u0111\u1EA7u"] }))] }));
};
