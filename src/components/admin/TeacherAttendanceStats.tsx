import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Award, TrendingUp, Calendar, Download, 
  CheckCircle2, Clock, AlertTriangle, UserX, Search, ShieldCheck 
} from 'lucide-react';
import { Teacher, TeacherAttendanceRecord } from '../../types';

interface TeacherAttendanceStatsProps {
  teachers: Teacher[];
  attendanceRecords: TeacherAttendanceRecord[];
  onNavigate?: (module: string) => void;
}

export default function TeacherAttendanceStats({
  teachers,
  attendanceRecords,
  onNavigate
}: TeacherAttendanceStatsProps) {
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [searchQuery, setSearchQuery] = useState('');

  // Verified database attendance records
  const records = useMemo(() => {
    return attendanceRecords || [];
  }, [attendanceRecords]);

  // Aggregate stats per teacher based strictly on actual attendance
  const teacherStats = useMemo(() => {
    return teachers.map(teacher => {
      const tRecords = records.filter(r => r.teacherId === teacher.id);
      const totalDays = tRecords.length;
      const presentDays = tRecords.filter(r => r.status === 'Present').length;
      const lateDays = tRecords.filter(r => r.status === 'Late').length;
      const absentDays = tRecords.filter(r => r.status === 'Absent').length;
      const excusedDays = tRecords.filter(r => r.status === 'Excused').length;

      const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;
      const punctualityRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      let grade = 'No Data';
      if (totalDays > 0) {
        if (attendanceRate >= 95) grade = 'Excellent';
        else if (attendanceRate >= 85) grade = 'Good';
        else if (attendanceRate >= 75) grade = 'Fair';
        else grade = 'Critical';
      }

      return {
        teacher,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        excusedDays,
        attendanceRate,
        punctualityRate,
        grade
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate || b.punctualityRate - a.punctualityRate);
  }, [teachers, records]);

  const overallStats = useMemo(() => {
    const totalRecords = records.length;
    if (totalRecords === 0) return { avgAttendance: 100, avgPunctuality: 95, totalAbsent: 0, totalLate: 0 };
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;

    const avgAttendance = Math.round(((present + late) / totalRecords) * 100);
    const avgPunctuality = Math.round((present / totalRecords) * 100);
    return { avgAttendance, avgPunctuality, totalAbsent: absent, totalLate: late };
  }, [records]);

  const filteredStats = useMemo(() => {
    if (!searchQuery.trim()) return teacherStats;
    const q = searchQuery.toLowerCase();
    return teacherStats.filter(s => 
      s.teacher.name.toLowerCase().includes(q) || 
      (s.teacher.designation || '').toLowerCase().includes(q) ||
      (s.teacher.staffId || '').toLowerCase().includes(q)
    );
  }, [teacherStats, searchQuery]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Teacher Attendance Statistics & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional performance trends, punctuality rankings, attendance compliance, and staff honor roll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="September 2026">September 2026 (Current Term)</option>
            <option value="August 2026">August 2026</option>
            <option value="July 2026">July 2026</option>
            <option value="Term 1 2026">Full Academic Term 1</option>
          </select>

          {onNavigate && (
            <button
              onClick={() => onNavigate?.('teacher_attendance_report')}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              View Full Audit Ledger →
            </button>
          )}
        </div>
      </div>

      {/* Global Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Institution Attendance</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-950 mt-2">{overallStats.avgAttendance}%</div>
          <div className="text-xs text-indigo-700 font-medium mt-1">Across all faculty & instructors</div>
          <div className="w-full bg-indigo-200 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${overallStats.avgAttendance}%` }} />
          </div>
        </div>

        <div className="bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Punctuality Score</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-2">{overallStats.avgPunctuality}%</div>
          <div className="text-xs text-emerald-700 font-medium mt-1">Arrived before 07:45 AM</div>
          <div className="w-full bg-emerald-200 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${overallStats.avgPunctuality}%` }} />
          </div>
        </div>

        <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Late Check-ins</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-950 mt-2">{overallStats.totalLate}</div>
          <div className="text-xs text-amber-700 font-medium mt-1">Incidents recorded this period</div>
          <div className="text-[10px] text-amber-800 font-bold mt-3">Target: &lt; 5 per month</div>
        </div>

        <div className="bg-linear-to-br from-purple-50 to-fuchsia-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Honor Roll Staff</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-950 mt-2">
            {teacherStats.filter(s => s.attendanceRate >= 95).length}
          </div>
          <div className="text-xs text-purple-700 font-medium mt-1">Teachers with &gt;= 95% attendance</div>
          <div className="text-[10px] text-purple-800 font-bold mt-3">Eligible for monthly bonus</div>
        </div>
      </div>

      {/* Search & Staff Performance Ledger */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Staff Attendance Breakdown & Compliance
          </h3>
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teacher by name or ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Teacher Name</th>
                <th className="p-3">Designation / Role</th>
                <th className="p-3 text-center">Days Present</th>
                <th className="p-3 text-center">Late</th>
                <th className="p-3 text-center">Absent</th>
                <th className="p-3 text-center">Excused</th>
                <th className="p-3">Attendance Rate</th>
                <th className="p-3">Compliance Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStats.length === 0 || records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No staff attendance records logged for this period</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Staff clock-in entries via QR scanner or gate kiosk will automatically appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredStats.map((item, idx) => (
                <tr key={item.teacher.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-500">
                    {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.teacher.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.teacher.staffId || 'STAFF-' + (idx + 101)}</div>
                  </td>
                  <td className="p-3 text-slate-600">{item.teacher.designation || 'Class Teacher'}</td>
                  <td className="p-3 text-center font-bold text-emerald-700">
                    {item.presentDays} / {item.totalDays}
                  </td>
                  <td className="p-3 text-center font-bold text-amber-700">{item.lateDays}</td>
                  <td className="p-3 text-center font-bold text-rose-700">{item.absentDays}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{item.excusedDays}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 w-9">{item.attendanceRate}%</span>
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.attendanceRate >= 95 ? 'bg-emerald-500' :
                            item.attendanceRate >= 85 ? 'bg-indigo-500' :
                            item.attendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.attendanceRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.grade === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                      item.grade === 'Good' ? 'bg-indigo-100 text-indigo-800' :
                      item.grade === 'Fair' ? 'bg-amber-100 text-amber-800' :
                      item.grade === 'Critical' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.grade}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
