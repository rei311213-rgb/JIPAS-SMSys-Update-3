import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { Users, AlertTriangle, CheckCircle2, BarChart3, School, TrendingUp, ShieldAlert } from 'lucide-react';
import { Student } from '../../types';

interface EnrollmentAnalyticsWidgetProps {
  students: Student[];
}

export default function EnrollmentAnalyticsWidget({ students }: EnrollmentAnalyticsWidgetProps) {
  const [maxCapacityPerClass, setMaxCapacityPerClass] = useState<number>(35);

  // Group students by class
  const classCountsMap: { [key: string]: number } = {};
  students.forEach(st => {
    const cls = st.className || st.currentClass || 'Unassigned';
    classCountsMap[cls] = (classCountsMap[cls] || 0) + 1;
  });

  const chartData = Object.keys(classCountsMap).map(cls => {
    const count = classCountsMap[cls];
    const utilization = Math.round((count / maxCapacityPerClass) * 100);
    const isNearLimit = count >= maxCapacityPerClass * 0.85;
    const isOverCapacity = count > maxCapacityPerClass;

    return {
      className: cls,
      enrolled: count,
      capacity: maxCapacityPerClass,
      utilization,
      status: isOverCapacity ? 'Over Capacity' : isNearLimit ? 'Near Limit' : 'Optimal'
    };
  });

  const totalEnrolled = students.length;
  const classesAtRisk = chartData.filter(d => d.utilization >= 85).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
              Capacity & Enrollment Intelligence
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Class Enrollment Analytics & Capacity Limits</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time breakdown of student distribution across classes compared to maximum permissible capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Class Limit:</span>
            <select
              value={maxCapacityPerClass}
              onChange={(e) => setMaxCapacityPerClass(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-blue-600 dark:text-blue-400 focus:outline-none cursor-pointer"
            >
              <option value={30}>30 Students</option>
              <option value={35}>35 Students</option>
              <option value={40}>40 Students</option>
              <option value={50}>50 Students</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Total Enrolled</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
            <span>{totalEnrolled}</span>
            <span className="text-xs font-semibold text-slate-500">Active Students</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/40">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Active Classes</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
            <span>{chartData.length}</span>
            <span className="text-xs font-semibold text-slate-500">Tracked Sections</span>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border ${
          classesAtRisk > 0 
            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200' 
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Classes Reaching Limit</div>
          <div className="text-2xl font-black mt-1 flex items-center gap-2">
            <span>{classesAtRisk}</span>
            {classesAtRisk > 0 && <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
            <XAxis 
              dataKey="className" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, maxCapacityPerClass + 10]} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-lg border border-slate-800 space-y-1">
                      <div className="font-black text-blue-400">{label}</div>
                      <div>Enrolled: <span className="font-bold">{data.enrolled}</span> students</div>
                      <div>Max Capacity: <span className="font-bold">{data.capacity}</span> students</div>
                      <div>Utilization: <span className="font-bold">{data.utilization}%</span></div>
                      <div className={`font-bold mt-1 uppercase text-[10px] ${
                        data.status === 'Over Capacity' ? 'text-rose-400' : data.status === 'Near Limit' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        Status: {data.status}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="enrolled" fill="#3b82f6" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.utilization >= 100 ? '#f43f5e' : entry.utilization >= 85 ? '#f59e0b' : '#3b82f6'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Status Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span>Optimal (&lt; 85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Near Limit (85% - 99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Over Capacity (≥ 100%)</span>
          </div>
        </div>

        <div className="font-mono text-[11px]">
          Target Limit: {maxCapacityPerClass} students/class
        </div>
      </div>
    </div>
  );
}
