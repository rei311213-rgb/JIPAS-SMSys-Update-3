import React, { useState, useMemo } from 'react';
import { Users, Building2, Save, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Teacher, ClassItem, SubjectItem } from '../../types';
import { saveTeacher, saveAllClasses, saveAllSubjects, saveUserAccount, rectifyHodDepartments } from '../../services/dbService';
import { getStoredClasses, getStoredSubjects, getStoredUsers } from '../../services/storageService';

interface BulkDepartmentReassignmentProps {
  teachers: Teacher[];
  onComplete?: () => void;
}

export default function BulkDepartmentReassignment({ teachers, onComplete }: BulkDepartmentReassignmentProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);

  const departments = [
    'Junior High School',
    'Primary School',
    'Pre-School',
    'Senior High School',
    'Science Department',
    'Languages & Humanities',
    'Administration'
  ];

  const handleReassign = async () => {
    if (!selectedTeacherId || !newDepartment) {
      setErrorMsg('Please select a teacher and a new department.');
      return;
    }

    if (selectedTeacher?.department === newDepartment) {
      setErrorMsg('Teacher is already in the selected department.');
      return;
    }

    setIsProcessing(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // 1. Update Teacher Record
      const updatedTeacher: Teacher = {
        ...selectedTeacher!,
        department: newDepartment
      };
      await saveTeacher(updatedTeacher);

      // 2. Update Associated Classes
      const allClasses = getStoredClasses();
      let classesUpdatedCount = 0;
      const updatedClasses = allClasses.map(cls => {
        if (cls.classTeacher === selectedTeacher?.name || (selectedTeacher?.classesTaught || []).includes(cls.name)) {
          classesUpdatedCount++;
          return { ...cls, department: newDepartment };
        }
        return cls;
      });
      if (classesUpdatedCount > 0) {
        await saveAllClasses(updatedClasses);
      }

      // 3. Update Associated Subjects
      const allSubjects = getStoredSubjects();
      let subjectsUpdatedCount = 0;
      const updatedSubjects = allSubjects.map(sub => {
        if ((selectedTeacher?.subjectsTaught || []).includes(sub.name)) {
          subjectsUpdatedCount++;
          return { ...sub, department: newDepartment };
        }
        return sub;
      });
      if (subjectsUpdatedCount > 0) {
        await saveAllSubjects(updatedSubjects);
      }

      // 4. Update Linked User Account
      const currentUsers = getStoredUsers();
      const linkedUser = currentUsers.find(u => 
        u.teacherId === selectedTeacher?.id || 
        (u.staffId && u.staffId.toLowerCase() === selectedTeacher?.staffId?.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === selectedTeacher?.email.toLowerCase())
      );
      if (linkedUser) {
        await saveUserAccount({
          ...linkedUser,
          department: newDepartment,
          assignedDepartments: [newDepartment]
        });
      }

      setSuccessMsg(`Successfully reassigned ${selectedTeacher?.name} to ${newDepartment}. Updated ${classesUpdatedCount} classes and ${subjectsUpdatedCount} subjects.`);
      if (onComplete) onComplete();
      setSelectedTeacherId('');
      setNewDepartment('');
    } catch (err) {
      console.error('Bulk reassignment error:', err);
      setErrorMsg('Failed to complete bulk reassignment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">Bulk Department Reassignment</h3>
          <p className="text-xs text-slate-500">Map a teacher to a new department and update all linked academic records.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs font-bold">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Select Teacher</label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Select Teacher --</option>
            {teachers.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider ml-1">New Department Target</label>
          <select
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Target Department --</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTeacher && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact Analysis</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Current Dept</span>
              <span className="text-[11px] font-black text-slate-900">{selectedTeacher.department}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Classes Linked</span>
              <span className="text-[11px] font-black text-slate-900">{selectedTeacher.classesTaught?.length || 0}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Subjects Linked</span>
              <span className="text-[11px] font-black text-slate-900">{selectedTeacher.subjectsTaught?.length || 0}</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-600 font-medium italic">
            Note: Moving this teacher will also update the department metadata for the above linked classes and subjects to ensure synchronization.
          </p>
        </div>
      )}

      <div className="pt-4 flex justify-between items-center border-t border-slate-100 mt-4">
        <button
          onClick={async () => {
            setIsProcessing(true);
            try {
              const res = await rectifyHodDepartments();
              if (res.success) {
                setSuccessMsg(res.message);
              } else {
                setErrorMsg(res.message);
              }
            } finally {
              setIsProcessing(false);
            }
          }}
          disabled={isProcessing}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          Run System Self-Heal (Fix HOD Mismatch)
        </button>

        <button
          onClick={handleReassign}
          disabled={isProcessing || !selectedTeacherId || !newDepartment}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
        >
          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Execute Bulk Reassignment</span>
        </button>
      </div>
    </div>
  );
}
