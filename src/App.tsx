import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  FileCheck, 
  Files, 
  Plus, 
  Search, 
  TrendingUp,
  AlertCircle
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
import { FirebaseSetup } from './components/FirebaseSetup';
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

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
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
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3);

  const overdueTasks = tasks
    .filter(t => t.deadline && t.status !== 'Hoàn thành' && new Date(t.deadline) < new Date());

  const chartData = tasks.slice(0, 7).map(t => ({
    name: t.drawing_name.length > 10 ? t.drawing_name.slice(0, 10) + '...' : t.drawing_name,
    productivity: t.actual_hours > 0 ? (t.target_hours / t.actual_hours) * 100 : 0,
    fullName: t.drawing_name
  }));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-y-auto">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' ? 'Tổng quan năng suất' : 'Quản lý bản vẽ'}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' 
                ? 'Theo dõi các chỉ số hiệu quả công việc của đội ngũ kỹ sư.' 
                : 'Danh sách chi tiết các nhiệm vụ và tiến độ thiết kế.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm bản vẽ..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64"
              />
            </div>
            <button 
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={20} />
              Thêm Task mới
            </button>
          </div>
        </header>

        {activeTab === 'settings' ? (
          <FirebaseSetup />
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Tổng số bản vẽ" 
                value={totalTasks} 
                icon={Files} 
                color="blue"
                trend={{ value: 12, isPositive: true }}
              />
              <StatCard 
                title="Tổng giờ làm việc" 
                value={`${totalActualHours.toFixed(1)}h`} 
                icon={Clock} 
                color="amber"
              />
              <StatCard 
                title="Bản vẽ hoàn thành" 
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="text-emerald-500" size={20} />
                    Biểu đồ năng suất (7 bản vẽ gần nhất)
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-slate-500">&gt; 100% (Tốt)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className="text-slate-500">&lt; 80% (Cần cải thiện)</span>
                    </div>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
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
                      <Bar dataKey="productivity" radius={[6, 6, 0, 0]} barSize={40}>
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

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Hạn chót sắp tới</h3>
                <div className="space-y-6">
                  {upcomingDeadlines.map((task) => (
                    <div key={task.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="bg-amber-100 p-2 rounded-lg h-fit">
                        <Clock className="text-amber-600" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">{task.drawing_name}</p>
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          Hạn: {new Date(task.deadline!).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {overdueTasks.length > 0 && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700">
                      <AlertCircle size={16} />
                      <span className="text-xs font-bold">Có {overdueTasks.length} task quá hạn!</span>
                    </div>
                  )}
                  {upcomingDeadlines.length === 0 && overdueTasks.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Không có hạn chót nào sắp tới.</p>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-10 mb-6">Hoạt động gần đây</h3>
                <div className="space-y-6">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex gap-4">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        task.status === 'Hoàn thành' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 leading-none">{task.drawing_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {task.engineer_name} - {task.status}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(task.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Chưa có hoạt động nào.</p>
                  )}
                </div>
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

      {viewerUrl && (
        <DrawingViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
      )}

      {showTaskForm && (
        <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={() => setShowTaskForm(false)} />
      )}
    </div>
  );
}
