import React from 'react';
import { LayoutDashboard, ClipboardList, FileText, Settings, LogOut, HardHat } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Quản lý Task', icon: ClipboardList },
    { id: 'viewer', label: 'Xem bản vẽ', icon: FileText },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <HardHat className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">CAD Pro</h1>
          <p className="text-xs text-slate-500">Productivity Manager</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === item.id
                ? "bg-emerald-500/10 text-emerald-400 font-medium"
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon 
              size={20} 
              className={cn(
                "transition-colors",
                activeTab === item.id ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
              )} 
            />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200">
          <LogOut size={20} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};
