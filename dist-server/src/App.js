import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, FileCheck, Files, Plus, Search, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { TaskTable } from './components/TaskTable';
import { DrawingViewer } from './components/DrawingViewer';
import { FirebaseSetup } from './components/FirebaseSetup';
import { TaskForm } from './components/TaskForm';
import { db, isFirebaseConfigured } from './lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [error, setError] = useState(null);
    const [showTaskForm, setShowTaskForm] = useState(false);
    useEffect(() => {
        if (!isFirebaseConfigured || !db) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(collection(db, "tasks"), orderBy("created_at", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasksData = [];
            querySnapshot.forEach((doc) => {
                tasksData.push({ id: doc.id, ...doc.data() });
            });
            setTasks(tasksData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching tasks from Firebase:", err);
            setError("Không thể kết nối với Firebase. Vui lòng kiểm tra cấu hình.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    const fetchTasks = () => { };
    // If Firebase is not configured, force the settings tab
    useEffect(() => {
        if (!isFirebaseConfigured && activeTab !== 'settings') {
            setActiveTab('settings');
        }
    }, [activeTab]);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const totalActualHours = tasks.reduce((acc, t) => acc + t.actual_hours, 0);
    const totalTargetHours = tasks.reduce((acc, t) => acc + t.target_hours, 0);
    const avgProductivity = totalActualHours > 0 ? (totalTargetHours / totalActualHours) * 100 : 0;
    const upcomingDeadlines = tasks
        .filter(t => t.deadline && t.status !== 'Hoàn thành' && new Date(t.deadline) >= new Date())
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 3);
    const overdueTasks = tasks
        .filter(t => t.deadline && t.status !== 'Hoàn thành' && new Date(t.deadline) < new Date());
    const chartData = tasks.slice(0, 7).map(t => ({
        name: t.drawing_name.length > 10 ? t.drawing_name.slice(0, 10) + '...' : t.drawing_name,
        productivity: t.actual_hours > 0 ? (t.target_hours / t.actual_hours) * 100 : 0,
        fullName: t.drawing_name
    }));
    return (_jsxs("div", { className: "flex min-h-screen bg-slate-50 font-sans text-slate-900", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab }), _jsxs("main", { className: "flex-1 p-8 overflow-y-auto", children: [error && (_jsxs("div", { className: "mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700", children: [_jsx(AlertCircle, { size: 20 }), _jsx("p", { className: "text-sm font-medium", children: error })] })), _jsxs("header", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold text-slate-900 tracking-tight", children: activeTab === 'dashboard' ? 'Tổng quan năng suất' : 'Quản lý bản vẽ' }), _jsx("p", { className: "text-slate-500 mt-1", children: activeTab === 'dashboard'
                                            ? 'Theo dõi các chỉ số hiệu quả công việc của đội ngũ kỹ sư.'
                                            : 'Danh sách chi tiết các nhiệm vụ và tiến độ thiết kế.' })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", size: 18 }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm b\u1EA3n v\u1EBD...", className: "pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64" })] }), _jsxs("button", { onClick: () => setShowTaskForm(true), className: "flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 active:scale-95", children: [_jsx(Plus, { size: 20 }), "Th\u00EAm Task m\u1EDBi"] })] })] }), activeTab === 'settings' ? (_jsx(FirebaseSetup, {})) : activeTab === 'dashboard' ? (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(StatCard, { title: "T\u1ED5ng s\u1ED1 b\u1EA3n v\u1EBD", value: totalTasks, icon: Files, color: "blue", trend: { value: 12, isPositive: true } }), _jsx(StatCard, { title: "T\u1ED5ng gi\u1EDD l\u00E0m vi\u1EC7c", value: `${totalActualHours.toFixed(1)}h`, icon: Clock, color: "amber" }), _jsx(StatCard, { title: "B\u1EA3n v\u1EBD ho\u00E0n th\u00E0nh", value: completedTasks, icon: FileCheck, color: "emerald" }), _jsx(StatCard, { title: "N\u0103ng su\u1EA5t TB", value: `${avgProductivity.toFixed(1)}%`, icon: TrendingUp, color: avgProductivity > 100 ? 'emerald' : avgProductivity < 80 ? 'rose' : 'blue' })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("h3", { className: "text-lg font-bold text-slate-900 flex items-center gap-2", children: [_jsx(BarChart3, { className: "text-emerald-500", size: 20 }), "Bi\u1EC3u \u0111\u1ED3 n\u0103ng su\u1EA5t (7 b\u1EA3n v\u1EBD g\u1EA7n nh\u1EA5t)"] }), _jsxs("div", { className: "flex items-center gap-4 text-xs font-medium", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-emerald-500" }), _jsx("span", { className: "text-slate-500", children: "> 100% (T\u1ED1t)" })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-rose-500" }), _jsx("span", { className: "text-slate-500", children: "< 80% (C\u1EA7n c\u1EA3i thi\u1EC7n)" })] })] })] }), _jsx("div", { className: "h-[350px] w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "name", axisLine: false, tickLine: false, tick: { fill: '#64748b', fontSize: 12 }, dy: 10 }), _jsx(YAxis, { axisLine: false, tickLine: false, tick: { fill: '#64748b', fontSize: 12 }, unit: "%" }), _jsx(Tooltip, { cursor: { fill: '#f8fafc' }, contentStyle: {
                                                                    borderRadius: '12px',
                                                                    border: 'none',
                                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                                    padding: '12px'
                                                                }, formatter: (value) => [`${value.toFixed(1)}%`, 'Năng suất'] }), _jsx(Bar, { dataKey: "productivity", radius: [6, 6, 0, 0], barSize: 40, children: chartData.map((entry, index) => (_jsx(Cell, { fill: entry.productivity > 100 ? '#10b981' : entry.productivity < 80 ? '#f43f5e' : '#3b82f6' }, `cell-${index}`))) })] }) }) })] }), _jsxs("div", { className: "bg-white p-8 rounded-2xl border border-slate-200 shadow-sm", children: [_jsx("h3", { className: "text-lg font-bold text-slate-900 mb-6", children: "H\u1EA1n ch\u00F3t s\u1EAFp t\u1EDBi" }), _jsxs("div", { className: "space-y-6", children: [upcomingDeadlines.map((task) => (_jsxs("div", { className: "flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100", children: [_jsx("div", { className: "bg-amber-100 p-2 rounded-lg h-fit", children: _jsx(Clock, { className: "text-amber-600", size: 18 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-slate-900 leading-none", children: task.drawing_name }), _jsxs("p", { className: "text-xs text-rose-500 font-medium mt-1", children: ["H\u1EA1n: ", new Date(task.deadline).toLocaleDateString('vi-VN')] })] })] }, task.id))), overdueTasks.length > 0 && (_jsxs("div", { className: "mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700", children: [_jsx(AlertCircle, { size: 16 }), _jsxs("span", { className: "text-xs font-bold", children: ["C\u00F3 ", overdueTasks.length, " task qu\u00E1 h\u1EA1n!"] })] })), upcomingDeadlines.length === 0 && overdueTasks.length === 0 && (_jsx("p", { className: "text-sm text-slate-500 italic", children: "Kh\u00F4ng c\u00F3 h\u1EA1n ch\u00F3t n\u00E0o s\u1EAFp t\u1EDBi." }))] }), _jsx("h3", { className: "text-lg font-bold text-slate-900 mt-10 mb-6", children: "Ho\u1EA1t \u0111\u1ED9ng g\u1EA7n \u0111\u00E2y" }), _jsxs("div", { className: "space-y-6", children: [tasks.slice(0, 5).map((task) => (_jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: `mt-1 w-2 h-2 rounded-full shrink-0 ${task.status === 'Hoàn thành' ? 'bg-emerald-500' : 'bg-blue-500'}` }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-900 leading-none", children: task.drawing_name }), _jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [task.engineer_name, " - ", task.status] }), _jsx("p", { className: "text-[10px] text-slate-400 mt-0.5", children: new Date(task.created_at).toLocaleDateString('vi-VN') })] })] }, task.id))), tasks.length === 0 && (_jsx("p", { className: "text-sm text-slate-500 italic", children: "Ch\u01B0a c\u00F3 ho\u1EA1t \u0111\u1ED9ng n\u00E0o." }))] })] })] })] })) : (_jsx("div", { className: "space-y-6", children: _jsx(TaskTable, { tasks: tasks, onRefresh: fetchTasks, onViewDrawing: (url) => setViewerUrl(url) }) }))] }), viewerUrl && (_jsx(DrawingViewer, { url: viewerUrl, onClose: () => setViewerUrl(null) })), showTaskForm && (_jsx(TaskForm, { onClose: () => setShowTaskForm(false), onSuccess: () => setShowTaskForm(false) }))] }));
}
