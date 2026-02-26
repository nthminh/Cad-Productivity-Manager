import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import { Trash2, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
export const TaskContextMenu = ({ task, onClose, onRefresh }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    const handleDelete = async () => {
        if (!db)
            return;
        if (!window.confirm(`Bạn có chắc muốn xóa bản vẽ "${task.drawing_name}"?`))
            return;
        try {
            await deleteDoc(doc(db, 'tasks', task.id));
            onRefresh();
        }
        catch (err) {
            console.error('Error deleting task:', err);
            alert('Có lỗi xảy ra khi xóa task.');
        }
        onClose();
    };
    const handleStatusChange = async (status) => {
        if (!db)
            return;
        try {
            await updateDoc(doc(db, 'tasks', task.id), { status });
            onRefresh();
        }
        catch (err) {
            console.error('Error updating task status:', err);
            alert('Có lỗi xảy ra khi cập nhật trạng thái.');
        }
        onClose();
    };
    return (_jsx("div", { ref: menuRef, className: "absolute right-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden", children: _jsxs("div", { className: "py-1", children: [task.status !== 'Hoàn thành' && (_jsxs("button", { onClick: () => handleStatusChange('Hoàn thành'), className: "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors", children: [_jsx(CheckCircle, { size: 16 }), "\u0110\u00E1nh d\u1EA5u ho\u00E0n th\u00E0nh"] })), task.status !== 'Đang làm' && (_jsxs("button", { onClick: () => handleStatusChange('Đang làm'), className: "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors", children: [_jsx(RefreshCw, { size: 16 }), "Chuy\u1EC3n sang \u0110ang l\u00E0m"] })), task.status !== 'Chờ duyệt' && (_jsxs("button", { onClick: () => handleStatusChange('Chờ duyệt'), className: "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors", children: [_jsx(Clock, { size: 16 }), "Chuy\u1EC3n sang Ch\u1EDD duy\u1EC7t"] })), _jsx("div", { className: "my-1 border-t border-slate-100" }), _jsxs("button", { onClick: handleDelete, className: "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors", children: [_jsx(Trash2, { size: 16 }), "X\u00F3a b\u1EA3n v\u1EBD"] })] }) }));
};
