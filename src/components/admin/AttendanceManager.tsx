import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, CheckCircle2, XCircle, Clock, Calendar, 
  Search, Filter, Download, UserCheck, ClipboardCheck, BarChart3, Sparkles
} from 'lucide-react';
import { Student, Teacher } from '../../types';
import { getStoredStudentAttendance, getStoredTeacherAttendance } from '../../services/storageService';
import { saveStudentAttendanceRecord, saveTeacherAttendanceRecord } from '../../services/dbService';

interface AttendanceManagerProps {
  type: 'student' | 'teacher';
  students: Student[];
  teachers: Teacher[];
}

export default function AttendanceManager({ type, students, teachers }: AttendanceManagerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  const classes = Array.from(new Set(students.map(s => s.className))).sort();

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedClass, type]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      if (type === 'student') {
        const all = getStoredStudentAttendance();
        const filtered = all.filter(r => r.date === selectedDate);
        setAttendanceData(filtered);
      } else {
        const all = getStoredTeacherAttendance();
        const filtered = all.filter(r => r.date === selectedDate);
        setAttendanceData(filtered);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (targetId: string, status: 'Present' | 'Absent' | 'Late') => {
    setMarking(true);
    try {
      if (type === 'student') {
        const student = students.find(s => s.id === targetId);
        const record = {
          id: `att-st-${targetId}-${selectedDate}`,
          className: student?.className || selectedClass || 'General',
          date: selectedDate,
          records: { [targetId]: status },
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        };
        await saveStudentAttendanceRecord(record);
      } else {
        const teacher = teachers.find(t => t.id === targetId);
        const record = {
          id: `att-tc-${targetId}-${selectedDate}`,
          teacherId: targetId,
          teacherName: teacher?.name || 'Staff Member',
          date: selectedDate,
          status,
          updatedAt: new Date().toISOString()
        };
        await saveTeacherAttendanceRecord(record);
      }
      await fetchAttendance();
    } catch (err) {
      console.error('Error marking attendance:', err);
    } finally {
      setMarking(false);
    }
  };

  const filteredList = type === 'student' 
    ? (selectedClass === 'All' ? students : students.filter(s => s.className === selectedClass))
    : teachers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="text-blue-400" />
            {type === 'student' ? 'Student Attendance' : 'Staff Clock-In System'}
          </h2>
          <p className="text-slate-400 text-sm">Manage daily attendance and performance tracking.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#020617] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          
          {type === 'student' && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-[#020617] border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20 cursor-pointer">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((item: any) => {
                const record = attendanceData.find(r => (type === 'student' ? r.studentId : r.staffId) === item.id);
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all ${
                      record 
                        ? (record.status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30')
                        : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold">
                          {type === 'student' ? item.fullName.charAt(0) : item.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-none">
                            {type === 'student' ? item.fullName : item.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                            {type === 'student' ? item.admissionNo : item.staffId}
                          </p>
                        </div>
                      </div>
                      
                      {record && (
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                          record.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {record.status}
                        </div>
                      )}
                    </div>

                    {!record && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => markAttendance(item.id, 'Present')}
                          disabled={marking}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border border-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Present
                        </button>
                        <button 
                          onClick={() => markAttendance(item.id, 'Absent')}
                          disabled={marking}
                          className="flex-1 flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border border-rose-500/20"
                        >
                          <XCircle className="w-3 h-3" />
                          Absent
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Daily Insights
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#020617] rounded-xl border border-slate-800">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-bold">Presence Rate</span>
                  <span className="text-lg font-black text-white">
                    {Math.round((attendanceData.filter(r => r.status === 'Present').length / (filteredList.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${(attendanceData.filter(r => r.status === 'Present').length / (filteredList.length || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#020617] rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Present</span>
                  <span className="text-xl font-black text-emerald-400">{attendanceData.filter(r => r.status === 'Present').length}</span>
                </div>
                <div className="p-4 bg-[#020617] rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Absent</span>
                  <span className="text-xl font-black text-rose-400">{attendanceData.filter(r => r.status === 'Absent').length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 p-6 rounded-2xl border border-blue-900/30">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Professional Tip
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintain consistent attendance tracking to generate accurate academic performance correlations and institutional efficiency reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
