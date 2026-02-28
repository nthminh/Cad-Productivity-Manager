import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  FileCheck, 
  Files, 
  TrendingUp,
  AlertCircle,
  Menu
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
import { EngineerList } from './components/EngineerList';
import { SalaryPage } from './components/SalaryPage';
import { ReportsPage } from './components/ReportsPage';
import { ChatPage } from './components/ChatPage';
import { BulletinBoardPage } from './components/BulletinBoardPage';
import { ChatNotificationBanner } from './components/ChatNotificationBanner';
import { LoginGate } from './components/LoginGate';
import { SettingsPage } from './components/SettingsPage';
import { InternalCalendarPage } from './components/InternalCalendarPage';
import { OrgChartPage } from './components/OrgChartPage';
import { db, isFirebaseConfigured } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { Task } from './types/database.types';
import { isAuthenticated, getCurrentUser } from './lib/auth';
import { type UserRole, getPermissions, ROLE_LABELS } from './lib/permissions';

export default function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [appUser, setAppUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mentionCount, setMentionCount] = useState(0);
  const [newChatMessageCount, setNewChatMessageCount] = useState(0);
  const [lastChatVisit, setLastChatVisit] = useState<number>(() => {
    const stored = localStorage.getItem('lastChatVisit');
    return stored ? parseInt(stored, 10) : Date.now();
  });

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
      setError("Không thể kết nối với Firebase. Vui lòng kiểm tra cấu hình và biến môi trường của bạn.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to unacknowledged @mention notifications for the current user (for sidebar badge)
  useEffect(() => {
    if (!db || !appUser) return;
    const q = query(
      collection(db, 'mention_notifications'),
      where('mentionedUsername', '==', appUser.username),
      where('acknowledged', '==', false),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMentionCount(snap.size);
    });
    return () => unsub();
  }, [appUser?.username]);

  // When user navigates to chat, mark all messages as read
  useEffect(() => {
    if (activeTab === 'chat') {
      const now = Date.now();
      setLastChatVisit(now);
      localStorage.setItem('lastChatVisit', String(now));
      setNewChatMessageCount(0);
    }
  }, [activeTab]);

  // Subscribe to new chat messages from others since last chat visit (for cross-page banner).
  // Client-side username filtering is used because Firestore does not allow combining
  // inequality operators on two different fields without a composite index.
  useEffect(() => {
    if (!db || !appUser || activeTab === 'chat') return;
    const q = query(
      collection(db, 'chat_messages'),
      where('createdAt', '>', Timestamp.fromMillis(lastChatVisit)),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => d.data().username !== appUser.username).length;
      setNewChatMessageCount(count);
    });
    return () => unsub();
  }, [appUser?.username, activeTab, lastChatVisit]);

  const fetchTasks = () => {};

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
  const totalActualHours = tasks.reduce((acc, t) => acc + t.actual_hours, 0);
  const totalTargetHours = tasks.reduce((acc, t) => acc + t.target_hours, 0);
  const avgProductivity = totalActualHours > 0 ? (totalTargetHours / totalActualHours) * 100 : 0;
  const now = new Date();
  const overdueTaskCount = tasks.filter(
    t => t.deadline && new Date(t.deadline) < now && t.status !== 'Hoàn thành'
  ).length;

  const chartData = tasks.slice(0, 7).map(t => ({
    name: t.drawing_name.length > 10 ? t.drawing_name.slice(0, 10) + '...' : t.drawing_name,
    productivity: t.actual_hours > 0 ? (t.target_hours / t.actual_hours) * 100 : 0,
    fullName: t.drawing_name
  }));

  const role: UserRole = appUser?.role ?? 'engineer';
  const perms = getPermissions(role);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!authenticated && (
        <LoginGate onAuthenticated={() => {
          setAuthenticated(true);
          setAppUser(getCurrentUser());
        }} />
      )}
      {authenticated && (
      <>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        userRole={role}
        onLogout={() => { setAuthenticated(false); setAppUser(null); setMentionCount(0); }}
        mentionCount={mentionCount}
      />

      <div className="lg:pl-64 flex-1 flex flex-col">
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
                {activeTab === 'dashboard' ? 'Tổng quan' :
                 activeTab === 'tasks' ? 'Quản lý dự án' :
                 activeTab === 'engineers' ? 'Danh sách kỹ sư' :
                 activeTab === 'salary' ? 'Tính lương' :
                 activeTab === 'chat' ? 'Chat nội bộ' :
                 activeTab === 'bulletin' ? 'Bảng tin' :
                 activeTab === 'calendar' ? 'Lịch nội bộ' :
                 activeTab === 'orgchart' ? 'Sơ đồ phòng ban' :
                 activeTab === 'settings' ? 'Cài đặt' :
                 'Báo cáo'}
              </h2>
              <p className="text-slate-500 mt-1 text-xs lg:text-base hidden sm:block">
                {activeTab === 'dashboard' 
                  ? 'Theo dõi các chỉ số hiệu quả công việc.' 
                  : activeTab === 'tasks'
                  ? 'Danh sách chi tiết các nhiệm vụ và tiến độ.'
                  : activeTab === 'engineers'
                  ? 'Quản lý thông tin kỹ sư và nhân viên.'
                  : activeTab === 'salary'
                  ? 'Quản lý lương căn bản và lương theo dự án.'
                  : activeTab === 'chat'
                  ? 'Nhắn tin và trao đổi với các thành viên trong nhóm.'
                  : activeTab === 'bulletin'
                  ? 'Cập nhật tin tức và thông báo của công ty.'
                  : activeTab === 'calendar'
                  ? 'Lịch nội bộ và các sự kiện quan trọng của đội.'
                  : activeTab === 'orgchart'
                  ? 'Cấu trúc tổ chức và nhân sự theo phòng ban.'
                  : activeTab === 'settings'
                   ? 'Quản lý người dùng và phân quyền truy cập.'
                   : 'Thống kê và phân tích hiệu suất toàn đội.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {appUser && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {appUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-700 leading-tight">{appUser.displayName}</p>
                  <p className="text-xs text-slate-500 leading-tight">{ROLE_LABELS[role]}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {activeTab === 'engineers' && perms.canViewEngineers ? (
            <EngineerList canManage={perms.canManageEngineers} />
          ) : activeTab === 'salary' && perms.canViewSalary ? (
            <SalaryPage canEditSalary={perms.canEditSalary} />
          ) : activeTab === 'reports' && perms.canViewReports ? (
            <ReportsPage />
          ) : activeTab === 'chat' ? (
            <ChatPage />
          ) : activeTab === 'bulletin' ? (
            <BulletinBoardPage userRole={role} mentionCount={mentionCount} newMessageCount={newChatMessageCount} onNavigateToChat={() => setActiveTab('chat')} />
          ) : activeTab === 'calendar' ? (
            <InternalCalendarPage />
          ) : activeTab === 'orgchart' ? (
            <OrgChartPage tasks={tasks} />
          ) : activeTab === 'settings' && perms.canViewSettings ? (
            <SettingsPage />
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard 
                  title="Tổng số dự án" 
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
              {overdueTaskCount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <p className="text-sm font-medium">
                    Có <span className="font-bold">{overdueTaskCount}</span> dự án đã quá hạn và chưa hoàn thành.
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="ml-2 underline font-semibold hover:text-rose-900 transition-colors"
                    >
                      Xem ngay →
                    </button>
                  </p>
                </div>
              )}

              <div className="bg-white p-4 lg:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <BarChart3 className="text-emerald-500" size={20} />
                  Biểu đồ năng suất (7 dự án gần nhất)
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
              <ChatNotificationBanner
                mentionCount={mentionCount}
                newMessageCount={newChatMessageCount}
                onNavigateToChat={() => setActiveTab('chat')}
                onDismissNewMessages={() => {
                  const now = Date.now();
                  setLastChatVisit(now);
                  localStorage.setItem('lastChatVisit', String(now));
                  setNewChatMessageCount(0);
                }}
              />
              <TaskTable 
                tasks={tasks} 
                onRefresh={fetchTasks} 
                onViewDrawing={(url) => setViewerUrl(url)}
                canEdit={perms.canEditTask}
                canDelete={perms.canDeleteTask}
                canAddTask={perms.canAddTask}
                onAddTask={() => setShowTaskForm(true)}
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
      </>
      )}
    </div>
  );
}
