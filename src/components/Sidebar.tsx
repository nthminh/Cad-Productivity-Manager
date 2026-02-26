import React from 'react';
import { LayoutDashboard, ClipboardList, Settings, LogOut, HardHat, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Quản lý Task', icon: ClipboardList },
  ];

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất? Cấu hình Firebase sẽ bị xóa.')) return;
    localStorage.removeItem('firebase_config');
    window.location.reload();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <aside 
        className={cn(
          "bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 ease-in-out",
          "fixed lg:sticky top-0 z-40",
          "w-64", // Default width for desktop
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <HardHat className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">CAD Pro</h1>
              <p className="text-xs text-slate-500">Productivity Manager</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false); // Close mobile menu on tab change
              }}
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
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200">
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};
