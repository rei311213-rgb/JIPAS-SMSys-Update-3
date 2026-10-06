import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  UserCheck, Users, Plus, Pencil, Trash2, Calendar, CheckCircle2, 
  XCircle, Clock, Search, BookOpen, GraduationCap, Phone, Mail, 
  AlertTriangle, Save, Download, FileText, Check, Award, Layers,
  Sparkles, Filter, X, CreditCard, Camera, QrCode, AlertCircle, Send, Upload, Zap, FileSpreadsheet
} from 'lucide-react';
import { exportStaffToExcel } from '../../services/excelExportService';
import { Teacher, TeacherAssignmentItem, TeacherAttendanceRecord, NotificationItem, Department, UserAccountItem, UserRole } from '../../types';
import PhotoUploader from '../common/PhotoUploader';
import TeacherIdCardGenerator from './TeacherIdCardGenerator';
import TeacherAttendanceReport from './TeacherAttendanceReport';
import TeacherAttendanceStats from './TeacherAttendanceStats';
import BulkTeacherUploadModal from './BulkTeacherUploadModal';
import IDCardToolModal from './IDCardToolModal';
import StaffLetterGeneratorModal, { StaffLetterType } from '../common/StaffLetterGeneratorModal';
import { INITIAL_SHS_COURSES } from '../../data/setupData';
import { 
  saveTeacher, 
  deleteTeacher, 
  subscribeTeacherAttendance, 
  getStoredTeacherAttendance,
  saveTeacherAttendanceRecord, 
  saveNotification, 
  subscribeDepartments,
  saveUserAccount,
  getStoredUsers
} from '../../services/dbService';

interface TeacherManagerProps {
  activeModule: string;
  teachers: Teacher[];
  onAddTeacher?: (teacher: Teacher) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string) => void;
  onNavigate?: (module: string) => void;
  isReadOnly?: boolean;
}

export const AVAILABLE_SUBJECT_CATEGORIES = [
  {
    category: 'Core Subjects',
    description: 'Fundamental National Curriculum Subjects',
    subjects: [
      'Mathematics',
      'English Language',
      'Integrated Science',
      'Natural Science',
      'Social Studies',
      'Computing / ICT',
      'Religious & Moral Education (RME)',
      'History of the region',
      'Our World Our People (OWOP)'
    ]
  },
  {
    category: 'Electives & Vocational',
    description: 'Practical, Creative & Technical Electives',
    subjects: [
      'Creative Arts & Design',
      'Career Technology',
      'Physical & Health Education (PE)',
      'Basic Design & Technology (BDT)',
      'Music & Performing Arts',
      'Agricultural Science'
    ]
  },
  {
    category: 'Languages',
    description: 'the regionian & International Language Streams',
    subjects: [
      'the regionian Language (Asante Twi)',
      'the regionian Language (Fante)',
      'the regionian Language (Ga)',
      'the regionian Language (Ewe)',
      'the regionian Language (Akuapem Twi)',
      'French Language',
      'Arabic Language'
    ]
  },
  {
    category: 'Early Childhood & Pre-School',
    description: 'Nursery, Kindergarten & Foundational Studies',
    subjects: [
      'Literacy & Phonics',
      'Numeracy & Early Math',
      'Environmental & Nature Studies',
      'Rhymes, Poems & Storytelling',
      'Psychomotor & Sensory Play',
      'All Subjects (Class Teacher)'
    ]
  }
];

export const AVAILABLE_CLASSES_LIST = [
  'Creche',
  'Nursery 1',
  'Nursery 2',
  'KG 1',
  'KG 2',
  'Basic 1',
  'Basic 2',
  'Basic 3',
  'Basic 4',
  'Basic 5',
  'Basic 6',
  'JHS 1',
  'JHS 2',
  'JHS 3'
];

export const INITIAL_TEACHER_ASSIGNMENTS: TeacherAssignmentItem[] = [];

export const INITIAL_TEACHER_ATTENDANCE: TeacherAttendanceRecord[] = [];

export default function TeacherManager({
  activeModule,
  teachers: initialTeachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onNavigate,
  isReadOnly = false
}: TeacherManagerProps) {
  const [teachersList, setTeachersList] = useState<Teacher[]>(initialTeachers);
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>(INITIAL_TEACHER_ASSIGNMENTS);
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>(INITIAL_TEACHER_ATTENDANCE);
  
  const [queryingTeacher, setQueryingTeacher] = useState<Teacher | null>(null);
  const [queryMessage, setQueryMessage] = useState('');
  const [querySeverity, setQuerySeverity] = useState('Warning');
  const [queryToast, setQueryToast] = useState(false);

  useEffect(() => {
    if (initialTeachers) {
      setTeachersList(prev => {
        if (!prev || prev.length === 0) return initialTeachers;
        const map = new Map<string, Teacher>();
        initialTeachers.forEach(t => map.set(t.id, t));
        prev.forEach(t => {
          if (!map.has(t.id)) {
            map.set(t.id, t);
          }
        });
        return Array.from(map.values());
      });
    }
  }, [initialTeachers]);
  
  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [selectedIDCardRecord, setSelectedIDCardRecord] = useState<any | null>(null);
  const [letterModalStaff, setLetterModalStaff] = useState<Teacher | null>(null);
  const [letterModalType, setLetterModalType] = useState<StaffLetterType>('employment');

  const [showAddAssignModal, setShowAddAssignModal] = useState(false);
  const [editingAssign, setEditingAssign] = useState<TeacherAssignmentItem | null>(null);
  const [deletingAssign, setDeletingAssign] = useState<TeacherAssignmentItem | null>(null);

  // Search & Filter
  const [teacherSearch, setTeacherSearch] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [assignClassFilter, setAssignClassFilter] = useState('All');
  const [assignRoleFilter, setAssignRoleFilter] = useState('All');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceToast, setAttendanceToast] = useState(false);
  const [assignSuccessToast, setAssignSuccessToast] = useState<string | null>(null);
  const [statsMonth, setStatsMonth] = useState('September 2026');

  // QR Attendance Station Modal State
  const [isQrTerminalOpen, setIsQrTerminalOpen] = useState(false);
  const [qrInitialMode, setQrInitialMode] = useState<'scan_office_qr' | 'office_terminal' | 'my_qr_badge'>('office_terminal');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    // Initial fetch
    setAttendanceRecords(getStoredTeacherAttendance());

    const unsub = subscribeTeacherAttendance((records) => {
      setAttendanceRecords(records);
    });
    const unsubDept = subscribeDepartments((data) => {
      setDepartments(data);
    });

    const handleLiveAttendanceUpdate = () => {
      setAttendanceRecords(getStoredTeacherAttendance());
    };

    window.addEventListener('jipas_staff_attendance_updated', handleLiveAttendanceUpdate);
    window.addEventListener('jipas_cloud_synced', handleLiveAttendanceUpdate);
    window.addEventListener('storage', handleLiveAttendanceUpdate);
    window.addEventListener('focus', handleLiveAttendanceUpdate);

    const pollTimer = setInterval(handleLiveAttendanceUpdate, 4000);

    return () => {
      unsub();
      unsubDept();
      window.removeEventListener('jipas_staff_attendance_updated', handleLiveAttendanceUpdate);
      window.removeEventListener('jipas_cloud_synced', handleLiveAttendanceUpdate);
      window.removeEventListener('storage', handleLiveAttendanceUpdate);
      window.removeEventListener('focus', handleLiveAttendanceUpdate);
      clearInterval(pollTimer);
    };
  }, []);

  // Teacher Form State
  const [formLastName, setFormLastName] = useState('');
  const [formOtherNames, setFormOtherNames] = useState('');
  const [formName, setFormName] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [formDateOfEmployment, setFormDateOfEmployment] = useState(new Date().toISOString().split('T')[0]);
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formAcademicQual, setFormAcademicQual] = useState('B.Ed. Basic Education');
  const [formProfQual, setFormProfQual] = useState('Licensed Professional Teacher (NTC)');
  const [formDesignation, setFormDesignation] = useState('Class Teacher');
  const [formRank, setFormRank] = useState('Senior Superintendent I');
  const [formDepartment, setFormDepartment] = useState('Primary Department');
  const [formNtcLicense, setFormNtcLicense] = useState('NTC/TR/2022/49821');
  const [formEmergencyContact, setFormEmergencyContact] = useState('0244123456');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formClasses, setFormClasses] = useState('Basic 1');
  const [formSubjects, setFormSubjects] = useState('Mathematics, English Language');
  const [formShsStream, setFormShsStream] = useState('General Science');
  const [formCampus, setFormCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');
  const [formNationality, setFormNationality] = useState('Ghanaian');
  const [formProbationStatus, setFormProbationStatus] = useState<'Probation' | 'Confirmed' | 'Contract'>('Probation');
  const [formPhoto, setFormPhoto] = useState<string>('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80');

  // CEO Digital Signature Modal State
  const [showCeoSigModal, setShowCeoSigModal] = useState(false);
  const [ceoSigPreview, setCeoSigPreview] = useState(typeof window !== 'undefined' ? localStorage.getItem('jipas_ceo_signature') || '' : '');

  const handleToggleFormSubject = (subj: string) => {
    const currentList = formSubjects.split(',').map(s => s.trim()).filter(Boolean);
    const exists = currentList.some(s => s.toLowerCase() === subj.toLowerCase());
    const updated = exists
      ? currentList.filter(s => s.toLowerCase() !== subj.toLowerCase())
      : [...currentList, subj];
    setFormSubjects(updated.join(', '));
  };

  // Assignment Form State (Multiple Classes & Subjects Selection)
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignClass, setAssignClass] = useState('Basic 1');
  const [assignClasses, setAssignClasses] = useState<string[]>(['Basic 1']);
  const [assignClassDeptFilter, setAssignClassDeptFilter] = useState<'All' | 'Pre-School & Primary' | 'Junior High (JHS)' | 'Senior High (SHS)'>('All');
  const [selectedShsCourse, setSelectedShsCourse] = useState<string>('General Science');
  const [assignSubjects, setAssignSubjects] = useState<string[]>(['Mathematics']);
  const [assignRoleType, setAssignRoleType] = useState<'Class Teacher' | 'Subject Teacher' | 'Assistant'>('Class Teacher');
  
  // Class Selection Helpers
  const toggleClassSelection = (cls: string) => {
    setAssignClasses(prev => 
      prev.includes(cls)
        ? prev.filter(c => c !== cls)
        : [...prev, cls]
    );
  };

  const handleClearAllClasses = () => {
    setAssignClasses([]);
  };
  
  // Multiple Subject Picker Interactive State
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('All');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Open Edit Teacher
  const handleOpenEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setFormName(t.name);
    const parts = (t.name || '').trim().split(/\s+/);
    setFormLastName(parts[0] || '');
    setFormOtherNames(parts.slice(1).join(' '));
    setFormStaffId(t.staffId || `JIPAS/STAFF/2026/${t.id.replace('t', '').padStart(3, '0')}`);
    setFormDateOfEmployment(t.dateOfEmployment || t.dateJoined || new Date().toISOString().split('T')[0]);
    setFormEmail(t.email);
    setFormPhone(t.phone);
    setFormGender(t.gender || 'Male');
    setFormAcademicQual(t.academicQualification || 'B.Ed. Basic Education');
    setFormProfQual(t.professionalQualification || 'Licensed Teacher');
    setFormDesignation(t.designation || 'Class Teacher');
    setFormRank(t.rank || 'Senior Superintendent I');
    setFormDepartment(t.department || 'Primary Department');
    setFormNtcLicense(t.ntcLicenseNo || 'NTC/TR/2022/49821');
    setFormEmergencyContact(t.emergencyContact || '0244123456');
    setFormBloodGroup(t.bloodGroup || 'O+');
    setFormClasses(t.classesTaught?.join(', ') || 'Basic 1');
    setFormSubjects(t.subjectsTaught?.join(', ') || 'Mathematics');
    setFormCampus(t.campus || 'JIPAS 1');
    setFormNationality(t.nationality || 'Ghanaian');
    setFormPhoto(t.photo || (t.gender === 'Female' 
      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' 
      : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'));
  };

  // Save Teacher
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedTeacherName = [formLastName.trim(), formOtherNames.trim()].filter(Boolean).join(' ') || formName.trim();
    if (!combinedTeacherName) return;

    const classArray = formClasses.split(',').map(c => c.trim()).filter(Boolean);
    const subjectArray = formSubjects.split(',').map(s => s.trim()).filter(Boolean);

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        staffId: formStaffId || editingTeacher.staffId || `JIPAS/STAFF/2026/${editingTeacher.id.replace('t', '').padStart(3, '0')}`,
        name: combinedTeacherName,
        email: formEmail,
        phone: formPhone,
        gender: formGender,
        academicQualification: formAcademicQual,
        professionalQualification: formProfQual,
        designation: formDesignation,
        rank: formRank,
        department: formDepartment,
        campus: formCampus,
        ntcLicenseNo: formNtcLicense,
        emergencyContact: formEmergencyContact,
        bloodGroup: formBloodGroup,
        nationality: formNationality || 'Ghanaian',
        dateOfEmployment: formDateOfEmployment || editingTeacher.dateOfEmployment || editingTeacher.dateJoined || new Date().toISOString().split('T')[0],
        dateJoined: formDateOfEmployment || editingTeacher.dateJoined || new Date().toISOString().split('T')[0],
        classesTaught: classArray,
        subjectsTaught: subjectArray,
        photo: formPhoto
      };
      try {
        await saveTeacher(updated);
        setTeachersList(prev => prev.map(t => t.id === editingTeacher.id ? updated : t));
        if (onUpdateTeacher) onUpdateTeacher(updated);
        
        // Update linked user account if exists
        try {
          const currentUsers = getStoredUsers();
          const linkedUser = currentUsers.find(u => 
            u.teacherId === editingTeacher.id || 
            (u.staffId && u.staffId.toLowerCase() === editingTeacher.staffId.toLowerCase()) ||
            (u.email && u.email.toLowerCase() === editingTeacher.email.toLowerCase())
          );
          if (linkedUser) {
            await saveUserAccount({
              ...linkedUser,
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              department: updated.department,
              campus: updated.campus,
              classesTaught: classArray,
              subjectsTaught: subjectArray
            });
          }
        } catch (linkErr) {
          console.warn('Could not sync user account on teacher update:', linkErr);
        }

        setEditingTeacher(null);
      } catch (err) {
        console.error('Failed to update teacher in DB:', err);
      }
    } else {
      const nextId = `t-${Date.now()}`;
      const newTeacher: Teacher = {
        id: nextId,
        staffId: formStaffId || `JIPAS/STAFF/2026/${String(teachersList.length + 1).padStart(3, '0')}`,
        name: combinedTeacherName,
        email: formEmail || `${combinedTeacherName.toLowerCase().replace(/\s+/g, '.')}@jipas.edu.gh`,
        phone: formPhone || '0240000000',
        gender: formGender,
        academicQualification: formAcademicQual,
        professionalQualification: formProfQual,
        designation: formDesignation,
        rank: formRank,
        department: formDepartment,
        campus: formCampus,
        ntcLicenseNo: formNtcLicense || 'NTC/TR/2026/001',
        emergencyContact: formEmergencyContact || '0240000000',
        bloodGroup: formBloodGroup || 'O+',
        nationality: formNationality || 'Ghanaian',
        dateOfEmployment: formDateOfEmployment || new Date().toISOString().split('T')[0],
        dateJoined: formDateOfEmployment || new Date().toISOString().split('T')[0],
        classesTaught: classArray,
        subjectsTaught: subjectArray,
        photo: formPhoto || (formGender === 'Female'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80')
      };
      
      try {
        await saveTeacher(newTeacher);
        setTeachersList(prev => [newTeacher, ...prev]);
        if (onAddTeacher) onAddTeacher(newTeacher);

        // Compulsory Auto-Create Portal Login User Account with role teacher & secure credentials
        const cleanStaffId = newTeacher.staffId;
        const autoUsername = cleanStaffId 
          ? `staff_${cleanStaffId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`
          : (newTeacher.email ? newTeacher.email.split('@')[0].toLowerCase() : `teacher_${Date.now()}`);
        const securePassword = `Staff@${cleanStaffId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '2026'}`;
        
        const desLower = (newTeacher.designation || '').toLowerCase();
        const assignedRole: UserRole = desLower.includes('cook') ? 'cook'
          : desLower.includes('cleaner') ? 'cleaner'
          : desLower.includes('security') ? 'security'
          : desLower.includes('driver') ? 'driver'
          : desLower.includes('librarian') ? 'librarian'
          : desLower.includes('nurse') ? 'nurse'
          : desLower.includes('lab') ? 'lab_assistant'
          : desLower.includes('maintenance') || desLower.includes('handyman') ? 'handyman'
          : 'teacher';

        const autoTeacherUser: UserAccountItem = {
          id: `usr-t-${newTeacher.id}`,
          name: newTeacher.name,
          email: newTeacher.email,
          username: autoUsername,
          password: securePassword,
          role: assignedRole,
          phone: newTeacher.phone,
          status: 'Active',
          isApproved: true,
          department: newTeacher.department,
          classAssigned: classArray[0] || '',
          classesTaught: classArray,
          subjectsTaught: subjectArray,
          staffId: newTeacher.staffId,
          teacherId: newTeacher.id,
          campus: newTeacher.campus,
          createdAt: new Date().toISOString(),
          lastLogin: 'Never',
          registrationType: 'faculty'
        };

        try {
          await saveUserAccount(autoTeacherUser);
        } catch (accErr) {
          console.warn('Auto-create teacher user account warning:', accErr);
        }

        setShowAddTeacherModal(false);
      } catch (err) {
        console.error('Failed to save new teacher:', err);
      }
    }
  };

  // Delete Teacher
  const handleConfirmDeleteTeacher = async () => {
    if (deletingTeacher) {
      try {
        await deleteTeacher(deletingTeacher.id);
        setTeachersList(prev => prev.filter(t => t.id !== deletingTeacher.id));
        if (onDeleteTeacher) onDeleteTeacher(deletingTeacher.id);
        setDeletingTeacher(null);
      } catch (err) {
        console.error('Failed to delete teacher from DB:', err);
      }
    }
  };

  // Multiple Subjects Toggle & Helpers
  const toggleSubjectSelection = (subj: string) => {
    setAssignSubjects(prev => 
      prev.includes(subj)
        ? prev.filter(s => s !== subj)
        : [...prev, subj]
    );
  };

  const handleSelectAllCategory = (subjects: string[]) => {
    setAssignSubjects(prev => Array.from(new Set([...prev, ...subjects])));
  };

  const handleClearAllSubjects = () => {
    setAssignSubjects([]);
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customSubjectInput.trim();
    if (!clean) return;
    if (!assignSubjects.includes(clean)) {
      setAssignSubjects(prev => [...prev, clean]);
    }
    setCustomSubjectInput('');
  };

  const handleSelectAllCore = () => {
    const coreCategory = AVAILABLE_SUBJECT_CATEGORIES.find(c => c.category === 'Core Subjects');
    if (coreCategory) {
      setAssignSubjects(prev => Array.from(new Set([...prev, ...coreCategory.subjects])));
    }
  };

  const handleSelectClassTeacherPackage = () => {
    setAssignRoleType('Class Teacher');
    setAssignSubjects([
      'All Subjects (Class Teacher)',
      'Mathematics',
      'English Language',
      'Integrated Science',
      'Social Studies',
      'Computing / ICT',
      'Religious & Moral Education (RME)',
      'Our World Our People (OWOP)',
      'Creative Arts & Design'
    ]);
  };

  // Open New Assignment Modal
  const handleOpenNewAssignment = () => {
    setEditingAssign(null);
    setAssignTeacherId(teachersList[0]?.id || '');
    setAssignClass('Basic 1');
    setAssignClasses(['Basic 1']);
    setAssignClassDeptFilter('All');
    setSelectedShsCourse('General Science');
    setAssignSubjects(['Mathematics']);
    setAssignRoleType('Subject Teacher');
    setSubjectCategoryFilter('All');
    setSubjectSearchQuery('');
    setCustomSubjectInput('');
    setShowAddAssignModal(true);
  };

  // Open Edit Assignment Modal
  const handleOpenEditAssignment = (assign: TeacherAssignmentItem) => {
    setEditingAssign(assign);
    setAssignTeacherId(assign.teacherId);
    setAssignClass(assign.className);
    setAssignClasses([assign.className]);
    setAssignClassDeptFilter('All');
    setSelectedShsCourse('General Science');
    const existing = assign.subjectName.includes(',')
      ? assign.subjectName.split(',').map(s => s.trim()).filter(Boolean)
      : [assign.subjectName];
    setAssignSubjects(existing);
    setAssignRoleType(assign.roleType);
    setSubjectCategoryFilter('All');
    setSubjectSearchQuery('');
    setCustomSubjectInput('');
    setShowAddAssignModal(true);
  };

  // Save Assignment (Handles Multiple Classes & Multiple Subjects Selection)
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedTeacher = teachersList.find(t => t.id === assignTeacherId) || teachersList[0];
    if (!matchedTeacher) return;

    if (assignClasses.length === 0) {
      alert('Please select at least one class / form to assign to this teacher.');
      return;
    }

    if (assignSubjects.length === 0) {
      alert('Please select at least one subject to assign to this teacher.');
      return;
    }

    if (editingAssign) {
      // Update existing allocation or replace with selected classes & subjects
      setAssignments(prev => {
        const withoutCurrent = prev.filter(a => a.id !== editingAssign.id);
        const updatedItems: TeacherAssignmentItem[] = [];
        let count = 0;
        assignClasses.forEach((cls) => {
          assignSubjects.forEach((sub) => {
            updatedItems.push({
              id: count === 0 ? editingAssign.id : `ta-${Date.now()}-${count}`,
              teacherId: matchedTeacher.id,
              teacherName: matchedTeacher.name,
              className: cls,
              subjectName: sub,
              academicYear: '2025-2026',
              term: 'Third Term',
              roleType: assignRoleType
            });
            count++;
          });
        });
        return [...updatedItems, ...withoutCurrent];
      });
      setAssignSuccessToast(`Updated assignment for ${matchedTeacher.name} across ${assignClasses.length} class(es) and ${assignSubjects.length} subject(s)!`);
      setEditingAssign(null);
    } else {
      // Create new allocations for each selected class and each selected subject
      const newItems: TeacherAssignmentItem[] = [];
      let count = 0;
      assignClasses.forEach((cls) => {
        assignSubjects.forEach((sub) => {
          newItems.push({
            id: `ta-${Date.now()}-${count}`,
            teacherId: matchedTeacher.id,
            teacherName: matchedTeacher.name,
            className: cls,
            subjectName: sub,
            academicYear: '2025-2026',
            term: 'Third Term',
            roleType: assignRoleType
          });
          count++;
        });
      });
      setAssignments(prev => [...newItems, ...prev]);
      setAssignSuccessToast(`Assigned ${matchedTeacher.name} to ${assignClasses.join(', ')} for ${assignSubjects.length} subject(s)!`);
      setShowAddAssignModal(false);
    }

    // Synchronize faculty profile taught subjects & classes
    setTeachersList(prev => prev.map(t => {
      if (t.id === matchedTeacher.id) {
        const existingSubjs = t.subjectsTaught || [];
        const mergedSubjs = Array.from(new Set([...existingSubjs, ...assignSubjects]));
        const existingClasses = t.classesTaught || [];
        const mergedClasses = Array.from(new Set([...existingClasses, ...assignClasses]));
        const updatedT: Teacher = {
          ...t,
          subjectsTaught: mergedSubjs,
          classesTaught: mergedClasses
        };
        if (onUpdateTeacher) onUpdateTeacher(updatedT);
        return updatedT;
      }
      return t;
    }));

    setTimeout(() => setAssignSuccessToast(null), 4000);
  };

  // Quick Attendance Status Switcher
  const handleUpdateAttendanceStatus = (teacherId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setAttendanceRecords(prev => {
      const existing = prev.find(a => a.teacherId === teacherId && a.date === attendanceDate);
      if (existing) {
        return prev.map(a => a.id === existing.id ? { ...a, status } : a);
      } else {
        const teacher = teachersList.find(t => t.id === teacherId);
        return [
          {
            id: `att-${Date.now()}-${teacherId}`,
            date: attendanceDate,
            teacherId,
            teacherName: teacher?.name || 'Teacher',
            status,
            timeIn: status === 'Present' ? '07:30 AM' : status === 'Late' ? '08:15 AM' : '--'
          },
          ...prev
        ];
      }
    });
  };

  // Mark All Present
  const handleMarkAllPresent = () => {
    const newRecords: TeacherAttendanceRecord[] = teachersList.map(t => ({
      id: `att-${Date.now()}-${t.id}`,
      date: attendanceDate,
      teacherId: t.id,
      teacherName: t.name,
      status: 'Present',
      timeIn: '07:30 AM',
      remarks: 'Standard check-in'
    }));
    setAttendanceRecords(prev => {
      const filtered = prev.filter(a => a.date !== attendanceDate);
      return [...newRecords, ...filtered];
    });
    setAttendanceToast(true);
    setTimeout(() => setAttendanceToast(false), 3000);
  };

  // Filtered lists
  const filteredTeachers = teachersList.filter(t => 
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.phone.includes(teacherSearch) ||
    t.designation?.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // Virtualized row engine for high-performance rendering (>500 records)
  const teacherTableParentRef = useRef<HTMLDivElement>(null);

  const teacherRowVirtualizer = useVirtualizer({
    count: filteredTeachers.length,
    getScrollElement: () => teacherTableParentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = 
      a.teacherName.toLowerCase().includes(assignSearch.toLowerCase()) ||
      a.className.toLowerCase().includes(assignSearch.toLowerCase()) ||
      a.subjectName.toLowerCase().includes(assignSearch.toLowerCase());
    
    const matchesClass = assignClassFilter === 'All' || a.className === assignClassFilter;
    const matchesRole = assignRoleFilter === 'All' || a.roleType === assignRoleFilter;

    return matchesSearch && matchesClass && matchesRole;
  });

  const displayedCategories = subjectCategoryFilter === 'All'
    ? AVAILABLE_SUBJECT_CATEGORIES
    : AVAILABLE_SUBJECT_CATEGORIES.filter(c => c.category === subjectCategoryFilter);

  return (
    <div className="space-y-6">
      {/* 1. TEACHER PROFILE MODULE */}
      {(activeModule === 'teacher_profile' || activeModule === 'teachers') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Teaching Faculty & Staff Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full academic qualifications, the region NTC licensing numbers, assigned ranks, and subject specialization.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportStaffToExcel(teachersList)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-emerald-600"
                title="Download full faculty & staff directory as Microsoft Excel spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export to Excel (.xlsx)
              </button>
              <button
                onClick={() => onNavigate?.('teacher_id_cards')}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CreditCard className="w-4 h-4 text-indigo-600" /> Staff ID Cards
              </button>
              <button
                onClick={() => setShowCeoSigModal(true)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Award className="w-4 h-4 text-amber-600" /> CEO Signature
              </button>
              {!isReadOnly && (
                <>
                  <button
                    onClick={() => setShowBulkUploadModal(true)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" /> Bulk Import CSV
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeacher(null);
                      setFormName('');
                      setFormLastName('');
                      setFormOtherNames('');
                      setFormStaffId(`JIPAS/STAFF/2026/${String(teachersList.length + 1).padStart(3, '0')}`);
                      setFormDateOfEmployment(new Date().toISOString().split('T')[0]);
                      setFormEmail('');
                      setFormPhone('');
                      setFormGender('Male');
                      setFormAcademicQual('B.Ed. Basic Education');
                      setFormProfQual('Licensed Professional Teacher (NTC)');
                      setFormDesignation('Class Teacher');
                      setFormRank('Senior Superintendent I');
                      setFormDepartment('Primary Department');
                      setFormNtcLicense('NTC/TR/2022/49821');
                      setFormEmergencyContact('0244123456');
                      setFormBloodGroup('O+');
                      setFormClasses('Basic 1');
                      setFormSubjects('Mathematics, Science');
                      setFormPhoto('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80');
                      setShowAddTeacherModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New Employee
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher by name, rank, subject, phone..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="text-slate-500 font-medium flex items-center gap-2">
              <span>Showing <strong>{filteredTeachers.length}</strong> of <strong>{teachersList.length}</strong> faculty members</span>
              {filteredTeachers.length > 50 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  <Zap className="w-3 h-3 text-emerald-600 animate-pulse" /> Virtualized List (High Performance)
                </span>
              )}
            </div>
          </div>

          {/* Desktop Table (Virtualized Engine) */}
          <div ref={teacherTableParentRef} className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Photo & Faculty Name</th>
                  <th className="p-3">Designation & Rank</th>
                  <th className="p-3">Department & Qualifications</th>
                  <th className="p-3">Classes & Subjects</th>
                  <th className="p-3">Contact Details</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No faculty records match your search criteria.
                    </td>
                  </tr>
                ) : (() => {
                  const virtualRows = teacherRowVirtualizer.getVirtualItems();
                  const totalSize = teacherRowVirtualizer.getTotalSize();
                  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
                  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

                  return (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const teacher = filteredTeachers[virtualRow.index];
                        const idx = virtualRow.index;

                        return (
                          <tr 
                            key={teacher.id} 
                            data-index={virtualRow.index} 
                            ref={teacherRowVirtualizer.measureElement} 
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-2xs shrink-0 bg-slate-100">
                                  {teacher.photo ? (
                                    <img
                                      src={teacher.photo}
                                      alt={teacher.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                                      {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{teacher.name}</div>
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                    <span>{teacher.gender}</span>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-indigo-600">
                                      {teacher.staffId || `ID: ${teacher.id}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{teacher.designation}</div>
                              <div className="text-[10px] text-indigo-600 font-bold">{teacher.rank}</div>
                              {(teacher.dateOfEmployment || teacher.dateJoined) && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Employed: <span className="text-slate-700 font-semibold">{teacher.dateOfEmployment || teacher.dateJoined}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="text-slate-800 font-medium">{teacher.department || 'Primary Department'}</div>
                              <div className="text-[10px] text-emerald-700 font-medium">{teacher.professionalQualification}</div>
                              {teacher.ntcLicenseNo && (
                                <div className="text-[9px] text-slate-400 font-mono">Lic: {teacher.ntcLicenseNo}</div>
                              )}
                              <div className="mt-1">
                                <span className={`inline-flex items-center text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border uppercase leading-none ${
                                  teacher.campus === 'JIPAS 2' 
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800' 
                                    : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-800'
                                }`}>
                                  {teacher.campus || 'JIPAS 1'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {teacher.subjectsTaught?.map((sub, sIdx) => (
                                  <span key={sIdx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                Classes: {teacher.classesTaught?.join(', ') || 'Unassigned'}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-xs">{teacher.phone}</div>
                              <div className="text-[10px] text-slate-400">{teacher.email}</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setQueryingTeacher(teacher);
                                    setQueryMessage('');
                                    setQuerySeverity('Warning');
                                  }}
                                  title="Send Query / Alert to Teacher"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedIDCardRecord(teacher)}
                                  title="Generate Staff ID Card"
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setLetterModalStaff(teacher);
                                    setLetterModalType('employment');
                                  }}
                                  title="Generate Official Employment Letter"
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setLetterModalStaff(teacher);
                                    setLetterModalType('confirmation');
                                  }}
                                  title="Generate Acceptance Letter After Probation"
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                </button>
                                {!isReadOnly && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditTeacher(teacher)}
                                      title="Edit Faculty Record & Photo"
                                      className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingTeacher(teacher)}
                                      title="Delete Faculty Record"
                                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={7} style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredTeachers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-semibold bg-white border border-slate-200 rounded-2xl">
                No faculty records match your search criteria.
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-indigo-200 shrink-0 bg-slate-100">
                      {teacher.photo ? (
                        <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                          {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{teacher.name}</h4>
                      <p className="text-xs text-indigo-600 font-bold">{teacher.role} • {teacher.department || 'Academic'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center text-[8px] font-black tracking-wider px-1 py-0.5 rounded border uppercase leading-none ${
                          teacher.campus === 'JIPAS 2' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800' 
                            : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-800'
                        }`}>
                          {teacher.campus || 'JIPAS 1'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{teacher.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="text-slate-600">Subjects: <strong>{teacher.subjectsTaught?.join(', ') || teacher.subjects?.join(', ') || 'None'}</strong></div>
                    <div className="text-slate-600">Classes: <strong>{teacher.classesTaught?.join(', ') || 'None'}</strong></div>
                    {(teacher.dateOfEmployment || teacher.dateJoined) && (
                      <div className="text-slate-600">Date of Employment: <strong>{teacher.dateOfEmployment || teacher.dateJoined}</strong></div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setQueryingTeacher(teacher);
                        setQueryMessage('');
                        setQuerySeverity('Warning');
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> Query
                    </button>
                    <button
                      onClick={() => setSelectedIDCardRecord(teacher)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> ID Card
                    </button>
                    <button
                      onClick={() => {
                        setLetterModalStaff(teacher);
                        setLetterModalType('employment');
                      }}
                      title="Generate Employment Letter"
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Offer Letter
                    </button>
                    <button
                      onClick={() => {
                        setLetterModalStaff(teacher);
                        setLetterModalType('confirmation');
                      }}
                      title="Generate Acceptance Letter After Probation"
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" /> Post-Probation
                    </button>
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => handleOpenEditTeacher(teacher)}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeletingTeacher(teacher)}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. ASSIGN TEACHER MODULE (MULTIPLE SUBJECTS SELECTION) */}
      {activeModule === 'teacher_assign' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Class & Multiple Subject Teacher Allocation Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign head class teachers and multiple specialist subjects per class with single-click batch allocation.
              </p>
            </div>
            <button
              onClick={handleOpenNewAssignment}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Assign Teacher (Multiple Subjects)
            </button>
          </div>

          {/* Success Toast */}
          {assignSuccessToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {assignSuccessToast}
              </span>
              <button onClick={() => setAssignSuccessToast(null)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Subject Allocations</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{assignments.length}</span>
              <span className="text-[10px] text-slate-500">Active timetable teaching slots</span>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Assigned Faculty</span>
              <span className="text-2xl font-black text-indigo-800 font-mono mt-0.5 block">
                {new Set(assignments.map(a => a.teacherId)).size} / {teachersList.length}
              </span>
              <span className="text-[10px] text-indigo-600">Active instructors allocated</span>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
              <span className="text-[10px] font-bold uppercase text-purple-700 block">Form Masters / Class Teachers</span>
              <span className="text-2xl font-black text-purple-800 font-mono mt-0.5 block">
                {assignments.filter(a => a.roleType === 'Class Teacher').length}
              </span>
              <span className="text-[10px] text-purple-600">Head class leaders</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Specialist Subject Allocations</span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-0.5 block">
                {assignments.filter(a => a.roleType === 'Subject Teacher').length}
              </span>
              <span className="text-[10px] text-emerald-600">Departmental specialists</span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search by teacher name, subject, class..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold text-[11px]">Class:</span>
                <select
                  value={assignClassFilter}
                  onChange={(e) => setAssignClassFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="All">All Classes</option>
                  {AVAILABLE_CLASSES_LIST.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold text-[11px]">Role:</span>
                <select
                  value={assignRoleFilter}
                  onChange={(e) => setAssignRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="All">All Roles</option>
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Subject Teacher">Subject Teacher</option>
                  <option value="Assistant">Assistant</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 font-medium">
              Showing <strong>{filteredAssignments.length}</strong> of <strong>{assignments.length}</strong> allocations
            </div>
          </div>

          {/* Assignments Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Assigned Teacher</th>
                  <th className="p-3">Class Allocated</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Role Type</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No teacher assignments found matching your filter. Click "Assign Teacher" to allocate subjects.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assign, idx) => (
                    <tr key={assign.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{assign.teacherName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {assign.teacherId}</div>
                      </td>
                      <td className="p-3 font-semibold text-indigo-700">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md font-bold">
                          {assign.className}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block border border-slate-200">
                          {assign.subjectName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          assign.roleType === 'Class Teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {assign.roleType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{assign.academicYear} • {assign.term}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditAssignment(assign)}
                            title="Edit Assignment"
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssignments(prev => prev.filter(a => a.id !== assign.id))}
                            title="Remove Allocation"
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TEACHER ATTENDANCE MODULE */}
      {activeModule === 'teacher_attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Daily Teacher Attendance Register
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark, verify, and log daily staff arrival, punctuality, and leaves of absence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" /> Mark All Present
              </button>
            </div>
          </div>

          {attendanceToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Teacher attendance registered and saved for {attendanceDate}!
              </span>
              <button onClick={() => setAttendanceToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Date Selector */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Attendance Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex-1 text-slate-500">
              Mark individual arrival status using the buttons in each row below.
            </div>
          </div>

          {/* Attendance Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Time In</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Method / Office Verification</th>
                  <th className="p-3 text-center">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {teachersList.map((t, idx) => {
                  const record = attendanceRecords.find(a => a.teacherId === t.id && a.date === attendanceDate);
                  const currentStatus = record?.status || 'Present';
                  const timeIn = record?.timeIn || (currentStatus === 'Present' ? '07:30 AM' : '--');
                  const clockMethod = record?.clockInMethod || 'Manual Admin Log';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{t.name}</td>
                      <td className="p-3 text-slate-600">{t.designation}</td>
                      <td className="p-3 font-mono text-slate-700">{timeIn}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          currentStatus === 'Present' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          currentStatus === 'Late' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          currentStatus === 'Absent' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        {clockMethod.includes('QR') ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            <QrCode className="w-3 h-3 text-indigo-600" />
                            {clockMethod}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">{clockMethod}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateAttendanceStatus(t.id, 'Present')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              currentStatus === 'Present' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleUpdateAttendanceStatus(t.id, 'Late')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              currentStatus === 'Late' ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => handleUpdateAttendanceStatus(t.id, 'Absent')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              currentStatus === 'Absent' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleUpdateAttendanceStatus(t.id, 'Excused')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              currentStatus === 'Excused' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TEACHER ATTENDANCE REPORT MODULE */}
      {(activeModule === 'teacher_attendance_report' || activeModule === 'attendance_report' || activeModule === 'teacher_attendance_reports') && (
        <TeacherAttendanceReport
          teachers={teachersList}
          attendanceRecords={attendanceRecords}
          onNavigate={onNavigate}
          onUpdateStatus={handleUpdateAttendanceStatus}
        />
      )}

      {/* 5. TEACHER ATTENDANCE STATISTICS MODULE */}
      {(activeModule === 'teacher_attendance_stats' || activeModule === 'attendance_stats' || activeModule === 'attendance_statistics' || activeModule === 'teacher_attendance_statistics') && (
        <TeacherAttendanceStats
          teachers={teachersList}
          attendanceRecords={attendanceRecords}
          onNavigate={onNavigate}
        />
      )}

      {/* 6. TEACHER ID CARDS GENERATOR MODULE */}
      {(activeModule === 'teacher_id_cards' || activeModule === 'staff_id_cards') && (
        <TeacherIdCardGenerator
          teachers={teachersList}
          onNavigate={onNavigate}
        />
      )}

      {/* ADD / EDIT TEACHER MODAL */}
      {(showAddTeacherModal || editingTeacher) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingTeacher ? 'Edit Faculty Record & Profile' : 'Register New Faculty Member'}
              </h3>
              <button
                onClick={() => {
                  setShowAddTeacherModal(false);
                  setEditingTeacher(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              {/* Photo Uploader */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <PhotoUploader
                  currentPhoto={formPhoto}
                  onPhotoChange={setFormPhoto}
                  entityType="teacher"
                  gender={formGender}
                  label="Teacher Passport Photograph"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name (Surname) *</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="e.g. OSEI"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Other Names (First & Middle) *</label>
                  <input
                    type="text"
                    required
                    value={formOtherNames}
                    onChange={(e) => setFormOtherNames(e.target.value)}
                    placeholder="e.g. EMMANUEL KOFI"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Staff ID Number</label>
                  <input
                    type="text"
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    placeholder="e.g. JIPAS/STAFF/2026/012"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Date of Employment / Date d'embauche *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDateOfEmployment}
                    onChange={(e) => setFormDateOfEmployment(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                  >
                    <option value="Senior High School">Senior High School (SHS)</option>
                    <option value="Junior High School">Junior High School</option>
                    <option value="Primary Department">Primary Department</option>
                    <option value="Early Childhood">Early Childhood</option>
                    <option value="Administration">Administration</option>
                    <option value="Science Department">Science Department</option>
                    <option value="Languages & Humanities">Languages & Humanities</option>
                    {departments.length > 0 && departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation / Role</label>
                  <select
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Class Teacher">Class Teacher</option>
                    <option value="Subject Teacher">Subject Teacher</option>
                    <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                    <option value="Assistant Head">Assistant Head</option>
                    <option value="Head Teacher">Head Teacher</option>
                    <option value="Welfare Officer">Welfare Officer</option>
                    <option value="ICT Tutor & STEM Lead">ICT Tutor & STEM Lead</option>
                    <option value="Cook">Cook</option>
                    <option value="Cleaner">Cleaner / Janitor</option>
                    <option value="Security Officer">Security Officer</option>
                    <option value="Driver">Driver</option>
                    <option value="Maintenance / Handyman">Maintenance / Janitor</option>
                    <option value="Librarian">Librarian</option>
                    <option value="Lab Assistant">Lab Assistant</option>
                    <option value="School Nurse">School Nurse</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* SHS Department & Multiple Subjects Selection (Core & Elective) */}
              {(formDepartment.toLowerCase().includes('senior') || formDepartment.toLowerCase().includes('shs')) && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>SHS Department Stream & Subject Allocation</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold">
                      {formSubjects.split(',').filter(s => s.trim()).length} Subject(s) Selected
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SHS Programme / Stream
                    </label>
                    <select
                      value={formShsStream}
                      onChange={(e) => setFormShsStream(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="General Science">General Science</option>
                      <option value="General Arts">General Arts</option>
                      <option value="Business">Business</option>
                      <option value="Visual & Performing Arts">Visual & Performing Arts</option>
                      <option value="Home Economics">Home Economics</option>
                    </select>
                  </div>

                  {/* Core Subjects Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        SHS Core Subjects (Multi-select)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const coreList = ['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies', 'Physical Education and Health'];
                          const current = formSubjects.split(',').map(s => s.trim()).filter(Boolean);
                          const merged = Array.from(new Set([...current, ...coreList]));
                          setFormSubjects(merged.join(', '));
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        + Select All Core
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies', 'Physical Education and Health'].map((subj) => {
                        const isSelected = formSubjects.toLowerCase().includes(subj.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={subj}
                            onClick={() => handleToggleFormSubject(subj)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-white text-indigo-600' : 'border border-slate-400'
                            }`}>
                              {isSelected ? '✓' : ''}
                            </span>
                            {subj}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Elective Subjects Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {formShsStream} Elective Subjects (Multi-select)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const electivesMap: Record<string, string[]> = {
                            'General Science': ['Biology', 'Chemistry', 'Physics', 'Elective Mathematics'],
                            'General Arts': ['Economics', 'Geography', 'Government', 'History', 'Literature in English', 'French'],
                            'Business': ['Financial Accounting', 'Cost Accounting', 'Business Management', 'Economics', 'Elective Mathematics'],
                            'Visual & Performing Arts': ['Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music', 'Graphic Design'],
                            'Home Economics': ['Management in Living', 'Food and Nutrition', 'Clothing and Textiles', 'Biology', 'Chemistry']
                          };
                          const electives = electivesMap[formShsStream] || [];
                          const current = formSubjects.split(',').map(s => s.trim()).filter(Boolean);
                          const merged = Array.from(new Set([...current, ...electives]));
                          setFormSubjects(merged.join(', '));
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        + Select All Electives
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {((formShsStream === 'General Science'
                        ? ['Biology', 'Chemistry', 'Physics', 'Elective Mathematics']
                        : formShsStream === 'General Arts'
                        ? ['Economics', 'Geography', 'Government', 'History', 'Literature in English', 'French']
                        : formShsStream === 'Business'
                        ? ['Financial Accounting', 'Cost Accounting', 'Business Management', 'Economics', 'Elective Mathematics']
                        : formShsStream === 'Visual & Performing Arts'
                        ? ['Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music', 'Graphic Design']
                        : ['Management in Living', 'Food and Nutrition', 'Clothing and Textiles', 'Biology', 'Chemistry'])
                      ).map((subj) => {
                        const isSelected = formSubjects.toLowerCase().includes(subj.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={subj}
                            onClick={() => handleToggleFormSubject(subj)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-white text-emerald-600' : 'border border-slate-400'
                            }`}>
                              {isSelected ? '✓' : ''}
                            </span>
                            {subj}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GES / NTC Rank</label>
                  <select
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Senior Superintendent I">Senior Superintendent I</option>
                    <option value="Senior Superintendent II">Senior Superintendent II</option>
                    <option value="Principal Superintendent">Principal Superintendent</option>
                    <option value="Assistant Director II">Assistant Director II</option>
                    <option value="Assistant Director I">Assistant Director I</option>
                    <option value="Director II">Director II</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">the region NTC License Number</label>
                  <input
                    type="text"
                    value={formNtcLicense}
                    onChange={(e) => setFormNtcLicense(e.target.value)}
                    placeholder="NTC/TR/2022/49821"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campus Assignment *</label>
                <select
                  value={formCampus}
                  onChange={(e) => setFormCampus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl bg-indigo-50/10 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="JIPAS 1">JIPAS 1 (Main Campus)</option>
                  <option value="JIPAS 2">JIPAS 2 (Secondary Campus)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Qualification</label>
                  <input
                    type="text"
                    value={formAcademicQual}
                    onChange={(e) => setFormAcademicQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Professional Qualification</label>
                  <input
                    type="text"
                    value={formProfQual}
                    onChange={(e) => setFormProfQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0241234567"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Contact Tel</label>
                  <input
                    type="text"
                    value={formEmergencyContact}
                    onChange={(e) => setFormEmergencyContact(e.target.value)}
                    placeholder="0244123456"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="teacher@jipas.edu.gh"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Staff Blood Group</label>
                  <select
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nationality <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formNationality}
                    onChange={(e) => setFormNationality(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl bg-white font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Ghanaian">Ghanaian</option>
                    <option value="Togolese">Togolese</option>
                    <option value="Nigerian">Nigerian</option>
                    <option value="Beninese">Beninese</option>
                    <option value="Ivorian">Ivorian</option>
                    <option value="Burkinabe">Burkinabe</option>
                    <option value="Other / International">Other / International</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Probation / Status</label>
                  <select
                    value={formProbationStatus || 'Probation'}
                    onChange={(e) => setFormProbationStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="Probation">On Probation (3-6 Months)</option>
                    <option value="Confirmed">Confirmed / Permanent Staff</option>
                    <option value="Contract">Contract Faculty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Classes Taught (comma separated)</label>
                  <input
                    type="text"
                    value={formClasses}
                    onChange={(e) => setFormClasses(e.target.value)}
                    placeholder="Basic 1, Basic 2"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subjects Taught (comma separated)</label>
                  <input
                    type="text"
                    value={formSubjects}
                    onChange={(e) => setFormSubjects(e.target.value)}
                    placeholder="Mathematics, Science"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTeacherModal(false);
                    setEditingTeacher(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm cursor-pointer transition-colors"
                >
                  {editingTeacher ? 'Update Teacher Record' : 'Save Teacher Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUERY TEACHER MODAL */}
      {queryingTeacher && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setQueryingTeacher(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-50 border-b border-slate-100 p-4 sm:p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Query Faculty Member
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Send an official query or warning to {queryingTeacher.name}
                </p>
              </div>
              <button 
                onClick={() => setQueryingTeacher(null)}
                className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 text-sm font-medium">
              {queryToast && (
                <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Query dispatched successfully and logged to staff file!
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Severity Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Notice', 'Warning', 'Query'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setQuerySeverity(lvl)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                        querySeverity === lvl 
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Query Details</label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
                  rows={4}
                  placeholder={`Detail the specific issue regarding ${queryingTeacher.name}...`}
                  value={queryMessage}
                  onChange={(e) => setQueryMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setQueryingTeacher(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!queryMessage.trim()) return;
                    const queryNote: NotificationItem = {
                      id: `notif-${Date.now()}`,
                      title: `Official ${querySeverity}`,
                      message: queryMessage,
                      date: new Date().toISOString(),
                      type: 'system',
                      read: false,
                      targetRole: 'Teacher',
                      targetUserId: queryingTeacher.id
                    };
                    try {
                      await saveNotification(queryNote);
                      setQueryToast(true);
                      setTimeout(() => {
                        setQueryToast(false);
                        setQueryingTeacher(null);
                      }, 2000);
                    } catch (e) {
                      console.error('Failed to send query:', e);
                    }
                  }}
                  disabled={!queryMessage.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Dispatch Query
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE TEACHER MODAL */}
      {deletingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Faculty Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deletingTeacher.name}</strong> from the faculty directory?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingTeacher(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Yes, Remove Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ASSIGNMENT MODAL (MULTIPLE SUBJECT SELECTION ENABLED) */}
      {(showAddAssignModal || editingAssign) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-5 my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  {editingAssign ? 'Edit Teacher Allocation' : 'Teacher Assignment (Multiple Subjects)'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a faculty member, choose the assigned class, and check all applicable teaching subjects.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddAssignModal(false);
                  setEditingAssign(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Teacher & Class Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Faculty Teacher *</label>
                  <select
                    value={assignTeacherId}
                    onChange={(e) => setAssignTeacherId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {teachersList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.designation} ({t.rank})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teaching Role Type *</label>
                  <select
                    value={assignRoleType}
                    onChange={(e) => setAssignRoleType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 shadow-2xs"
                  >
                    <option value="Subject Teacher">Subject Teacher (Specialist)</option>
                    <option value="Class Teacher">Class Teacher / Form Master</option>
                    <option value="Assistant">Assistant Teacher</option>
                  </select>
                </div>
              </div>

              {/* MULTIPLE CLASS / FORM SELECTION SECTION */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <label className="block font-black text-slate-900 text-sm">
                      Class / Form Allocated (Multiple Selection) *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select one or multiple classes/forms this teacher will instruct.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-purple-600 text-white rounded-full text-xs font-mono font-bold shadow-2xs">
                      {assignClasses.length} Selected
                    </span>
                    {assignClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllClasses}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Classes Badges Preview */}
                {assignClasses.length > 0 ? (
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {assignClasses.map((cls, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      >
                        <Check className="w-3 h-3 text-purple-600" />
                        {cls}
                        <button
                          type="button"
                          onClick={() => toggleClassSelection(cls)}
                          className="text-purple-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    No classes selected. Please check at least one class or form below.
                  </div>
                )}

                {/* Department Filter Pills */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5 pt-1">
                  {[
                    { id: 'All', label: 'All Classes' },
                    { id: 'Pre-School & Primary', label: 'Basic 1 - 6 / Pre-School' },
                    { id: 'Junior High (JHS)', label: 'Junior High (JHS 1 - 3)' },
                    { id: 'Senior High (SHS)', label: 'Senior High School (SHS)' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAssignClassDeptFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        assignClassDeptFilter === tab.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* IF SHS DEPARTMENT IS SELECTED: SHOW SHS COURSE / PROGRAMME SELECTOR */}
                {(assignClassDeptFilter === 'Senior High (SHS)' || assignClassDeptFilter === 'All') && (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        SHS Course / Programme Selector
                      </label>
                      <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                        Choose Programme Streams
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {INITIAL_SHS_COURSES.map(course => {
                        const isSelected = selectedShsCourse === course.name;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => setSelectedShsCourse(course.name)}
                            className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs'
                                : 'bg-white text-slate-800 border-indigo-200 hover:bg-indigo-100/50'
                            }`}
                          >
                            <div className="font-bold text-[11px] truncate">{course.name}</div>
                            <div className={`text-[9px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {course.code} • 3 Forms
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Class Checkboxes Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-44 overflow-y-auto">
                  {(() => {
                    let displayClasses: string[] = [];

                    if (assignClassDeptFilter === 'Pre-School & Primary') {
                      displayClasses = ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
                    } else if (assignClassDeptFilter === 'Junior High (JHS)') {
                      displayClasses = ['JHS 1', 'JHS 2', 'JHS 3'];
                    } else if (assignClassDeptFilter === 'Senior High (SHS)') {
                      const courseObj = INITIAL_SHS_COURSES.find(c => c.name === selectedShsCourse) || INITIAL_SHS_COURSES[0];
                      const courseStreamClasses = courseObj.classesGenerated || [`${courseObj.name} 1`, `${courseObj.name} 2`, `${courseObj.name} 3`];
                      displayClasses = [
                        ...courseStreamClasses,
                        `SHS 1 (${courseObj.name})`,
                        `SHS 2 (${courseObj.name})`,
                        `SHS 3 (${courseObj.name})`,
                        'SHS 1', 'SHS 2', 'SHS 3'
                      ];
                    } else {
                      const shsObj = INITIAL_SHS_COURSES.find(c => c.name === selectedShsCourse) || INITIAL_SHS_COURSES[0];
                      displayClasses = [
                        'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6',
                        'JHS 1', 'JHS 2', 'JHS 3',
                        `SHS 1 (${shsObj.name})`, `SHS 2 (${shsObj.name})`, `SHS 3 (${shsObj.name})`,
                        ...AVAILABLE_CLASSES_LIST
                      ];
                    }

                    const uniqueDisplay = Array.from(new Set(displayClasses));

                    return uniqueDisplay.map(cls => {
                      const isChecked = assignClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClassSelection(cls)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 font-medium'
                          }`}
                        >
                          <span className="text-xs truncate">{cls}</span>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Role Type & Quick Packages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teaching Role Type *</label>
                  <select
                    value={assignRoleType}
                    onChange={(e) => setAssignRoleType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 shadow-2xs"
                  >
                    <option value="Subject Teacher">Subject Teacher (Specialist)</option>
                    <option value="Class Teacher">Class Teacher / Form Master</option>
                    <option value="Assistant">Assistant Teacher</option>
                  </select>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCore}
                    className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> All Core Subjects
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectClassTeacherPackage}
                    className="flex-1 py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold border border-purple-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                  >
                    <Award className="w-3.5 h-3.5" /> Class Teacher Set
                  </button>
                </div>
              </div>

              {/* MULTIPLE SUBJECTS SELECTION SECTION */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <label className="block font-black text-slate-900 text-sm">
                      Select Subjects (Multiple Selection)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Check each subject this teacher will instruct for <strong>{assignClass}</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-full text-xs font-mono font-bold shadow-2xs">
                      {assignSubjects.length} Selected
                    </span>
                    {assignSubjects.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllSubjects}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Subjects Badges Preview */}
                {assignSubjects.length > 0 ? (
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {assignSubjects.map((sub, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      >
                        <Check className="w-3 h-3 text-indigo-600" />
                        {sub}
                        <button
                          type="button"
                          onClick={() => toggleSubjectSelection(sub)}
                          className="text-indigo-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    No subjects selected yet. Please click on the subject cards below to assign subjects.
                  </div>
                )}

                {/* Subject Search and Category Filter Tabs */}
                <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['All', 'Core Subjects', 'Electives & Vocational', 'Languages', 'Early Childhood & Pre-School'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSubjectCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          subjectCategoryFilter === cat
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {cat === 'All' ? 'All Categories' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Search in Subjects */}
                  <div className="relative min-w-[160px] flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={subjectSearchQuery}
                      onChange={(e) => setSubjectSearchQuery(e.target.value)}
                      placeholder="Filter subjects..."
                      className="w-full pl-8 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px]"
                    />
                  </div>
                </div>

                {/* Subject Selection Grid */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {displayedCategories.map((catGroup) => {
                    const filteredGroupSubjects = catGroup.subjects.filter(s =>
                      s.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                    );

                    if (filteredGroupSubjects.length === 0) return null;

                    return (
                      <div key={catGroup.category} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">
                          <span>{catGroup.category}</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllCategory(filteredGroupSubjects)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer lowercase"
                          >
                            + select all {filteredGroupSubjects.length}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredGroupSubjects.map((sub) => {
                            const isSelected = assignSubjects.includes(sub);
                            return (
                              <div
                                key={sub}
                                onClick={() => toggleSubjectSelection(sub)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer select-none transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="text-xs truncate">{sub}</span>
                                </div>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                  isSelected ? 'bg-indigo-200/60 text-indigo-900' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {catGroup.category.split(' ')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Subject Adder */}
                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubject();
                      }
                    }}
                    placeholder="Add custom subject (e.g. Robotics, Music Theory, E-Maths)..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    + Add Custom
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAssignModal(false);
                    setEditingAssign(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubjects.length === 0}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                    assignSubjects.length === 0 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {editingAssign 
                    ? `Update Allocation (${assignSubjects.length} Subjects)` 
                    : `Save Allocation (${assignSubjects.length} Subjects)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Teacher CSV Import Modal */}
      <BulkTeacherUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={(count) => {
          setShowBulkUploadModal(false);
        }}
        onAddTeacher={onAddTeacher}
      />

      {/* ISO/IEC 7810 ID-1 Card Generator Tool */}
      <IDCardToolModal
        isOpen={!!selectedIDCardRecord}
        onClose={() => setSelectedIDCardRecord(null)}
        record={selectedIDCardRecord}
      />

      {/* Staff Letter Generator Modal (Employment & Post-Probation Acceptance) */}
      {letterModalStaff && (
        <StaffLetterGeneratorModal
          isOpen={!!letterModalStaff}
          onClose={() => setLetterModalStaff(null)}
          staff={letterModalStaff}
          initialType={letterModalType}
        />
      )}

      {/* CEO Digital Signature Upload Modal */}
      {showCeoSigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-800">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Headmaster / CEO Digital Signature</h3>
                  <p className="text-xs text-slate-500">Upload signature image for official appointment letters.</p>
                </div>
              </div>
              <button onClick={() => setShowCeoSigModal(false)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 flex flex-col items-center justify-center space-y-3">
                {ceoSigPreview ? (
                  <div className="space-y-2">
                    <img src={ceoSigPreview} alt="CEO Signature" className="h-16 max-w-[200px] object-contain mx-auto border bg-white p-2 rounded-xl shadow-xs" />
                    <span className="text-[10px] text-emerald-600 font-bold block">Signature Active & Ready for Letters</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="font-bold text-slate-700">Upload signature PNG or JPEG image</span>
                    <span className="text-[10px] text-slate-400 block">Transparent background recommended</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const res = ev.target?.result as string;
                        if (res) {
                          setCeoSigPreview(res);
                          localStorage.setItem('jipas_ceo_signature', res);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {ceoSigPreview && (
                <button
                  onClick={() => {
                    setCeoSigPreview('');
                    localStorage.removeItem('jipas_ceo_signature');
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs"
                >
                  Remove Signature
                </button>
              )}
              <button
                onClick={() => setShowCeoSigModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
