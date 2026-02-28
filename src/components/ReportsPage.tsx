import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Engineer, Task } from '../types/database.types';

interface EngineerStats {
  name: string;
  taskCount: number;
  completedCount: number;
  totalTargetHours: number;
  totalActualHours: number;
  avgProductivity: number;
}

const STATUS_COLORS: Record<string, string> = {
  'Đang làm': '#3b82f6',
  'Chờ duyệt': '#f59e0b',
  'Hoàn thành': '#10b981',
};

export const ReportsPage: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    let engLoaded = false;
    let taskLoaded = false;
    const checkDone = () => { if (engLoaded && taskLoaded) setLoading(false); };

    const unsubEng = onSnapshot(
      query(collection(db, 'engineers'), orderBy('created_at', 'desc')),
      snap => {
        setEngineers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Engineer));
        engLoaded = true;
        checkDone();
      }
    );

    const unsubTask = onSnapshot(
      query(collection(db, 'tasks'), orderBy('created_at', 'desc')),
      snap => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
        taskLoaded = true;
        checkDone();
      }
    );

    return () => { unsubEng(); unsubTask(); };
  }, []);

  const engineerStats: EngineerStats[] = engineers.map(eng => {
    const engTasks = tasks.filter(t => t.engineer_name === eng.full_name);
    const completedTasks = engTasks.filter(t => t.status === 'Hoàn thành');
    const totalTargetHours = engTasks.reduce((s, t) => s + t.target_hours, 0);
    const totalActualHours = engTasks.reduce((s, t) => s + t.actual_hours, 0);
    const avgProductivity = totalActualHours > 0
      ? (totalTargetHours / totalActualHours) * 100
      : 0;
    return {
      name: eng.full_name,
      taskCount: engTasks.length,
      completedCount: completedTasks.length,
      totalTargetHours,
      totalActualHours,
      avgProductivity,
    };
  }).filter(s => s.taskCount > 0);

  const statusCounts = [
    { name: 'Đang làm', value: tasks.filter(t => t.status === 'Đang làm').length },
    { name: 'Chờ duyệt', value: tasks.filter(t => t.status === 'Chờ duyệt').length },
    { name: 'Hoàn thành', value: tasks.filter(t => t.status === 'Hoàn thành').length },
  ].filter(s => s.value > 0);

  const difficultyData = [1, 2, 3, 4, 5].map(d => ({
    name: `${d} ★`,
    count: tasks.filter(t => t.difficulty === d).length,
  }));

  const topEngineers = [...engineerStats]
    .sort((a, b) => b.avgProductivity - a.avgProductivity)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        Đang tải dữ liệu báo cáo...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engineer Productivity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
            <TrendingUp className="text-emerald-500" size={18} />
            Năng suất theo kỹ sư (%)
          </h3>
          {engineerStats.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engineerStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" unit="%" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Năng suất']}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="avgProductivity" radius={[0, 4, 4, 0]} barSize={20}>
                    {engineerStats.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          entry.avgProductivity > 100
                            ? '#10b981'
                            : entry.avgProductivity < 80
                            ? '#f43f5e'
                            : '#3b82f6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
            <BarChart3 className="text-blue-500" size={18} />
            Phân bổ trạng thái công việc
          </h3>
          {statusCounts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {statusCounts.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value: number) => [value, 'Dự án']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Hours per Engineer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
            <Clock className="text-amber-500" size={18} />
            Giờ làm theo kỹ sư
          </h3>
          {engineerStats.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Chưa có dữ liệu</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engineerStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    dy={6}
                  />
                  <YAxis unit="h" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}h`,
                      name === 'totalActualHours' ? 'Giờ thực tế' : 'Giờ mục tiêu',
                    ]}
                  />
                  <Bar dataKey="totalTargetHours" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={16} name="totalTargetHours" />
                  <Bar dataKey="totalActualHours" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} name="totalActualHours" />
                  <Legend formatter={(v) => v === 'totalTargetHours' ? 'Mục tiêu' : 'Thực tế'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
            <BarChart3 className="text-purple-500" size={18} />
            Phân bổ độ khó công việc
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [value, 'Dự án']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                  {difficultyData.map((_, idx) => (
                    <Cell
                      key={`d-${idx}`}
                      fill={['#6ee7b7', '#34d399', '#10b981', '#059669', '#047857'][idx]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {topEngineers.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-5">
            <Award className="text-amber-500" size={18} />
            Bảng xếp hạng năng suất kỹ sư
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tên kỹ sư</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dự án</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hoàn thành</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Giờ TT</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Năng suất TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topEngineers.map((eng, idx) => (
                  <tr key={eng.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{eng.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{eng.taskCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{eng.completedCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{eng.totalActualHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        eng.avgProductivity > 100 ? 'text-emerald-600' :
                        eng.avgProductivity < 80 ? 'text-rose-600' :
                        'text-blue-600'
                      }`}>
                        {eng.avgProductivity > 0 ? `${eng.avgProductivity.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
