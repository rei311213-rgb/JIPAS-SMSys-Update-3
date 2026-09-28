import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  Users, 
  Building2, 
  Phone, 
  Mail, 
  BookOpen, 
  X, 
  FileText, 
  UserCheck, 
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { PastEmployeeRecord } from '../../types';
import { 
  getStoredPastEmployees, 
  savePastEmployee, 
  deletePastEmployee, 
  subscribePastEmployees 
} from '../../services/dbService';

interface PastEmployeeHistoryManagerProps {
  userRole: 'admin' | 'secretary' | 'ceo' | 'director' | string;
  readOnly?: boolean;
  selectedCampus?: string;
}

export default function PastEmployeeHistoryManager({
  userRole,
  readOnly = false,
  selectedCampus = 'General'
}: PastEmployeeHistoryManagerProps) {
  const isEditable = !readOnly && (userRole === 'admin' || userRole === 'secretary');

  const [employees, setEmployees] = useState<PastEmployeeRecord[]>(() => getStoredPastEmployees());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedExitReason, setSelectedExitReason] = useState<string>('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PastEmployeeRecord | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<PastEmployeeRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formFullName, setFormFullName] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartment, setFormDepartment] = useState('Senior High School');
  const [formRole, setFormRole] = useState('Senior Subject Teacher');
  const [formStartDate, setFormStartDate] = useState('2019-09-01');
  const [formEndDate, setFormEndDate] = useState('2024-08-31');
  const [formClassesInput, setFormClassesInput] = useState('SHS 1, SHS 2, SHS 3');
  const [formSubjectsInput, setFormSubjectsInput] = useState('Core Mathematics, Elective Mathematics');
  const [formExitReason, setFormExitReason] = useState<'Resigned' | 'Retired' | 'Contract Completed' | 'Relocated' | 'Further Studies' | 'Other'>('Resigned');
  const [formServiceRating, setFormServiceRating] = useState<'Outstanding' | 'Very Good' | 'Good' | 'Satisfactory'>('Very Good');
  const [formRemarks, setFormRemarks] = useState('');
  const [formForwardingContact, setFormForwardingContact] = useState('');
  const [formCertificateIssued, setFormCertificateIssued] = useState(true);
  const [formCampus, setFormCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');

  // Live subscription
  useEffect(() => {
    const unsub = subscribePastEmployees((items) => {
      if (items && items.length >= 0) {
        setEmployees(items);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Compute duration of service automatically from dates
  const computedDuration = useMemo(() => {
    if (!formStartDate || !formEndDate) return 'N/A';
    try {
      const start = new Date(formStartDate);
      const end = new Date(formEndDate);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return `${formStartDate.slice(0, 4)} - ${formEndDate.slice(0, 4)}`;
      
      const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      const diffMonths = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.43));
      
      const yearSpan = `${start.getFullYear()} - ${end.getFullYear()}`;
      if (diffYears > 0 && diffMonths > 0) {
        return `${yearSpan} (${diffYears} yr${diffYears > 1 ? 's' : ''}, ${diffMonths} mo${diffMonths > 1 ? 's' : ''})`;
      } else if (diffYears > 0) {
        return `${yearSpan} (${diffYears} Year${diffYears > 1 ? 's' : ''})`;
      } else {
        return `${yearSpan} (${Math.max(1, diffMonths)} Month${diffMonths > 1 ? 's' : ''})`;
      }
    } catch {
      return `${formStartDate.slice(0, 4)} - ${formEndDate.slice(0, 4)}`;
    }
  }, [formStartDate, formEndDate]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (selectedCampus && selectedCampus !== 'General' && e.campus && e.campus !== selectedCampus) {
        return false;
      }
      if (selectedDept !== 'All' && e.department !== selectedDept) {
        return false;
      }
      if (selectedExitReason !== 'All' && e.exitReason !== selectedExitReason) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.fullName.toLowerCase().includes(q);
        const matchId = (e.staffId || '').toLowerCase().includes(q);
        const matchRole = e.role.toLowerCase().includes(q);
        const matchSubj = (e.subjectsHandled || []).some(s => s.toLowerCase().includes(q));
        const matchClasses = (e.classesHandled || []).some(c => c.toLowerCase().includes(q));
        return matchName || matchId || matchRole || matchSubj || matchClasses;
      }
      return true;
    });
  }, [employees, selectedCampus, selectedDept, selectedExitReason, searchQuery]);

  const resetForm = () => {
    setEditingEmployee(null);
    setFormFullName('');
    setFormStaffId(`JIPAS/STAFF/2020/${String(Math.floor(10 + Math.random() * 90))}`);
    setFormGender('Male');
    setFormPhone('');
    setFormEmail('');
    setFormDepartment('Senior High School');
    setFormRole('Subject Teacher');
    setFormStartDate('2020-01-15');
    setFormEndDate('2024-07-31');
    setFormClassesInput('SHS 1, SHS 2, SHS 3');
    setFormSubjectsInput('Core Mathematics, Elective Mathematics');
    setFormExitReason('Resigned');
    setFormServiceRating('Very Good');
    setFormRemarks('');
    setFormForwardingContact('');
    setFormCertificateIssued(true);
    setFormCampus('JIPAS 1');
    setErrorMessage('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: PastEmployeeRecord) => {
    setEditingEmployee(emp);
    setFormFullName(emp.fullName);
    setFormStaffId(emp.staffId || '');
    setFormGender(emp.gender || 'Male');
    setFormPhone(emp.phone || '');
    setFormEmail(emp.email || '');
    setFormDepartment(emp.department);
    setFormRole(emp.role);
    setFormStartDate(emp.startDate || '2019-01-01');
    setFormEndDate(emp.endDate || '2024-01-01');
    setFormClassesInput((emp.classesHandled || []).join(', '));
    setFormSubjectsInput((emp.subjectsHandled || []).join(', '));
    setFormExitReason(emp.exitReason || 'Resigned');
    setFormServiceRating(emp.serviceRating || 'Very Good');
    setFormRemarks(emp.remarks || '');
    setFormForwardingContact(emp.forwardingContact || '');
    setFormCertificateIssued(emp.certificateIssued ?? true);
    setFormCampus((emp.campus as any) || 'JIPAS 1');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formDepartment.trim()) {
      setErrorMessage('Department is required.');
      return;
    }
    if (!formRole.trim()) {
      setErrorMessage('Role / Designation is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const empId = editingEmployee ? editingEmployee.id : `emp-past-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const parsedClasses = formClassesInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const parsedSubjects = formSubjectsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const newRecord: PastEmployeeRecord = {
        id: empId,
        fullName: formFullName.trim().toUpperCase(),
        staffId: formStaffId.trim() || undefined,
        gender: formGender,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        department: formDepartment,
        role: formRole.trim(),
        durationOfService: computedDuration,
        startDate: formStartDate,
        endDate: formEndDate,
        classesHandled: parsedClasses,
        subjectsHandled: parsedSubjects,
        exitReason: formExitReason,
        serviceRating: formServiceRating,
        remarks: formRemarks.trim() || undefined,
        forwardingContact: formForwardingContact.trim() || undefined,
        certificateIssued: formCertificateIssued,
        campus: formCampus,
        updatedAt: new Date().toISOString(),
        createdAt: editingEmployee?.createdAt || new Date().toISOString()
      };

      await savePastEmployee(newRecord);

      setEmployees(prev => {
        const idx = prev.findIndex(item => item.id === empId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newRecord;
          return next;
        }
        return [newRecord, ...prev];
      });

      setSuccessMessage(editingEmployee ? 'Past employee details updated successfully!' : 'Past employee historical record saved successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving past employee:', err);
      setErrorMessage(err?.message || 'Failed to save past employee record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (emp: PastEmployeeRecord) => {
    if (!isEditable) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete the history record for ${emp.fullName}?`);
    if (!confirmDelete) return;

    try {
      await deletePastEmployee(emp.id);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      setSuccessMessage(`Employee history for ${emp.fullName} has been removed.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error deleting past employee record:', err);
      alert('Failed to delete past employee record.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee records to export.');
      return;
    }

    const headers = [
      'Full Name',
      'Staff ID',
      'Gender',
      'Department',
      'Role / Designation',
      'Duration of Service',
      'Start Date',
      'End Date',
      'Classes Handled',
      'Subjects Handled',
      'Exit Reason',
      'Service Rating',
      'Phone',
      'Email',
      'Certificate Issued',
      'Campus',
      'Remarks'
    ];

    const rows = filteredEmployees.map(e => [
      `"${e.fullName}"`,
      `"${e.staffId || ''}"`,
      `"${e.gender || ''}"`,
      `"${e.department}"`,
      `"${e.role}"`,
      `"${e.durationOfService}"`,
      `"${e.startDate || ''}"`,
      `"${e.endDate || ''}"`,
      `"${(e.classesHandled || []).join('; ')}"`,
      `"${(e.subjectsHandled || []).join('; ')}"`,
      `"${e.exitReason || ''}"`,
      `"${e.serviceRating || ''}"`,
      `"${e.phone || ''}"`,
      `"${e.email || ''}"`,
      `"${e.certificateIssued ? 'Yes' : 'No'}"`,
      `"${e.campus || ''}"`,
      `"${(e.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JIPAS_Past_Employee_History_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-semibold">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Human Resources & Institutional Archives</span>
              {readOnly && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[10px] font-bold">
                  Read-Only Executive Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Employee History (Past Staff)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Archival register of previous educators, administrators, and staff members: tracking duration of service, departments, roles, classes and subjects handled, and service certifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>Print Archive</span>
            </button>

            {isEditable && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Past Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-slate-300 block">Archived Staff</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white">{filteredEmployees.length}</span>
              <span className="text-[11px] text-slate-400">Personnel</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-indigo-300 block">SHS Faculty</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-400">
                {filteredEmployees.filter(e => e.department.includes('Senior High')).length}
              </span>
              <span className="text-[11px] text-indigo-200">Educators</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-emerald-300 block">Certificates Issued</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">
                {filteredEmployees.filter(e => e.certificateIssued).length}
              </span>
              <span className="text-[11px] text-emerald-200">Certified</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-blue-300 block">JHS & Primary</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-blue-400">
                {filteredEmployees.filter(e => e.department.includes('Junior High') || e.department.includes('Primary')).length}
              </span>
              <span className="text-[11px] text-blue-200">Teachers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past employee name, role, subject..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Departments</option>
              <option value="Senior High School">Senior High School (SHS)</option>
              <option value="Junior High School">Junior High School (JHS)</option>
              <option value="Primary School">Primary School</option>
              <option value="Pre-School">Pre-School</option>
              <option value="Accounts & Finance">Accounts & Finance</option>
              <option value="Administration">Administration</option>
            </select>
          </div>

          {/* Exit Reason Filter */}
          <div>
            <select
              value={selectedExitReason}
              onChange={(e) => setSelectedExitReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Exit Reasons</option>
              <option value="Resigned">Resigned</option>
              <option value="Retired">Retired</option>
              <option value="Contract Completed">Contract Completed</option>
              <option value="Relocated">Relocated</option>
              <option value="Further Studies">Further Studies</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filteredEmployees.length}</strong> past employee records</span>
          {(searchQuery || selectedDept !== 'All' || selectedExitReason !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedExitReason('All');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Past Employee Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedDept !== 'All' || selectedExitReason !== 'All'
                ? 'No employee history records match your search criteria.'
                : 'No past employee records have been entered yet.'}
            </p>
            {isEditable && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
              >
                Add Past Employee
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Employee Details</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Duration of Service</th>
                  <th className="py-3 px-4">Classes & Subjects Handled</th>
                  <th className="py-3 px-4">Exit Status & Conduct</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 uppercase text-xs">
                          {emp.fullName.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{emp.fullName}</span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {emp.staffId && <span className="font-mono">{emp.staffId}</span>}
                            {emp.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{emp.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{emp.role}</span>
                      <span className="inline-block mt-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {emp.department}
                      </span>
                    </td>

                    {/* Duration of Service */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{emp.durationOfService}</span>
                      </div>
                      {emp.startDate && emp.endDate && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {emp.startDate} to {emp.endDate}
                        </div>
                      )}
                    </td>

                    {/* Classes & Subjects */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {emp.subjectsHandled && emp.subjectsHandled.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {emp.subjectsHandled.map((subj, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              {subj}
                            </span>
                          ))}
                        </div>
                      )}
                      {emp.classesHandled && emp.classesHandled.length > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Classes: {emp.classesHandled.join(', ')}
                        </div>
                      )}
                    </td>

                    {/* Exit Status & Conduct */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-semibold text-[10px]">
                          {emp.exitReason || 'Completed'}
                        </span>
                        {emp.serviceRating && (
                          <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Rating: {emp.serviceRating}</span>
                          </div>
                        )}
                        {emp.certificateIssued && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            Cert Issued
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isEditable && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(emp)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Past Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingEmployee ? 'Edit Past Employee Details' : 'Add Past Employee History Record'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 text-xs">
              {/* Section 1: Biodata & Identification */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Full Name (Last Name, Other Names) *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. MICHAEL KWABENA APPIAH"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staff / Employee ID</label>
                    <input
                      type="text"
                      value={formStaffId}
                      onChange={(e) => setFormStaffId(e.target.value)}
                      placeholder="e.g. JIPAS/STAFF/2018/012"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 0244556677"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. m.appiah@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Department, Role & Service Dates */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Service Record & Duration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white"
                    >
                      <option value="Senior High School">Senior High School (SHS)</option>
                      <option value="Junior High School">Junior High School (JHS)</option>
                      <option value="Primary School">Primary School</option>
                      <option value="Pre-School">Pre-School</option>
                      <option value="Accounts & Finance">Accounts & Finance</option>
                      <option value="Administration">Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Role / Designation *</label>
                    <input
                      type="text"
                      required
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="e.g. Head of Science / Physics Teacher"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Start Date of Service</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Exit / End Date of Service</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-indigo-900 text-xs">Calculated Duration of Service:</span>
                    <span className="font-black text-indigo-700 text-sm">{computedDuration}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Classes & Subjects Handled */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Teaching Responsibilities (Classes & Subjects)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Classes Handled (comma-separated)</label>
                    <input
                      type="text"
                      value={formClassesInput}
                      onChange={(e) => setFormClassesInput(e.target.value)}
                      placeholder="e.g. SHS 1 Science, SHS 2 Science, SHS 3 Science"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subjects Handled (comma-separated)</label>
                    <input
                      type="text"
                      value={formSubjectsInput}
                      onChange={(e) => setFormSubjectsInput(e.target.value)}
                      placeholder="e.g. Physics, Integrated Science, Elective Math"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Exit Reason & Certificate */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Exit Assessment & Certification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason for Departure</label>
                    <select
                      value={formExitReason}
                      onChange={(e) => setFormExitReason(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="Resigned">Resigned</option>
                      <option value="Retired">Retired</option>
                      <option value="Contract Completed">Contract Completed</option>
                      <option value="Relocated">Relocated</option>
                      <option value="Further Studies">Further Studies</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Service Conduct Rating</label>
                    <select
                      value={formServiceRating}
                      onChange={(e) => setFormServiceRating(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        checked={formCertificateIssued}
                        onChange={(e) => setFormCertificateIssued(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Certificate of Service Issued</span>
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Remarks & Commendations</label>
                    <textarea
                      rows={2}
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="Notes on performance, projects initiated, commendations, or reason for departure..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? 'Saving Record...' : (editingEmployee ? 'Update Record' : 'Save Past Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Dossier Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Service Record Dossier</h3>
              </div>
              <button 
                onClick={() => setViewingEmployee(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xl font-black flex items-center justify-center mx-auto mb-2 shadow-sm uppercase">
                  {viewingEmployee.fullName.slice(0, 2)}
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase">{viewingEmployee.fullName}</h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 font-mono mt-1 text-[11px]">
                  <span>Staff ID: {viewingEmployee.staffId || 'N/A'}</span>
                  <span>•</span>
                  <span>{viewingEmployee.department}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Designation / Role</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingEmployee.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration of Service</span>
                  <span className="font-bold text-indigo-700 text-sm">{viewingEmployee.durationOfService}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Exit Reason</span>
                  <span className="font-semibold text-slate-800">{viewingEmployee.exitReason}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Service Rating</span>
                  <span className="font-bold text-emerald-700">{viewingEmployee.serviceRating}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Classes & Subjects Taught</span>
                {viewingEmployee.subjectsHandled && (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingEmployee.subjectsHandled.map((subj, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-800 font-bold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-100">
                        {subj}
                      </span>
                    ))}
                  </div>
                )}
                {viewingEmployee.classesHandled && (
                  <p className="text-slate-600 text-[11px]">
                    <strong>Assigned Classes:</strong> {viewingEmployee.classesHandled.join(', ')}
                  </p>
                )}
              </div>

              {viewingEmployee.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                  <strong className="block text-slate-700 mb-0.5">Commendations & Remarks:</strong>
                  {viewingEmployee.remarks}
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
