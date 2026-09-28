import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, FileText, CheckCircle, RefreshCw, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StaffAttendanceRecord, StaffAttendanceService } from '../../services/supabase/staffAttendanceService';
import { StaffAttendanceReportService, WorkingHoursConfig } from '../../services/supabase/staffAttendanceReportService';
import { StaffAttendanceExportService } from '../../services/supabase/staffAttendanceExportService';

interface StaffAttendanceReportProps {
  onNavigate?: (module: string) => void;
}

export default function StaffAttendanceReport({ onNavigate }: StaffAttendanceReportProps) {
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  // Month/Year selections
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [rawRecords, setRawRecords] = useState<StaffAttendanceRecord[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCampusId) {
      fetchStaffProfiles();
    }
  }, [selectedCampusId]);

  const fetchInitialData = async () => {
    try {
      const { data, error } = await supabase.from('campuses').select('id, name');
      if (!error && data) {
        setCampuses(data);
        if (data.length > 0) {
          const localActive = localStorage.getItem('jipas_active_campus');
          const found = data.find(c => c.id === localActive || c.name === localActive);
          setSelectedCampusId(found ? found.id : data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching initial campuses:', err);
    }
  };

  const fetchStaffProfiles = async () => {
    try {
      const list = await StaffAttendanceReportService.listStaffProfiles(selectedCampusId);
      setStaffList(list);
      if (list.length > 0) {
        setSelectedStaffId(list[0].id);
      } else {
        setSelectedStaffId('');
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  const generateReport = async () => {
    if (!selectedStaffId) return;
    setIsLoading(true);
    try {
      // 1. Fetch config working hours
      const config = await StaffAttendanceReportService.getWorkingHours(selectedCampusId);

      // 2. Fetch attendance records for this staff member in selected month
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

      // Query database records
      const { data: records, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaffId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (error) {
        throw new Error('Database select error: ' + error.message);
      }

      const formattedRecords: StaffAttendanceRecord[] = (records || []).map((row: any) => ({
        id: row.id,
        staff_id: row.staff_id,
        campus_id: row.campus_id,
        attendance_date: row.attendance_date,
        sign_in_at: row.sign_in_at,
        sign_out_at: row.sign_out_at,
        status: row.status,
        source: row.source,
        review_status: row.review_status,
        qr_code_id: row.qr_code_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      // 3. Count working days, holidays, absences, etc. using actual school calendar checks
      let totalWorkingDays = 0;
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let earlyDepartureDays = 0;
      let excusedDays = 0;
      let totalHours = 0;

      // Scan through all calendar dates of the selected month
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Skip future dates
        const todayStr = new Date().toISOString().split('T')[0];
        if (currentDateStr > todayStr) {
          continue;
        }

        // Check if working day / weekend / holiday
        let isWorkingDay = new Date(currentDateStr).getDay() !== 0 && new Date(currentDateStr).getDay() !== 6;
        try {
          const { data: rpcRes } = await supabase.rpc('check_school_working_day', {
            check_date: currentDateStr,
            camp_id: selectedCampusId
          });
          if (rpcRes && typeof rpcRes.isWorkingDay === 'boolean') {
            isWorkingDay = rpcRes.isWorkingDay;
          }
        } catch {
          // Fallback if rpc function is not present or error occurs
        }

        if (isWorkingDay) {
          totalWorkingDays++;
        }

        const record = formattedRecords.find(r => r.attendance_date === currentDateStr);
        if (record) {
          if (record.status === 'Present') {
            presentDays++;
          } else if (record.status === 'Late') {
            presentDays++;
            lateDays++;
          } else if (record.status === 'Absent') {
            absentDays++;
          } else if (record.status === 'Excused') {
            excusedDays++;
          }

          if (record.sign_in_at && record.sign_out_at) {
            const diffMs = new Date(record.sign_out_at).getTime() - new Date(record.sign_in_at).getTime();
            const hrs = diffMs / (1000 * 60 * 60);
            if (hrs > 0) {
              totalHours += hrs;
            }

            // Check early departure
            const signOutTime = new Date(record.sign_out_at);
            const [expOutHour, expOutMin] = config.expectedSignOut.split(':').map(Number);
            const expectedOutDate = new Date(record.sign_out_at);
            expectedOutDate.setHours(expOutHour, expOutMin, 0, 0);

            const earlyDepartureGapMins = (expectedOutDate.getTime() - signOutTime.getTime()) / (1000 * 60);
            if (earlyDepartureGapMins > config.earlyDepartureThresholdMins) {
              earlyDepartureDays++;
            }
          }
        } else if (isWorkingDay) {
          // No record but it was a working day -> counts as absent
          absentDays++;
        }
      }

      const avgHours = presentDays > 0 ? (totalHours / presentDays) : 0;
      const attendancePercentage = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

      const profileObj = staffList.find(p => p.id === selectedStaffId);

      setRawRecords(formattedRecords);
      setReportData({
        staffName: profileObj ? profileObj.full_name : 'Staff Member',
        staffNumber: profileObj ? profileObj.staff_id : 'ST-000',
        role: profileObj ? profileObj.role : 'Staff',
        workingDays: totalWorkingDays,
        presentDays,
        absentDays,
        lateDays,
        earlyDepartureDays,
        excusedDays,
        totalHours: totalHours.toFixed(1),
        avgHours: avgHours.toFixed(1),
        attendancePercentage
      });

      // Log report generation in audit logs
      const campusObj = campuses.find(c => c.id === selectedCampusId);
      await supabase.from('audit_logs').insert({
        campus_id: selectedCampusId,
        user_id: profileObj?.id || null,
        action: 'ATTENDANCE_REPORT_GENERATED',
        module: 'Staff Attendance',
        description: `Generated monthly attendance report for ${profileObj?.full_name || 'Staff'}. Month: ${selectedMonth}/${selectedYear}`,
        metadata: { selectedMonth, selectedYear, staffId: selectedStaffId }
      });

    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvExport = async () => {
    if (!reportData || rawRecords.length === 0) return;
    try {
      const activeUserStr = localStorage.getItem('jipas_current_user');
      const actorId = activeUserStr ? JSON.parse(activeUserStr).id : '';
      const campusObj = campuses.find(c => c.id === selectedCampusId);
      
      const hydratedRecords: StaffAttendanceRecord[] = rawRecords.map(r => ({
        ...r,
        staff_name: reportData.staffName,
        staff_number: reportData.staffNumber,
        department: reportData.role,
        campus_name: campusObj ? campusObj.name : 'Main Campus'
      }));

      await StaffAttendanceExportService.exportToCSV(
        hydratedRecords,
        selectedCampusId,
        actorId,
        campusObj ? campusObj.name : 'Main Campus'
      );
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Monthly Staff Attendance Summary Reports</span>
          </h2>
          <p className="text-xs text-slate-500">Authorized administrative query matching actual calendar check-in records.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Campus:</label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Staff Member:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {staffList.length > 0 ? (
                staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                ))
              ) : (
                <option value="">No Active Staff Profiles</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={isLoading || !selectedStaffId}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Generate Summary</span>
          </button>
        </div>
      </div>

      {/* Report Dashboard Cards */}
      {reportData && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider"> Roster Summary</span>
                <h3 className="text-base font-black tracking-tight">{reportData.staffName}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{reportData.role} — {reportData.staffNumber}</p>
              </div>

              <button
                onClick={handleCsvExport}
                className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-extrabold transition-all border border-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-400 font-black block uppercase mb-1">Attendance Rate</span>
                <span className="text-2xl font-black text-emerald-400">{reportData.attendancePercentage}%</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-400 font-black block uppercase mb-1">Expected Days</span>
                <span className="text-2xl font-black text-slate-100">{reportData.workingDays} Days</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-400 font-black block uppercase mb-1">Excused Absences</span>
                <span className="text-2xl font-black text-indigo-400">{reportData.excusedDays} Days</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-400 font-black block uppercase mb-1">Total Logged Hours</span>
                <span className="text-2xl font-black text-blue-400">{reportData.totalHours} Hrs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Attendance Roster breakdown</span>
              </h4>

              <div className="space-y-2 text-xs font-bold text-slate-600">
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span>Present Days:</span>
                  <span className="text-emerald-600">{reportData.presentDays}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span>Absent Days:</span>
                  <span className="text-rose-600">{reportData.absentDays}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span>Late Arrivals:</span>
                  <span className="text-amber-600">{reportData.lateDays}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span>Early Departure Days:</span>
                  <span className="text-rose-500">{reportData.earlyDepartureDays}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 md:col-span-2">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Average Daily Roster Hours</span>
              </h4>
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Clock className="w-8 h-8 text-indigo-600 animate-pulse" />
                <span className="text-2xl font-black text-slate-800">{reportData.avgHours} Hours</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center">Average duration of presence on expected workdays in this month.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
