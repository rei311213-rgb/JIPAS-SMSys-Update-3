import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, Calendar, UserCheck, ShieldCheck, DollarSign, FileText, Download, RefreshCw, Award, QrCode 
} from 'lucide-react';
import { Teacher } from '../../types';
import { formatCurrency } from '../../utils/financeUtils';
import StaffAttendanceQRScanner from '../staff/StaffAttendanceQRScanner';

interface StaffAttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  department: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  notes?: string;
}

interface StaffAttendanceTrackerProps {
  teachers: Teacher[];
  currentUser?: any;
  userRole?: string;
}

export default function StaffAttendanceTracker({ teachers, currentUser, userRole }: StaffAttendanceTrackerProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>(() => {
    const saved = localStorage.getItem('jipas_staff_attendance');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'scan_qr' | 'my_attendance' | 'all_records' | 'payroll_summary'>('scan_qr');
  const [notesInput, setNotesInput] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('jipas_staff_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  const currentTeacher = teachers.find(t => t.email === currentUser?.email || t.name === currentUser?.name) || teachers[0];
  useEffect(() => {
    const handleExitToDashboard = () => {
      setActiveTab('all_records');
    };
    window.addEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
    return () => window.removeEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
  }, []);

  const myTodayRecord = attendanceRecords.find(r => r.teacherId === currentTeacher?.id && r.date === selectedDate);

  const handleClockIn = (status: 'Present' | 'Late' | 'Excused') => {
    if (!currentTeacher) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newRecord: StaffAttendanceRecord = {
      id: `att_${Date.now()}`,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.name,
      department: currentTeacher.department || 'General Education',
      date: selectedDate,
      clockInTime: nowTime,
      status,
      notes: notesInput.trim() || 'Biometric terminal check-in'
    };

    setAttendanceRecords(prev => [
      newRecord,
      ...prev.filter(r => !(r.teacherId === currentTeacher.id && r.date === selectedDate))
    ]);

    setSuccessMsg(`Successfully clocked in as ${status} at ${nowTime}!`);
    setNotesInput('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleClockOut = () => {
    if (!myTodayRecord) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setAttendanceRecords(prev => prev.map(r => {
      if (r.id === myTodayRecord.id) {
        return { ...r, clockOutTime: nowTime };
      }
      return r;
    }));

    setSuccessMsg(`Successfully clocked out at ${nowTime}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Payroll summary calculations for Accountant
  const staffPayrollSummary = teachers.map(t => {
    const records = attendanceRecords.filter(r => r.teacherId === t.id);
    const presentCount = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const baseMonthlySalary = 3500; // CFA
    const deduction = absentCount * 120; // CFA 120 deduction per absent day
    const netSalary = Math.max(0, baseMonthlySalary - deduction);

    return {
      teacher: t,
      presentCount,
      absentCount,
      baseMonthlySalary,
      deduction,
      netSalary
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
              Staff Attendance & Payroll Integration
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Staff Daily Attendance & Payroll Summary Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily clock-in verification for teachers and automated attendance aggregation for accountant payroll processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scan_qr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan_qr' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> Scan Entrance QR
          </button>
          {(userRole === 'teacher' || !userRole) && (
            <button
              onClick={() => setActiveTab('my_attendance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my_attendance' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              My Attendance
            </button>
          )}
          {(userRole === 'admin' || userRole === 'accountant' || userRole === 'headmaster') && (
            <>
              <button
                onClick={() => setActiveTab('all_records')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all_records' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Logs ({attendanceRecords.length})
              </button>
              <button
                onClick={() => setActiveTab('payroll_summary')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'payroll_summary' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Payroll Summary
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* LIVE ENTRANCE QR SCANNER TAB */}
      {activeTab === 'scan_qr' && (
        <div className="space-y-4">
          <StaffAttendanceQRScanner 
            currentUser={currentUser} 
            onSuccess={() => setActiveTab('all_records')}
            onClose={() => setActiveTab('all_records')}
          />
        </div>
      )}

      {/* MY ATTENDANCE TAB */}
      {activeTab === 'my_attendance' && currentTeacher && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
                  Staff Member Portal • {currentTeacher.department || 'General'}
                </span>
                <h3 className="text-2xl font-black">{currentTeacher.name}</h3>
                <p className="text-xs text-blue-200/80">
                  Staff ID: {currentTeacher.staffId || currentTeacher.id} • Email: {currentTeacher.email}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center sm:text-right">
                <div className="text-xs text-blue-200 font-semibold">Today's Date & Status</div>
                <div className="text-lg font-black mt-0.5">{selectedDate}</div>
                <div className={`text-xs font-bold mt-1 inline-block px-2.5 py-0.5 rounded-full ${
                  myTodayRecord ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}>
                  {myTodayRecord ? `Clocked In (${myTodayRecord.status})` : 'Not Clocked In Yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Daily Attendance Clock-In Terminal</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Clock-In Notes / Reason for Lateness (Optional)</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Arrived on time via school staff bus"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleClockIn('Present')}
                  className="flex-1 min-w-[140px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Clock In (Present)
                </button>
                <button
                  onClick={() => handleClockIn('Late')}
                  className="flex-1 min-w-[140px] py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Clock In (Late)
                </button>
                {myTodayRecord && !myTodayRecord.clockOutTime && (
                  <button
                    onClick={handleClockOut}
                    className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Clock Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL ATTENDANCE RECORDS TAB */}
      {activeTab === 'all_records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">All Staff Attendance Logs</h3>
            <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
              Total Records: {attendanceRecords.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-extrabold text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Clock In</th>
                  <th className="p-3.5">Clock Out</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No staff attendance records logged</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Staff clock-in entries via QR scanner will appear here in real time.</p>
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{rec.teacherName}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{rec.department}</td>
                      <td className="p-3.5 font-mono text-slate-500">{rec.date}</td>
                      <td className="p-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{rec.clockInTime}</td>
                      <td className="p-3.5 font-mono text-slate-500">{rec.clockOutTime || 'Active'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          rec.status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' :
                          rec.status === 'Late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">{rec.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYROLL SUMMARY TAB */}
      {activeTab === 'payroll_summary' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Accountant Payroll & Attendance Summary</h3>
              <p className="text-xs text-slate-500">Automatically calculated monthly salaries based on verified staff attendance logs.</p>
            </div>
            <button
              onClick={() => alert('Payroll summary report exported for Accountant portal.')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Payroll Report
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-extrabold text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Days Present</th>
                  <th className="p-3.5">Days Absent</th>
                  <th className="p-3.5">Base Salary</th>
                  <th className="p-3.5">Deductions</th>
                  <th className="p-3.5">Net Payroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffPayrollSummary.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.teacher.name}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.teacher.department || 'General'}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-600">{item.presentCount}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-500">{item.absentCount}</td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{formatCurrency(item.baseMonthlySalary)}</td>
                    <td className="p-3.5 font-mono text-rose-600">-{formatCurrency(item.deduction)}</td>
                    <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
