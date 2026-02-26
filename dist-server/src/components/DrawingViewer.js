import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { X, Maximize2, ExternalLink } from 'lucide-react';
export const DrawingViewer = ({ url, onClose }) => {
    // Helper to convert Google Drive share link to preview link
    const getEmbedUrl = (link) => {
        if (link.includes('drive.google.com')) {
            // Standard: https://drive.google.com/file/d/ID/view?usp=sharing
            const match = link.match(/\/d\/(.+?)(\/|$|\?)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }
        return link;
    };
    const embedUrl = getEmbedUrl(url);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8", children: _jsxs("div", { className: "bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden", children: [_jsxs("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between bg-white", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "bg-blue-600 p-2 rounded-lg", children: _jsx(Maximize2, { className: "text-white", size: 20 }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-bold text-slate-900", children: "Tr\u00ECnh xem Google Drive" }), _jsx("p", { className: "text-xs text-slate-500", children: "Xem tr\u1EF1c ti\u1EBFp t\u00E0i li\u1EC7u t\u1EEB Drive" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors", children: [_jsx(ExternalLink, { size: 16 }), "M\u1EDF tab m\u1EDBi"] }), _jsx("button", { onClick: onClose, className: "p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors", children: _jsx(X, { size: 24 }) })] })] }), _jsx("div", { className: "flex-1 bg-slate-100 relative", children: _jsx("iframe", { src: embedUrl, className: "w-full h-full border-none", title: "Document Viewer", allowFullScreen: true }) })] }) }));
};
