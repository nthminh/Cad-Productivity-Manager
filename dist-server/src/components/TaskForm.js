import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { X, Save, HardHat, User, FileText, Target, Star, Clock, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
export const TaskForm = ({ onClose, onSuccess }) => {
    const initialFormData = {
        drawing_name: '',
        engineer_name: '',
        project_id: 'default-project',
        difficulty: 3,
        target_hours: 8,
        actual_hours: 0,
        status: 'Đang làm',
        drive_link: '',
        viewer_link: '',
        deadline: '',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        if (!success)
            return;
        const timer = setTimeout(() => {
            setSuccess(false);
            onClose();
        }, 1500);
        return () => clearTimeout(timer);
    }, [success, onClose]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db)
            return;
        setLoading(true);
        setError(null);
        try {
            await addDoc(collection(db, "tasks"), {
                ...formData,
                created_at: new Date().toISOString()
            });
            setFormData(initialFormData);
            onSuccess();
            setSuccess(true);
        }
        catch (err) {
            console.error("Error adding task:", err);
            setError("Có lỗi xảy ra khi thêm task. Vui lòng thử lại.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200", children: [_jsxs("div", { className: "p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "bg-emerald-500 p-2 rounded-lg", children: _jsx(HardHat, { className: "text-white", size: 20 }) }), _jsx("h2", { className: "font-bold text-slate-900 text-lg", children: "Th\u00EAm b\u1EA3n v\u1EBD m\u1EDBi" })] }), _jsx("button", { onClick: onClose, className: "p-2 text-slate-400 hover:text-rose-500 transition-colors", children: _jsx(X, { size: 24 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-8 space-y-6", children: [error && (_jsx("div", { className: "p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium", children: error })), success && (_jsxs("div", { className: "p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2", children: [_jsx(CheckCircle2, { size: 16 }), "Th\u00EAm b\u1EA3n v\u1EBD th\u00E0nh c\u00F4ng!"] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5", children: [_jsx(FileText, { size: 14 }), " T\u00EAn b\u1EA3n v\u1EBD"] }), _jsx("input", { required: true, value: formData.drawing_name, onChange: e => setFormData({ ...formData, drawing_name: e.target.value }), placeholder: "V\u00ED d\u1EE5: MB-TANG-01.dwg", className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5", children: [_jsx(User, { size: 14 }), " K\u1EF9 s\u01B0 th\u1EF1c hi\u1EC7n"] }), _jsx("input", { required: true, value: formData.engineer_name, onChange: e => setFormData({ ...formData, engineer_name: e.target.value }), placeholder: "T\u00EAn k\u1EF9 s\u01B0", className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5", children: [_jsx(Target, { size: 14 }), " Gi\u1EDD m\u1EE5c ti\u00EAu (Target)"] }), _jsx("input", { type: "number", required: true, min: "0.5", step: "0.5", value: formData.target_hours, onChange: e => setFormData({ ...formData, target_hours: parseFloat(e.target.value) }), className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5", children: [_jsx(Star, { size: 14 }), " \u0110\u1ED9 kh\u00F3 (1-5)"] }), _jsx("select", { value: formData.difficulty, onChange: e => setFormData({ ...formData, difficulty: parseInt(e.target.value) }), className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all", children: [1, 2, 3, 4, 5].map(v => _jsxs("option", { value: v, children: [v, " Sao"] }, v)) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5", children: [_jsx(Clock, { size: 14 }), " H\u1EA1n ch\u00F3t (Deadline)"] }), _jsx("input", { type: "date", value: formData.deadline, onChange: e => setFormData({ ...formData, deadline: e.target.value }), className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-xs font-bold text-slate-500 uppercase", children: "Link Google Drive (B\u1EA3n v\u1EBD/PDF)" }), _jsx("input", { value: formData.viewer_link, onChange: e => setFormData({ ...formData, viewer_link: e.target.value }), placeholder: "https://drive.google.com/file/d/...", className: "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" }), _jsx("p", { className: "text-[10px] text-slate-400 italic", children: "* L\u01B0u \u00FD: H\u00E3y \u0111\u1EC3 ch\u1EBF \u0111\u1ED9 \"B\u1EA5t k\u1EF3 ai c\u00F3 \u0111\u01B0\u1EDDng li\u00EAn k\u1EBFt \u0111\u1EC1u c\u00F3 th\u1EC3 xem\"" })] }), _jsxs("div", { className: "pt-4 flex gap-3", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all", children: "H\u1EE7y" }), _jsxs("button", { type: "submit", disabled: loading, className: "flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95", children: [_jsx(Save, { size: 20 }), loading ? 'Đang lưu...' : 'Lưu bản vẽ'] })] })] })] }) }));
};
