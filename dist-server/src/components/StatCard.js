import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };
    return (_jsx("div", { className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-500 mb-1", children: title }), _jsx("h3", { className: "text-2xl font-bold text-slate-900", children: value }), trend && (_jsxs("div", { className: cn("flex items-center gap-1 mt-2 text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-rose-600"), children: [_jsxs("span", { children: [trend.isPositive ? '+' : '-', trend.value, "%"] }), _jsx("span", { className: "text-slate-400 font-normal", children: "so v\u1EDBi th\u00E1ng tr\u01B0\u1EDBc" })] }))] }), _jsx("div", { className: cn("p-3 rounded-xl border", colorClasses[color]), children: _jsx(Icon, { size: 24 }) })] }) }));
};
