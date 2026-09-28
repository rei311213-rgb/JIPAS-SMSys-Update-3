import { supabase } from '../../lib/supabase';
import { StaffAttendanceRecord } from './staffAttendanceService';

export const StaffAttendanceExportService = {
  /**
   * Generates a secure, printable CSV string from staff attendance records and triggers a browser download.
   */
  async exportToCSV(
    records: StaffAttendanceRecord[],
    campusId: string | null,
    actorId: string,
    campusName: string
  ): Promise<void> {
    if (!records || records.length === 0) {
      throw new Error('No records available to export.');
    }

    const headers = [
      'Staff Name',
      'Staff ID',
      'Role',
      'Campus',
      'Date',
      'Sign In',
      'Sign Out',
      'Total Hours',
      'Status',
      'Source',
      'Review Status'
    ];

    const rows = records.map(rec => {
      let totalHoursStr = '--';
      if (rec.sign_in_at && rec.sign_out_at) {
        const diffMs = new Date(rec.sign_out_at).getTime() - new Date(rec.sign_in_at).getTime();
        const hrs = diffMs / (1000 * 60 * 60);
        totalHoursStr = hrs > 0 ? hrs.toFixed(2) : '0.00';
      }

      const signInStr = rec.sign_in_at ? new Date(rec.sign_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const signOutStr = rec.sign_out_at ? new Date(rec.sign_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

      return [
        `"${(rec.staff_name || '').replace(/"/g, '""')}"`,
        `"${(rec.staff_number || '').replace(/"/g, '""')}"`,
        `"${(rec.department || '').replace(/"/g, '""')}"`,
        `"${(rec.campus_name || '').replace(/"/g, '""')}"`,
        rec.attendance_date,
        signInStr,
        signOutStr,
        totalHoursStr,
        rec.status,
        rec.source,
        rec.review_status || 'REVIEWED'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create a Blob and trigger native browser file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestampStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `JIPAS_Staff_Attendance_${campusName.replace(/\s+/g, '_')}_${timestampStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Write audit log trail for compliance
    await supabase.from('audit_logs').insert({
      campus_id: campusId || null,
      user_id: actorId || null,
      action: 'ATTENDANCE_EXPORTED',
      module: 'Staff Attendance',
      description: `Exported staff attendance roster. Total Records: ${records.length}. Target Campus: ${campusName}`,
      metadata: { recordCount: records.length, targetCampus: campusName }
    });
  }
};
