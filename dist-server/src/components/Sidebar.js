import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { LayoutDashboard, ClipboardList, Settings, LogOut, HardHat } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tasks', label: 'Quản lý Task', icon: ClipboardList },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
    ];
    const handleLogout = () => {
        if (!window.confirm('Bạn có chắc muốn đăng xuất? Cấu hình Firebase sẽ bị xóa.'))
            return;
        localStorage.removeItem('firebase_config');
        window.location.reload();
    };
    return (_jsxs("aside", { className: "w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800", children: [_jsxs("div", { className: "p-6 flex items-center gap-3 border-b border-slate-800", children: [_jsx("div", { className: "bg-emerald-500 p-2 rounded-lg", children: _jsx(HardHat, { className: "text-white", size: 24 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-white font-bold text-lg leading-tight", children: "CAD Pro" }), _jsx("p", { className: "text-xs text-slate-500", children: "Productivity Manager" })] })] }), _jsx("nav", { className: "flex-1 py-6 px-4 space-y-1", children: menuItems.map((item) => (_jsxs("button", { onClick: () => setActiveTab(item.id), className: cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group", activeTab === item.id
                        ? "bg-emerald-500/10 text-emerald-400 font-medium"
                        : "hover:bg-slate-800 hover:text-white"), children: [_jsx(item.icon, { size: 20, className: cn("transition-colors", activeTab === item.id ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300") }), item.label] }, item.id))) }), _jsx("div", { className: "p-4 border-t border-slate-800", children: _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200", children: [_jsx(LogOut, { size: 20 }), "\u0110\u0103ng xu\u1EA5t"] }) })] }));
};
