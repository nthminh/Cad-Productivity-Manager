import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  FileCheck, 
  Files, 
  Plus, 
  Search, 
  TrendingUp,
  AlertCircle,
  Menu // Import the Menu icon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { TaskTable } from './components/TaskTable';
import { DrawingViewer } from './components/DrawingViewer';
import { TaskForm } from './components/TaskForm';
import { db, isFirebaseConfigured } from './lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Task } from './types/database.types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setError("Firebase is not configured. Please set up your environment variables.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "tasks"), orderBy("created_at", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
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

  const fetchTasks = () => {};

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
  const totalActualHours = tasks.reduce((acc, t) => acc + t.actual_hours, 0);
  const totalTargetHours = tasks.reduce((acc, t) => acc + t.target_hours, 0);
  const avgProductivity = totalActualHours > 0 ? (totalTargetHours / totalActualHours) * 100 : 0;

  const chartData = tasks.slice(0, 7).map(t => ({
    name: t.drawing_name.length > 10 ? t.drawing_name.slice(0, 10) + '...' : t.drawing_name,
    productivity: t.actual_hours > 0 ? (t.target_hours / t.actual_hours) * 100 : 0,
    fullName: t.drawing_name
  }));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 lg:p-8 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                {activeTab === 'dashboard' ? 'Tổng quan' : 'Quản lý bản vẽ'}
              </h2>
              <p className="text-slate-500 mt-1 text-xs lg:text-base hidden sm:block">
                {activeTab === 'dashboard' 
                  ? 'Theo dõi các chỉ số hiệu quả công việc.' 
                  : 'Danh sách chi tiết các nhiệm vụ và tiến độ.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm bản vẽ..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-48 lg:w-64"
              />
            </div>
            <button 
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 lg:px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={20} className="hidden sm:inline-block"/>
              <span className="text-sm sm:text-base">Thêm Task</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard 
                  title="Tổng số bản vẽ" 
                  value={totalTasks} 
                  icon={Files} 
                  color="blue"
                />
                <StatCard 
                  title="Tổng giờ làm" 
                  value={`${totalActualHours.toFixed(1)}h`} 
                  icon={Clock} 
                  color="amber"
                />
                <StatCard 
                  title="Hoàn thành" 
                  value={completedTasks} 
                  icon={FileCheck} 
                  color="emerald"
                />
                <StatCard 
                  title="Năng suất TB" 
                  value={`${avgProductivity.toFixed(1)}%`} 
                  icon={TrendingUp} 
                  color={avgProductivity > 100 ? 'emerald' : avgProductivity < 80 ? 'rose' : 'blue'}
                />
              </div>

              <div className="bg-white p-4 lg:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <BarChart3 className="text-emerald-500" size={20} />
                  Biểu đồ năng suất (7 bản vẽ gần nhất)
                </h3>
                <div className="h-[300px] lg:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        unit="%"
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          padding: '12px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Năng suất']}
                      />
                      <Bar dataKey="productivity" radius={[4, 4, 0, 0]} barSize={25}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.productivity > 100 ? '#10b981' : entry.productivity < 80 ? '#f43f5e' : '#3b82f6'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <TaskTable 
                tasks={tasks} 
                onRefresh={fetchTasks} 
                onViewDrawing={(url) => setViewerUrl(url)} 
              />
            </div>
          )}
        </main>
      </div>

      {viewerUrl && (
        <DrawingViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
      )}

      {showTaskForm && (
        <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={() => setShowTaskForm(false)} />
      )}
    </div>
  );
}
