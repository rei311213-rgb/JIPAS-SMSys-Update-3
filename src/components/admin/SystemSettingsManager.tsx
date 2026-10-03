import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Building, Users, ShieldCheck, KeyRound, Plus, Pencil, Trash2, 
  Save, CheckCircle2, Lock, Unlock, RefreshCw, Eye, EyeOff, Search,
  Sliders, UserPlus, Phone, Mail, Award, AlertTriangle, Upload, Image as ImageIcon,
  RotateCcw, Sparkles, Check, X, UserCheck, UserX, Clock, ShieldAlert, GraduationCap, Briefcase,
  Copy, Key, School, Settings, DollarSign, Bell, Shield, MapPin, Quote, Building2, Palette, Crop,
  Crown, BookOpen, Layers, CheckSquare, Printer, QrCode as QrCodeIcon, Smartphone, Download
} from 'lucide-react';
import { 
  SystemSettingsConfig, UserAccountItem, ThemePaletteConfig, StaffWorkingHoursConfig, 
  Department, HeadteacherPrivilegesConfig, HodPrivilegesConfig, StaffLoginUpdateRequest, Teacher,
  ThermalPrinterSettingsConfig
} from '../../types';
import JIPASLogo, { 
  getSchoolLogo, 
  setSchoolLogo, 
  resetSchoolLogo,
  getLaptopLogo,
  getMobileLogo,
  getThisDeviceLogo,
  setLaptopLogo,
  setMobileLogo,
  setThisDeviceLogo,
  isMobileDevice
} from '../common/JIPASLogo';
import ThemePaletteManager from './ThemePaletteManager';
import ImageCropperModal from '../common/ImageCropperModal';
import { useI18n } from '../../i18n/I18nContext';
import { getStoredClasses, getStoredThermalPrinterSettings, saveStoredThermalPrinterSettings, getStoredStudents } from '../../services/storageService';
import { 
  subscribeUsers, 
  saveUserAccount, 
  adminCreateUserAccount,
  approveUserAccount, 
  rejectUserAccount, 
  deleteUserAccount,
  getStoredUsers,
  getStoredTeachers,
  subscribeTeachers,
  subscribeSettings,
  saveSettings,
  getStoredSettings,
  getStoredDepartments,
  subscribeDepartments,
  getStoredStaffLoginUpdateRequests,
  subscribeStaffLoginUpdateRequests,
  approveStaffLoginUpdateRequest,
  rejectStaffLoginUpdateRequest,
  clearDemoData
} from '../../services/dbService';

interface SystemSettingsManagerProps {
  activeModule: string;
  onNavigate?: (module: string) => void;
  themePalette?: ThemePaletteConfig;
  onUpdateThemePalette?: (palette: ThemePaletteConfig) => void;
  onLoginAsUser?: (user: UserAccountItem) => void;
  onClearAllData?: () => void;
}

export const INITIAL_SYSTEM_SETTINGS: SystemSettingsConfig = {
  schoolName: 'JIPAS',
  schoolMotto: 'Excellence in Knowledge and Character',
  address: '01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo',
  email: 'joyjipas2002@gmail.com',
  phone: '(00228) 22 60 21 38',
  altPhone: '99 47 38 23 / 90 83 60 48',
  activeAcademicYear: '2026-2027',
  activeTerm: 'First Term',
  nextTermBegins: '2026-09-15',
  smsSenderId: 'JIPAS',
  currencySymbol: 'CFA',
  enableStudentPortal: true,
  enableFeeReceiptPrinting: true,
  allowReportDownload: true,
  autoPromotePassingScore: 50,
  enableIncompleteReminders: true,
  reminderFrequency: 'Weekly',
  notifyParentsForMissingGrades: true,
  missingGradeThreshold: 1,
  workingHours: {
    startTime: '07:30',
    latenessCutoff: '08:00',
    closingTime: '15:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 5
  }
};

export const INITIAL_USER_ACCOUNTS: UserAccountItem[] = [];

export default function SystemSettingsManager({ 
  activeModule, 
  onNavigate,
  themePalette,
  onUpdateThemePalette,
  onLoginAsUser,
  onClearAllData
}: SystemSettingsManagerProps) {
  const { t, language } = useI18n();
  const [settings, setSettings] = useState<SystemSettingsConfig>(() => ({
    ...INITIAL_SYSTEM_SETTINGS,
    ...getStoredSettings()
  }));
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // System Reset & Factory Clear Data State
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [clearProgressPercent, setClearProgressPercent] = useState(0);
  const [clearCurrentStep, setClearCurrentStep] = useState('');

  // School Attendance Station QR Code State
  const [stationQrUrl, setStationQrUrl] = useState<string>('');
  const [stationTitle, setStationTitle] = useState<string>('JIPAS MAIN OFFICE ATTENDANCE STATION');
  const [stationNonce, setStationNonce] = useState<number>(Date.now());

  useEffect(() => {
    const stationPayload = JSON.stringify({
      type: 'JIPAS_OFFICE_ATTENDANCE_STATION',
      stationId: 'JIPAS-MAIN-OFFICE-STATION-01',
      date: new Date().toISOString().split('T')[0],
      school: settings.schoolName || 'JIPAS ACADEMY',
      stationTitle: stationTitle,
      nonce: stationNonce,
      timestamp: Date.now()
    });

    QRCode.toDataURL(stationPayload, { 
      width: 450, 
      margin: 2, 
      color: { 
        dark: '#2563eb', // Blue-600
        light: '#ffffff' 
      } 
    })
      .then(url => setStationQrUrl(url))
      .catch(err => console.error('Error generating station QR code:', err));
  }, [settings.schoolName, stationTitle, stationNonce]);

  const handlePrintStationPoster = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${settings.schoolName || 'JIPAS ACADEMY'} - Attendance Station Poster</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; margin: 0; background: #ffffff; color: #0f172a; }
            .poster-box { border: 8px solid #2563eb; padding: 40px; border-radius: 32px; max-width: 650px; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
            .logo-title { font-size: 32px; font-weight: 900; margin: 0 0 8px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .sub-title { font-size: 18px; color: #2563eb; margin: 0 0 24px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .qr-wrapper { background: #ffffff; border: 4px solid #2563eb; padding: 20px; border-radius: 24px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            .qr-img { width: 340px; height: 340px; display: block; border-radius: 12px; }
            .qr-brand { font-size: 24px; font-weight: 900; color: #2563eb; margin-top: 10px; letter-spacing: 2px; }
            .instructions { font-size: 14px; font-weight: 700; color: #334155; line-height: 1.6; margin-top: 28px; text-align: left; background: #f8fafc; padding: 24px; border-radius: 20px; border: 2px solid #e2e8f0; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; font-weight: 700; border-top: 2px border-dashed #cbd5e1; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="poster-box">
            <div class="logo-title">${settings.schoolName || 'JIPAS ACADEMY'}</div>
            <div class="sub-title">OFFICIAL STAFF ATTENDANCE SCANNING STATION</div>
            <p style="font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 20px;">Station Location: ${stationTitle}</p>
            
            <div class="qr-wrapper">
              ${stationQrUrl ? `<img src="${stationQrUrl}" class="qr-img" />` : ''}
              <div class="qr-brand">JIPAS</div>
            </div>

            <div class="instructions">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 900; color: #2563eb;">📷 FACULTY & STAFF SIGN-IN INSTRUCTIONS:</p>
              1. Open your smartphone camera or JIPAS Staff Portal.<br/>
              2. Point your camera lens at this station QR Code.<br/>
              3. Your arrival / departure time is recorded instantly into the institutional audit log.
            </div>

            <div class="footer">
              Generated by JIPAS Management System • ${new Date().toLocaleDateString()}
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleConfirmClearAllData = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsClearingData(true);
    setClearProgressPercent(0);
    setClearCurrentStep('Initializing database purge...');
    try {
      await clearDemoData((pct, col) => {
        setClearProgressPercent(pct);
        setClearCurrentStep(`Purging collection: ${col}`);
      });
      if (onClearAllData) {
        onClearAllData();
      }
      setTimeout(() => {
        setIsClearingData(false);
        setShowClearDataModal(false);
        setDeleteConfirmText('');
        setClearProgressPercent(0);
        alert("All records, students, enrollment data, bills, payments, teacher logs, and reports have been permanently reset to zero data.");
      }, 500);
    } catch (err) {
      console.error('Failed to reset system data:', err);
      alert("Failed to reset system data. Please check your network connection.");
      setIsClearingData(false);
    }
  };
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'palette'>('profile');

  // Users & Roles state
  const [users, setUsers] = useState<UserAccountItem[]>(() => getStoredUsers());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getStoredTeachers());
  const [departments, setDepartments] = useState<Department[]>(() => getStoredDepartments());
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'Active' | 'Pending' | 'Inactive'>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccountItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccountItem | null>(null);
  const [actionFeedbackToast, setActionFeedbackToast] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // New/Edit User Form State
  const [userFormLastName, setUserFormLastName] = useState('');
  const [userFormOtherNames, setUserFormOtherNames] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormRole, setUserFormRole] = useState<'admin' | 'sub_admin' | 'teacher' | 'accountant' | 'clerk' | 'student' | 'ceo' | 'director' | 'headteacher' | 'hod'>('teacher');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormDepartment, setUserFormDepartment] = useState('Primary School');
  const [userFormClass, setUserFormClass] = useState('Basic 1');
  const [userFormCampus, setUserFormCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');
  const [userFormPassword, setUserFormPassword] = useState('Password123');
  const [userFormLeadershipTitle, setUserFormLeadershipTitle] = useState('');
  const [userFormAssignedDepartments, setUserFormAssignedDepartments] = useState<string[]>([]);
  const [userFormHeadteacherPrivileges, setUserFormHeadteacherPrivileges] = useState<HeadteacherPrivilegesConfig>({
    canEndorseTerminalReports: true,
    canSuperviseTeachers: true,
    canManageSectionClasses: true,
    canViewStudentTranscripts: true,
    canPublishSectionBroadcasts: true,
    canManageAttendanceOversight: true
  });
  const [userFormHodPrivileges, setUserFormHodPrivileges] = useState<HodPrivilegesConfig>({
    canManageCurriculum: true,
    canSuperviseDeptTeachers: true,
    canEndorseSubjectGrades: true,
    canReviewAssessmentSheets: true,
    canPublishDeptNotices: true,
    canViewDeptAnalytics: true
  });
  const [userFormPrivilege, setUserFormPrivilege] = useState<'read' | 'read_write'>('read_write');
  const [userFormAllowedModules, setUserFormAllowedModules] = useState<string[]>([
    'dashboard', 'setup_management', 'system_settings', 'teachers', 'students', 'exams', 'fees', 'notif_send', 'logs_user'
  ]);

  // Staff Login Update Requests & Approval State
  const [staffLoginRequests, setStaffLoginRequests] = useState<StaffLoginUpdateRequest[]>(() => getStoredStaffLoginUpdateRequests());
  const [selectedStaffRequest, setSelectedStaffRequest] = useState<StaffLoginUpdateRequest | null>(null);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<StaffLoginUpdateRequest | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [staffRequestFilter, setStaffRequestFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  // RBAC Roles & Permissions Management State
  const [userMgmtTab, setUserMgmtTab] = useState<'users' | 'roles' | 'staff_updates'>('users');
  const [rbacRoles, setRbacRoles] = useState([
    {
      id: 'role-headteacher',
      name: 'Headteacher / Section Head',
      description: 'Senior academic and section administrator with student transcript oversight, terminal report endorsement, and teacher supervision.',
      modules: {
        setup_management: 'read_write',
        system_settings: 'read',
        teachers: 'read_write',
        students: 'read_write',
        exams: 'read_write',
        fees: 'read',
        notif_send: 'read_write',
        logs_user: 'read'
      }
    },
    {
      id: 'role-hod',
      name: 'Head of Department (HOD)',
      description: 'Academic subject leadership, curriculum monitoring, faculty supervision, and grade endorsements within their assigned department.',
      modules: {
        setup_management: 'read',
        system_settings: 'none',
        teachers: 'read_write',
        students: 'read_write',
        exams: 'read_write',
        fees: 'none',
        notif_send: 'read_write',
        logs_user: 'none'
      }
    },
    {
      id: 'role-sub-admin-academic',
      name: 'Sub-Admin (Academic Supervisor)',
      description: 'Manages classes, subjects, teacher assignments, and exam grading.',
      modules: {
        setup_management: 'read_write',
        system_settings: 'read',
        teachers: 'read_write',
        students: 'read_write',
        exams: 'read_write',
        fees: 'read',
        notif_send: 'read_write',
        logs_user: 'read'
      }
    },
    {
      id: 'role-sub-admin-finance',
      name: 'Sub-Admin (Financial Bursar)',
      description: 'Manages student fee billing, fee collection, payments, and financial statements.',
      modules: {
        setup_management: 'read',
        system_settings: 'read',
        teachers: 'read',
        students: 'read',
        exams: 'read',
        fees: 'read_write',
        notif_send: 'read_write',
        logs_user: 'read'
      }
    },
    {
      id: 'role-teacher-lead',
      name: 'Senior Teacher / Faculty Lead',
      description: 'Enters exam scores, views student transcripts, and takes attendance.',
      modules: {
        setup_management: 'none',
        system_settings: 'none',
        teachers: 'read',
        students: 'read',
        exams: 'read_write',
        fees: 'none',
        notif_send: 'read',
        logs_user: 'none'
      }
    }
  ]);
  const [selectedRbacRoleIdx, setSelectedRbacRoleIdx] = useState(0);
  const [rbacSuccessToast, setRbacSuccessToast] = useState(false);

  // Student Portal Control state
  const [portalControls, setPortalControls] = useState({
    portalOnline: true,
    viewTerminalReports: true,
    downloadReportPdf: true,
    viewFeeStatements: true,
    allowOnlineFeePayments: true,
    requireFirstLoginPasswordChange: false,
    lockArrearsAbove: 500,
    lockStudentsInArrears: false,
    showAttendanceSummary: true,
    showTimetable: true
  });
  const [portalToast, setPortalToast] = useState(false);

  // Manage Portal Logins state
  const [portalLoginSearch, setPortalLoginSearch] = useState('');
  const [portalLogins, setPortalLogins] = useState(() => {
    const students = getStoredStudents();
    if (students && students.length > 0) {
      return students.map((s, idx) => ({
        id: s.id || `pl-${idx + 1}`,
        name: s.fullName || s.name || '',
        admissionNo: s.admissionNo || '',
        className: s.className || '',
        role: 'Student',
        username: s.admissionNo || `user_${idx + 1}`,
        passPin: (s.admissionNo || '26001').replace(/[^0-9]/g, '').slice(-4) || '26001',
        status: 'Active',
        lastAccess: 'Never'
      }));
    }
    return [];
  });
  const [resetPinModal, setResetPinModal] = useState<{ id: string; name: string; username: string } | null>(null);
  const [newGeneratedPin, setNewGeneratedPin] = useState('');
  const [manageLoginsTab, setManageLoginsTab] = useState<'students' | 'staff'>('students');
  const [selectedPortalLoginClass, setSelectedPortalLoginClass] = useState<string>('All');

  // Multi-Device Crest & Logo customization state
  const [currentSchoolLogo, setCurrentSchoolLogo] = useState<string>(getSchoolLogo());
  const [currentLaptopLogo, setCurrentLaptopLogo] = useState<string>(getLaptopLogo());
  const [currentMobileLogo, setCurrentMobileLogo] = useState<string>(getMobileLogo());
  const [currentThisDeviceLogo, setCurrentThisDeviceLogo] = useState<string>(getThisDeviceLogo());
  const [targetDeviceForLogo, setTargetDeviceForLogo] = useState<'laptop' | 'mobile' | 'this_device' | 'global'>('laptop');
  const [logoInputUrl, setLogoInputUrl] = useState('');
  const [logoSuccessToast, setLogoSuccessToast] = useState(false);
  const [isLogoCropperOpen, setIsLogoCropperOpen] = useState(false);
  const [logoToCrop, setLogoToCrop] = useState('');

  // Dedicated Account Requests state
  const [accountReqSearch, setAccountReqSearch] = useState('');
  const [accountReqFilter, setAccountReqFilter] = useState<'all' | 'faculty' | 'student'>('all');

  // Staff Working Periods state
  const [workingHoursForm, setWorkingHoursForm] = useState<StaffWorkingHoursConfig>(
    settings.workingHours || {
      startTime: '07:30',
      latenessCutoff: '08:00',
      closingTime: '15:30',
      gracePeriodMinutes: 10,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    }
  );

  // Thermal Printer & Receipt Customization state
  const [thermalSettings, setThermalSettings] = useState<ThermalPrinterSettingsConfig>(getStoredThermalPrinterSettings());
  const [thermalToast, setThermalToast] = useState(false);

  const handleSaveThermalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredThermalPrinterSettings(thermalSettings);
    setThermalToast(true);
    setTimeout(() => setThermalToast(false), 3500);
  };

  useEffect(() => {
    if (settings.workingHours) {
      setWorkingHoursForm(settings.workingHours);
    }
  }, [settings.workingHours]);

  // Live real-time database subscriptions
  useEffect(() => {
    setCurrentSchoolLogo(getSchoolLogo());

    const unsubUsers = subscribeUsers((loadedUsers) => {
      setUsers(loadedUsers);
    });

    const unsubSettings = subscribeSettings((loadedSettings) => {
      if (loadedSettings) {
        setSettings(prev => ({
          ...prev,
          schoolName: loadedSettings.schoolName || prev.schoolName,
          schoolMotto: loadedSettings.schoolMotto || prev.schoolMotto,
          phone: loadedSettings.phone || prev.phone,
          email: loadedSettings.email || prev.email,
          address: loadedSettings.address || prev.address,
          activeAcademicYear: loadedSettings.activeAcademicYear || prev.activeAcademicYear,
          activeTerm: loadedSettings.activeTerm || prev.activeTerm,
          enableIncompleteReminders: loadedSettings.enableIncompleteReminders !== undefined ? loadedSettings.enableIncompleteReminders : prev.enableIncompleteReminders,
          reminderFrequency: loadedSettings.reminderFrequency || prev.reminderFrequency,
          notifyParentsForMissingGrades: loadedSettings.notifyParentsForMissingGrades !== undefined ? loadedSettings.notifyParentsForMissingGrades : prev.notifyParentsForMissingGrades,
          missingGradeThreshold: loadedSettings.missingGradeThreshold !== undefined ? loadedSettings.missingGradeThreshold : prev.missingGradeThreshold,
          workingHours: loadedSettings.workingHours || prev.workingHours || INITIAL_SYSTEM_SETTINGS.workingHours
        }));

        if (loadedSettings.laptopLogo) {
          setCurrentLaptopLogo(loadedSettings.laptopLogo);
        }
        if (loadedSettings.mobileLogo) {
          setCurrentMobileLogo(loadedSettings.mobileLogo);
        }
        setCurrentSchoolLogo(getSchoolLogo());
      }
    });

    const unsubDepartments = subscribeDepartments((loadedDepts) => {
      if (loadedDepts && loadedDepts.length > 0) {
        setDepartments(loadedDepts);
      }
    });

    const unsubTeachers = subscribeTeachers((loadedTeachers) => {
      if (loadedTeachers) {
        setTeachers(loadedTeachers);
      }
    });

    const unsubStaffRequests = subscribeStaffLoginUpdateRequests((loadedRequests) => {
      if (loadedRequests) {
        setStaffLoginRequests(loadedRequests);
      }
    });

    return () => {
      unsubUsers();
      unsubSettings();
      unsubDepartments();
      unsubTeachers();
      unsubStaffRequests();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setActionFeedbackToast(msg);
    setTimeout(() => setActionFeedbackToast(''), 4500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    // Use lightweight object URL for initial cropping phase
    const objectUrl = URL.createObjectURL(file);
    setLogoToCrop(objectUrl);
    setIsLogoCropperOpen(true);
    
    // Reset value so user can pick the same file again if desired
    e.target.value = '';
  };

  const handleFileUploadFor = (e: React.ChangeEvent<HTMLInputElement>, target: 'laptop' | 'mobile' | 'this_device' | 'global') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    setTargetDeviceForLogo(target);
    const objectUrl = URL.createObjectURL(file);
    setLogoToCrop(objectUrl);
    setIsLogoCropperOpen(true);
    e.target.value = '';
  };

  const handleApplyLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoInputUrl.trim()) return;
    setLogoToCrop(logoInputUrl.trim());
    setIsLogoCropperOpen(true);
    setLogoInputUrl('');
  };

  const handleOpenLogoCropper = () => {
    if (currentSchoolLogo) {
      setLogoToCrop(currentSchoolLogo);
      setIsLogoCropperOpen(true);
    }
  };

  const handleOpenLogoCropperFor = (target: 'laptop' | 'mobile' | 'this_device' | 'global') => {
    setTargetDeviceForLogo(target);
    const src = target === 'laptop' 
      ? currentLaptopLogo 
      : target === 'mobile' 
        ? currentMobileLogo 
        : target === 'this_device' 
          ? (currentThisDeviceLogo || currentSchoolLogo) 
          : currentSchoolLogo;
    if (src) {
      setLogoToCrop(src);
      setIsLogoCropperOpen(true);
    }
  };

  const handleLogoCropComplete = async (croppedUrl: string) => {
    setSchoolLogo(croppedUrl, targetDeviceForLogo);
    if (targetDeviceForLogo === 'laptop') {
      setCurrentLaptopLogo(croppedUrl);
      await saveSettings({ laptopLogo: croppedUrl });
    } else if (targetDeviceForLogo === 'mobile') {
      setCurrentMobileLogo(croppedUrl);
      await saveSettings({ mobileLogo: croppedUrl });
    } else if (targetDeviceForLogo === 'this_device') {
      setCurrentThisDeviceLogo(croppedUrl);
    } else {
      await saveSettings({ schoolLogo: croppedUrl });
    }
    setCurrentSchoolLogo(getSchoolLogo());
    setLogoSuccessToast(true);
    setIsLogoCropperOpen(false);
    
    // Cleanup object URL if used
    if (logoToCrop.startsWith('blob:')) {
      URL.revokeObjectURL(logoToCrop);
    }
    setLogoToCrop('');
    setTimeout(() => setLogoSuccessToast(false), 4000);
  };

  const handleResetToDefaultLogo = async () => {
    resetSchoolLogo('all');
    setCurrentLaptopLogo('/logo.png');
    setCurrentMobileLogo('/logo.png');
    setCurrentThisDeviceLogo('');
    setCurrentSchoolLogo('/logo.png');
    await saveSettings({ laptopLogo: '/logo.png', mobileLogo: '/logo.png', schoolLogo: '/logo.png' });
    setLogoSuccessToast(true);
    setTimeout(() => setLogoSuccessToast(false), 4000);
  };

  const handleResetLogoFor = async (target: 'all' | 'laptop' | 'mobile' | 'this_device' | 'global') => {
    resetSchoolLogo(target);
    if (target === 'all' || target === 'laptop') {
      setCurrentLaptopLogo('/logo.png');
      await saveSettings({ laptopLogo: '/logo.png' });
    }
    if (target === 'all' || target === 'mobile') {
      setCurrentMobileLogo('/logo.png');
      await saveSettings({ mobileLogo: '/logo.png' });
    }
    if (target === 'all' || target === 'this_device') {
      setCurrentThisDeviceLogo('');
    }
    if (target === 'all' || target === 'global') {
      await saveSettings({ schoolLogo: '/logo.png' });
    }
    setCurrentSchoolLogo(getSchoolLogo());
    setLogoSuccessToast(true);
    setTimeout(() => setLogoSuccessToast(false), 4000);
  };

  // Handle Save General System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings({
        schoolName: settings.schoolName,
        schoolMotto: settings.schoolMotto,
        schoolLogo: currentSchoolLogo,
        laptopLogo: currentLaptopLogo,
        mobileLogo: currentMobileLogo,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        activeAcademicYear: settings.activeAcademicYear,
        activeTerm: settings.activeTerm,
        enableIncompleteReminders: settings.enableIncompleteReminders,
        reminderFrequency: settings.reminderFrequency,
        notifyParentsForMissingGrades: settings.notifyParentsForMissingGrades,
        missingGradeThreshold: settings.missingGradeThreshold,
        workingHours: settings.workingHours || INITIAL_SYSTEM_SETTINGS.workingHours
      });
    } catch (err) {
      console.warn('saveSettings fallback:', err);
    }
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3500);
  };

  // Approve a pending user account
  const handleApproveAccount = async (user: UserAccountItem) => {
    try {
      await approveUserAccount(user.id, 'Administrator');
      triggerToast(`Account for "${user.name}" has been approved and activated!`);
    } catch (err) {
      console.error('Approve account error:', err);
      triggerToast(`Error approving account. Please try again.`);
    }
  };

  // Reject a pending user account
  const handleRejectAccount = async (user: UserAccountItem) => {
    if (confirm(`Reject pending registration for ${user.name} (${user.email || user.username})?`)) {
      try {
        await rejectUserAccount(user.id);
        triggerToast(`Registration for "${user.name}" has been rejected.`);
      } catch (err) {
        console.error('Reject account error:', err);
      }
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: UserAccountItem) => {
    setEditingUser(user);
    setUserFormName(user.name);
    const parts = (user.name || '').trim().split(/\s+/);
    setUserFormLastName(parts[0] || '');
    setUserFormOtherNames(parts.slice(1).join(' '));
    setUserFormEmail(user.email);
    setUserFormUsername(user.username);
    setUserFormRole(user.role);
    setUserFormPhone(user.phone || '');
    setUserFormDepartment(user.department || (departments[0]?.name || 'Primary School'));
    setUserFormClass(user.className || 'Basic 1');
    setUserFormPassword('');
    setUserFormLeadershipTitle(user.leadershipTitle || '');
    setUserFormAssignedDepartments(user.assignedDepartments || (user.department ? [user.department] : []));
    if (user.headteacherPrivileges) {
      setUserFormHeadteacherPrivileges(user.headteacherPrivileges);
    } else {
      setUserFormHeadteacherPrivileges({
        canEndorseTerminalReports: true,
        canSuperviseTeachers: true,
        canManageSectionClasses: true,
        canViewStudentTranscripts: true,
        canPublishSectionBroadcasts: true,
        canManageAttendanceOversight: true
      });
    }
    if (user.hodPrivileges) {
      setUserFormHodPrivileges(user.hodPrivileges);
    } else {
      setUserFormHodPrivileges({
        canManageCurriculum: true,
        canSuperviseDeptTeachers: true,
        canEndorseSubjectGrades: true,
        canReviewAssessmentSheets: true,
        canPublishDeptNotices: true,
        canViewDeptAnalytics: true
      });
    }
    setUserFormPrivilege(user.privilege || 'read_write');
    setUserFormAllowedModules(user.allowedModules || [
      'dashboard', 'setup_management', 'system_settings', 'teachers', 'students', 'exams', 'fees', 'notif_send', 'logs_user'
    ]);
  };

  // Execute saving newly created user
  const executeSaveNewUser = async () => {
    setIsSavingUser(true);
    try {
      const finalEmail = userFormEmail.trim();
      const combinedUserName = [userFormLastName.trim(), userFormOtherNames.trim()].filter(Boolean).join(' ') || userFormName.trim();
      const newUser: UserAccountItem = {
        id: `usr-${Date.now()}`,
        name: combinedUserName,
        email: finalEmail || `${userFormUsername}@jipas.edu.gh`,
        username: userFormUsername,
        role: userFormRole,
        phone: userFormPhone,
        status: 'Active',
        isApproved: true,
        lastLogin: 'Never',
        createdAt: new Date().toISOString().split('T')[0],
        registrationType: userFormRole === 'student' ? 'student' : (userFormRole === 'admin' ? 'admin' : 'faculty'),
        department: userFormDepartment,
        className: userFormClass,
        campus: userFormCampus,
        teacherId: selectedEmployeeId || undefined,
        leadershipTitle: userFormLeadershipTitle.trim() || (
          userFormRole === 'headteacher' ? `Headteacher (${userFormDepartment})` :
          userFormRole === 'hod' ? `HOD - ${userFormDepartment}` : undefined
        ),
        assignedDepartments: userFormAssignedDepartments.length > 0 ? userFormAssignedDepartments : (userFormDepartment ? [userFormDepartment] : []),
        headteacherPrivileges: userFormRole === 'headteacher' ? userFormHeadteacherPrivileges : undefined,
        hodPrivileges: userFormRole === 'hod' ? userFormHodPrivileges : undefined,
        privilege: userFormPrivilege,
        allowedModules: userFormAllowedModules
      };
      await adminCreateUserAccount(newUser, userFormPassword);
      setShowAddUserModal(false);
      setSelectedEmployeeId('');
      setEmployeeSearchTerm('');
      triggerToast(`New user account "${combinedUserName}" (${userFormRole.toUpperCase()}) created and activated successfully.`);
    } catch (err: any) {
      console.error('Failed to create user account:', err);
      triggerToast('Error creating user account. Please try again.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Save Add or Edit User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedUserName = [userFormLastName.trim(), userFormOtherNames.trim()].filter(Boolean).join(' ') || userFormName.trim();
    if (!combinedUserName || !userFormUsername.trim()) {
      triggerToast('Please provide a name and username.');
      return;
    }

    if (editingUser) {
      setIsSavingUser(true);
      try {
        const updatedUser: UserAccountItem = {
          ...editingUser,
          name: combinedUserName,
          email: userFormEmail,
          username: userFormUsername,
          role: userFormRole,
          phone: userFormPhone,
          department: userFormDepartment,
          className: userFormClass,
          campus: userFormCampus,
          leadershipTitle: userFormLeadershipTitle.trim() || (
            userFormRole === 'headteacher' ? `Headteacher (${userFormDepartment})` :
            userFormRole === 'hod' ? `HOD - ${userFormDepartment}` : undefined
          ),
          assignedDepartments: userFormAssignedDepartments.length > 0 ? userFormAssignedDepartments : (userFormDepartment ? [userFormDepartment] : []),
          headteacherPrivileges: userFormRole === 'headteacher' ? userFormHeadteacherPrivileges : undefined,
          hodPrivileges: userFormRole === 'hod' ? userFormHodPrivileges : undefined,
          privilege: userFormPrivilege,
          allowedModules: userFormAllowedModules
        };
        await saveUserAccount(updatedUser);
        setEditingUser(null);
        setSelectedEmployeeId('');
        setEmployeeSearchTerm('');
        triggerToast(`User "${combinedUserName}" updated successfully.`);
      } catch (err) {
        console.error('Failed to update user account:', err);
        triggerToast('Error updating user. Please check your connection.');
      } finally {
        setIsSavingUser(false);
      }
      return;
    }

    await executeSaveNewUser();
  };

  // Staff Login Update Request Handlers
  const handleApproveStaffRequest = async (requestId: string) => {
    try {
      await approveStaffLoginUpdateRequest(requestId, 'Administrator');
      triggerToast('Staff login update request approved and credentials updated successfully!');
      setSelectedStaffRequest(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to approve request.');
    }
  };

  const handleRejectStaffRequest = async () => {
    if (!rejectionModalRequest) return;
    try {
      await rejectStaffLoginUpdateRequest(rejectionModalRequest.id, 'Administrator', rejectionFeedback.trim() || 'Declined by Administrator');
      triggerToast('Staff login update request has been rejected.');
      setRejectionModalRequest(null);
      setRejectionFeedback('');
      setSelectedStaffRequest(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to reject request.');
    }
  };

  // Delete User
  const handleConfirmDeleteUser = async () => {
    if (deletingUser) {
      const userToDelete = deletingUser;
      setDeletingUser(null);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      try {
        await deleteUserAccount(userToDelete.id);
        triggerToast(`User "${userToDelete.name}" deleted.`);
      } catch (err: any) {
        console.error('Failed to delete user account:', err);
        triggerToast('Failed to delete user account.');
      }
    }
  };

  // Toggle User Status
  const handleToggleUserStatus = async (user: UserAccountItem) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const updated: UserAccountItem = {
      ...user,
      status: nextStatus
    };
    await saveUserAccount(updated);
    triggerToast(`Status for "${user.name}" changed to ${nextStatus}.`);
  };

  // Toggle Portal Login Lock
  const handleTogglePortalLock = (id: string) => {
    setPortalLogins(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: p.status === 'Active' ? 'Locked' : 'Active' };
      }
      return p;
    }));
  };

  // Reset PIN
  const handlePerformResetPin = (id: string) => {
    const randomPin = Math.floor(10000 + Math.random() * 90000).toString();
    setPortalLogins(prev => prev.map(p => p.id === id ? { ...p, passPin: randomPin } : p));
    setNewGeneratedPin(randomPin);
  };

  // Pending user accounts count
  const pendingUsers = users.filter(u => u.status === 'Pending' || u.isApproved === false);
  const activeUsersCount = users.filter(u => u.status === 'Active' && u.isApproved !== false).length;
  const inactiveUsersCount = users.filter(u => u.status === 'Inactive' || u.status === 'Locked').length;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.phone && u.phone.includes(userSearch)) ||
                          (u.admissionNo && u.admissionNo.toLowerCase().includes(userSearch.toLowerCase()));
    
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    
    let matchesStatus = true;
    if (userStatusFilter === 'Pending') {
      matchesStatus = u.status === 'Pending' || u.isApproved === false;
    } else if (userStatusFilter === 'Active') {
      matchesStatus = u.status === 'Active' && u.isApproved !== false;
    } else if (userStatusFilter === 'Inactive') {
      matchesStatus = u.status === 'Inactive' || u.status === 'Locked';
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered portal logins
  const filteredPortalLogins = portalLogins.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(portalLoginSearch.toLowerCase()) ||
                          p.admissionNo.toLowerCase().includes(portalLoginSearch.toLowerCase()) ||
                          p.className.toLowerCase().includes(portalLoginSearch.toLowerCase());
    const matchesClass = selectedPortalLoginClass === 'All' || p.className === selectedPortalLoginClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* 1A. STAFF WORKING PERIODS MODULE */}
      {(activeModule === 'system_working_periods' || activeModule === 'working_periods') && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1538] via-[#102052] to-[#151C4E] border border-blue-900/50 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/40 text-white shrink-0 border border-blue-400/30">
                  <Clock className="w-7 h-7 sm:w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Staff Working Periods & Attendance Rules
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                    Configure official faculty reporting times, lateness cutoff thresholds, closing hours, grace periods, and active working days governing teacher QR check-ins.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Working Periods Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Faculty Shift & Attendance Windows</h3>
                <p className="text-xs text-slate-500">Defines when staff are expected to arrive, when lateness is flagged, and when shifts end.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await saveSettings({ workingHours: workingHoursForm });
                    triggerToast('Staff working periods and attendance rules saved successfully!');
                  } catch (err) {
                    triggerToast('Failed to save working periods. Please try again.');
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Working Periods
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Start Time */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Reporting / Start Time
                </label>
                <input
                  type="time"
                  value={workingHoursForm.startTime}
                  onChange={(e) => setWorkingHoursForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">Standard faculty arrival time.</p>
              </div>

              {/* Lateness Cutoff */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lateness Cutoff Time
                </label>
                <input
                  type="time"
                  value={workingHoursForm.latenessCutoff}
                  onChange={(e) => setWorkingHoursForm(prev => ({ ...prev, latenessCutoff: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400">Check-ins after this time are marked late.</p>
              </div>

              {/* Closing Time */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Closing / Departure Time
                </label>
                <input
                  type="time"
                  value={workingHoursForm.closingTime}
                  onChange={(e) => setWorkingHoursForm(prev => ({ ...prev, closingTime: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">Standard shift conclusion time.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Grace Period */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={workingHoursForm.gracePeriodMinutes ?? 10}
                  onChange={(e) => setWorkingHoursForm(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">Tolerated arrival delay before lateness penalty.</p>
              </div>

              {/* Working Days */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Working Days
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isSelected = workingHoursForm.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const updatedDays = isSelected
                            ? workingHoursForm.workingDays.filter(d => d !== day)
                            : [...workingHoursForm.workingDays, day];
                          setWorkingHoursForm(prev => ({ ...prev, workingDays: updatedDays }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">Days active for faculty attendance scanning.</p>
              </div>
            </div>

            {/* Action Feedback Toast */}
            {actionFeedbackToast && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionFeedbackToast}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. SYSTEM SETTINGS MODULE */}
      {(activeModule === 'system_settings' || activeModule === 'settings') && (
        <div className="space-y-6">
          {/* TOP HERO BANNER: Radiant Dark Blue Gradient with Neon Illustration */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1538] via-[#102052] to-[#151C4E] border border-blue-900/50 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            {/* Ambient background waves */}
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden">
              <div className="absolute -bottom-10 right-10 w-96 h-48 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute top-0 left-1/3 w-64 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                {/* Glowing Purple-Blue Icon Container */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/40 text-white shrink-0 border border-indigo-400/30">
                  <Settings className="w-7 h-7 sm:w-8 h-8 animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t('settings.title') || (language === 'fr' ? 'Configuration du Système & Profil de l’Institution' : 'System Configuration & Institutional Profile')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                    {t('settings.subtitle') || (language === 'fr' ? 'Gérez les métadonnées de l\'établissement, les paramètres académiques, les identifiants SMS et les règles du portail.' : 'Manage institutional metadata, academic parameters, SMS sender credentials, and system settings.')}
                  </p>
                </div>
              </div>

              {/* Stylized Neon School & Graduation Cap Illustration */}
              <div className="hidden lg:flex items-center justify-center shrink-0 relative w-64 h-32">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl" />
                <svg className="w-full h-full drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" viewBox="0 0 260 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer base building */}
                  <rect x="45" y="52" width="170" height="70" rx="3" fill="#0E1E45" stroke="#3B82F6" strokeWidth="2.5" />
                  {/* Center wing */}
                  <rect x="80" y="32" width="100" height="90" rx="3" fill="#14285D" stroke="#60A5FA" strokeWidth="2.5" />
                  {/* Roof pediment */}
                  <polygon points="130,8 70,32 190,32" fill="#1E3A8A" stroke="#93C5FD" strokeWidth="2.5" />
                  <circle cx="130" cy="22" r="4.5" fill="#60A5FA" />
                  <line x1="130" y1="8" x2="130" y2="2" stroke="#60A5FA" strokeWidth="2" />
                  <polygon points="130,2 140,5 130,8" fill="#38BDF8" />
                  {/* Left wing windows */}
                  <rect x="53" y="60" width="12" height="15" rx="1.5" fill="#60A5FA" fillOpacity="0.5" stroke="#93C5FD" strokeWidth="1.5" />
                  <rect x="53" y="85" width="12" height="15" rx="1.5" fill="#60A5FA" fillOpacity="0.5" stroke="#93C5FD" strokeWidth="1.5" />
                  {/* Center windows upper */}
                  <rect x="90" y="44" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="110" y="44" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="136" y="44" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="156" y="44" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  {/* Center windows lower */}
                  <rect x="90" y="68" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="110" y="68" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="136" y="68" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  <rect x="156" y="68" width="14" height="16" rx="1.5" fill="#93C5FD" fillOpacity="0.6" stroke="#BFDBFE" strokeWidth="1.5" />
                  {/* Right wing windows */}
                  <rect x="195" y="60" width="12" height="15" rx="1.5" fill="#60A5FA" fillOpacity="0.5" stroke="#93C5FD" strokeWidth="1.5" />
                  <rect x="195" y="85" width="12" height="15" rx="1.5" fill="#60A5FA" fillOpacity="0.5" stroke="#93C5FD" strokeWidth="1.5" />
                  {/* Arch doorway */}
                  <path d="M120 122 V98 Q130 92 140 98 V122 Z" fill="#070E22" stroke="#60A5FA" strokeWidth="2" />
                  {/* Base foundation line */}
                  <rect x="35" y="122" width="190" height="4" rx="1" fill="#1E3A8A" stroke="#3B82F6" strokeWidth="1.5" />

                  {/* Floating Graduation Cap */}
                  <g transform="translate(195, 8) scale(0.95)">
                    <polygon points="26,0 52,10 26,20 0,10" fill="#1D4ED8" stroke="#93C5FD" strokeWidth="2" />
                    <path d="M10 14 V24 C10 30 42 30 42 24 V14" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2" />
                    <circle cx="26" cy="10" r="2.5" fill="#FBBF24" />
                    <path d="M26 10 Q38 16 42 26" stroke="#FBBF24" strokeWidth="2" fill="none" />
                    <circle cx="42" cy="27" r="2" fill="#FBBF24" />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {settingsSavedToast && (
            <div className="bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {t('settings.savedToast') || (language === 'fr' ? 'Paramètres du système institutionnel mis à jour avec succès !' : 'Institutional system settings updated successfully!')}
              </span>
              <button onClick={() => setSettingsSavedToast(false)} className="text-emerald-300 hover:text-white font-black ml-4 cursor-pointer">✕</button>
            </div>
          )}

          {/* Sub-Tab Switcher: Profile / Palette */}
          <div className="flex flex-wrap items-center gap-2 border-b border-blue-900/50 pb-3">
            <button
              type="button"
              onClick={() => setSettingsSubTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settingsSubTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('settings.profileTab') || (language === 'fr' ? 'Profil Institutionnel & Paramètres Généraux' : 'Institutional Profile & General Settings')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('palette')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settingsSubTab === 'palette'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Palette className="w-4 h-4 text-amber-400" />
              <span>{t('settings.paletteTab') || (language === 'fr' ? 'Studio de Palette de Couleurs Globale' : 'Global Color Palette Studio')}</span>
              <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded text-[9px] font-black uppercase">
                Theme
              </span>
            </button>
          </div>

          {settingsSubTab === 'palette' ? (
            <ThemePaletteManager 
              currentPalette={themePalette} 
              onPaletteChange={onUpdateThemePalette} 
            />
          ) : (
            /* MAIN FORM: IDENTITÉ & MARQUE DE L'INSTITUTION */
            <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-[#0A122A] border-2 border-blue-900/60 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
              {/* Section Header with Glowing Blue Icon Badge */}
              <div className="flex items-center gap-2.5 pb-4 border-b border-blue-900/60">
                <div className="p-2 bg-blue-900/60 border border-blue-600/60 rounded-xl text-blue-300 shadow-inner">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-widest">
                  {t('settings.identityHeader') || (language === 'fr' ? 'IDENTITÉ & MARQUE DE L’INSTITUTION' : 'INSTITUTION IDENTITY & BRANDING')}
                </h3>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. School Name */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                    {t('settings.schoolName') || (language === 'fr' ? 'Nom de l’école / Nom de l’institution *' : 'School / Institution Name *')}
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-blue-400 absolute left-3.5 shrink-0 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={settings.schoolName}
                      onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                      placeholder="JIPAS"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-sm sm:text-base focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:bg-[#182750] transition-all placeholder:text-slate-400 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 2. School Motto */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                    {t('settings.schoolMotto') || (language === 'fr' ? 'Devise de l’école / Slogan' : 'School Motto / Slogan')}
                  </label>
                  <div className="relative flex items-center">
                    <Quote className="w-4 h-4 text-blue-400 absolute left-3.5 shrink-0 pointer-events-none" />
                    <input
                      type="text"
                      value={settings.schoolMotto}
                      onChange={(e) => setSettings({ ...settings, schoolMotto: e.target.value })}
                      placeholder="Education is Wealth - Foundation for Success"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-sm sm:text-base focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:bg-[#182750] transition-all placeholder:text-slate-400 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 3. Address (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                    {t('settings.address') || (language === 'fr' ? 'Adresse postale officielle et adresse physique' : 'Official Postal & Physical Location Address')}
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-blue-400 absolute left-3.5 shrink-0 pointer-events-none" />
                    <input
                      type="text"
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      placeholder="Accra, the region"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-sm sm:text-base focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:bg-[#182750] transition-all placeholder:text-slate-400 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 4. Official Email */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                    {t('settings.email') || (language === 'fr' ? 'Adresse e-mail officielle' : 'Official Email Address')}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-blue-400 absolute left-3.5 shrink-0 pointer-events-none" />
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="info@jipas.com"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-sm sm:text-base focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:bg-[#182750] transition-all placeholder:text-slate-400 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 5. Primary Phone */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                    {t('settings.phone') || (language === 'fr' ? 'Téléphone principal' : 'Primary Contact Phone')}
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-blue-400 absolute left-3.5 shrink-0 pointer-events-none" />
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="0249755593"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-sm sm:text-base focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 focus:bg-[#182750] transition-all placeholder:text-slate-400 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Quote & Glowing Save Button Action Row */}
              <div className="pt-5 border-t border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Emerald/Cyan Vertical Quote */}
                <div className="border-l-2 border-emerald-400 pl-3.5 py-1">
                  <p className="italic text-xs font-semibold text-slate-200">
                    {t('settings.quote') || (language === 'fr' ? '« Une éducation de qualité aujourd’hui, un meilleur avenir demain. »' : '“Quality education today, a brighter tomorrow.”')}
                  </p>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">— JIPAS</p>
                </div>

                {/* Glowing Bright Blue Save Button */}
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/40 flex items-center gap-2 cursor-pointer transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{t('settings.saveChanges') || (language === 'fr' ? 'Enregistrer les modifications' : 'Save Changes')}</span>
                </button>
              </div>
            </div>

              {/* Multi-Device School Logo & Crest Customizer */}
              <div className="bg-[#0A122A] border-2 border-blue-900/60 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-900/60">
                  <div>
                    <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      {language === 'fr' ? 'Armoiries Officielles Multi-Appareils (Ordinateur Portable & Téléphone)' : 'Multi-Device Official Crest & Logo Customizer (Laptop & Phone)'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'fr' ? 'Configurez deux armoiries distinctes pour vos ordinateurs portables et téléphones mobiles, ou définissez un logo spécifique pour cet appareil.' : 'Configure two separate official crests for laptops and mobile phones, or set a custom crest specifically for this device.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToDefaultLogo}
                      className="px-3 py-1.5 bg-[#131E3D] hover:bg-slate-800 text-slate-300 border border-blue-700/50 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> {language === 'fr' ? 'Tout Réinitialiser' : 'Reset All Crests'}
                    </button>
                  </div>
                </div>

                {logoSuccessToast && (
                  <div className="bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {language === 'fr' ? 'Armoiries de l’établissement mises à jour avec succès pour l’appareil sélectionné !' : 'Institutional crest updated successfully for the selected device!'}
                  </div>
                )}

                {/* Current Device Detection Status Badge */}
                <div className="bg-[#131E3D] p-3.5 rounded-xl border border-blue-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-slate-300 font-semibold">
                      {language === 'fr' ? 'Appareil Actuel Détecté :' : 'Currently Active Device :'}
                    </span>
                    <span className="font-extrabold text-white px-2.5 py-0.5 bg-blue-900/80 border border-blue-600/60 rounded-lg">
                      {isMobileDevice() ? '📱 Phone / Mobile Device' : '💻 Laptop / Desktop Computer'}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-300 font-medium">
                    {language === 'fr' ? 'Les téléphones affichent le logo Mobile, les ordinateurs portables affichent le logo Laptop.' : 'Phones automatically load the Phone Crest; laptops load the Laptop Crest.'}
                  </div>
                </div>

                {/* Dual Device Cards Grid: Laptop vs Phone */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Card 1: Laptop & Desktop Crest */}
                  <div className="bg-[#131E3D] p-5 rounded-2xl border-2 border-blue-800/70 space-y-4 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-800/50">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💻</span>
                        <div>
                          <h5 className="font-bold text-white text-xs sm:text-sm">{language === 'fr' ? 'Armoiries Ordinateur Portable / Bureau' : 'Laptop & Desktop Official Crest'}</h5>
                          <span className="text-[10px] text-slate-400 font-medium">{language === 'fr' ? 'Affiché sur PC, ordinateurs portables et grands écrans' : 'Displayed on PC, Laptops & Large screens'}</span>
                        </div>
                      </div>
                      {currentLaptopLogo !== '/logo.png' && currentLaptopLogo !== '/logo.jpg' && (
                        <button
                          type="button"
                          onClick={() => handleResetLogoFor('laptop')}
                          className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800/60 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                        >
                          {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Laptop Frame Preview */}
                      <div className="p-3 bg-[#0A122A] rounded-2xl border-2 border-blue-700/60 flex items-center justify-center shrink-0 shadow-inner w-24 h-24 sm:w-28 sm:h-28">
                        <img 
                          src={currentLaptopLogo} 
                          alt="Laptop Crest Preview" 
                          className="w-full h-full object-contain filter drop-shadow-xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{language === 'fr' ? 'Aperçu Ordinateur' : 'Laptop Active View'}</div>
                        <p className="text-xs text-slate-300 font-semibold">{settings.schoolName || 'JIPAS Academy'}</p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <label className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer shadow-md shadow-blue-600/30 transition-all">
                            <Upload className="w-3.5 h-3.5" /> {language === 'fr' ? 'Changer (Laptop)' : 'Upload Laptop Crest'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUploadFor(e, 'laptop')}
                              className="hidden"
                            />
                          </label>

                          {currentLaptopLogo && (
                            <button
                              type="button"
                              onClick={() => handleOpenLogoCropperFor('laptop')}
                              className="flex items-center gap-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/60 px-2.5 py-2 rounded-xl font-bold text-[11px] cursor-pointer transition-all"
                            >
                              <Crop className="w-3.5 h-3.5 text-blue-300" />
                              <span>{language === 'fr' ? 'Recadrer' : 'Crop'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Mobile & Phone Crest */}
                  <div className="bg-[#131E3D] p-5 rounded-2xl border-2 border-emerald-800/70 space-y-4 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-800/50">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📱</span>
                        <div>
                          <h5 className="font-bold text-white text-xs sm:text-sm">{language === 'fr' ? 'Armoiries Téléphone / Mobile' : 'Phone & Mobile Official Crest'}</h5>
                          <span className="text-[10px] text-slate-400 font-medium">{language === 'fr' ? 'Affiché sur smartphones, tablettes et l’application mobile' : 'Displayed on Smartphones, Tablets & PWA'}</span>
                        </div>
                      </div>
                      {currentMobileLogo !== '/logo.png' && currentMobileLogo !== '/logo.jpg' && (
                        <button
                          type="button"
                          onClick={() => handleResetLogoFor('mobile')}
                          className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800/60 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                        >
                          {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Phone Frame Preview */}
                      <div className="p-3 bg-[#0A122A] rounded-2xl border-2 border-emerald-700/60 flex items-center justify-center shrink-0 shadow-inner w-24 h-24 sm:w-28 sm:h-28">
                        <img 
                          src={currentMobileLogo} 
                          alt="Phone Crest Preview" 
                          className="w-full h-full object-contain filter drop-shadow-xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{language === 'fr' ? 'Aperçu Mobile' : 'Mobile Active View'}</div>
                        <p className="text-xs text-slate-300 font-semibold">{settings.schoolName || 'JIPAS Academy'}</p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <label className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer shadow-md shadow-emerald-600/30 transition-all">
                            <Upload className="w-3.5 h-3.5" /> {language === 'fr' ? 'Changer (Téléphone)' : 'Upload Phone Crest'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUploadFor(e, 'mobile')}
                              className="hidden"
                            />
                          </label>

                          {currentMobileLogo && (
                            <button
                              type="button"
                              onClick={() => handleOpenLogoCropperFor('mobile')}
                              className="flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 px-2.5 py-2 rounded-xl font-bold text-[11px] cursor-pointer transition-all"
                            >
                              <Crop className="w-3.5 h-3.5 text-emerald-300" />
                              <span>{language === 'fr' ? 'Recadrer' : 'Crop'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 3: Quick "This Device Only" Custom Crest */}
                <div className="p-4 bg-[#101A38] rounded-xl border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-950 rounded-xl border border-indigo-600/50 text-indigo-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h6 className="font-bold text-white text-xs">{language === 'fr' ? 'Personnaliser Uniquement Cet Appareil' : 'Set Independent Crest for This Device Only'}</h6>
                      <p className="text-[11px] text-slate-400">
                        {language === 'fr' ? 'Applique un logo exclusif à ce navigateur sans affecter vos autres appareils.' : 'Apply an exclusive crest override to this browser without affecting other devices.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" /> {language === 'fr' ? 'Logo Cet Appareil' : 'This Device Crest'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUploadFor(e, 'this_device')}
                        className="hidden"
                      />
                    </label>
                    {currentThisDeviceLogo && (
                      <button
                        type="button"
                        onClick={() => handleResetLogoFor('this_device')}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                      >
                        {language === 'fr' ? 'Effacer' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>

                {/* School Logo Image Cropper Modal */}
                <ImageCropperModal
                  isOpen={isLogoCropperOpen}
                  imageSrc={logoToCrop}
                  title={language === 'fr' ? 'Recadrer le Logo / Emblème Scolaire' : 'Crop School Crest & Logo'}
                  initialAspectRatio="1:1"
                  shape="round"
                  onCrop={handleLogoCropComplete}
                  onCancel={() => {
                    setIsLogoCropperOpen(false);
                    if (logoToCrop.startsWith('blob:')) {
                      URL.revokeObjectURL(logoToCrop);
                    }
                    setLogoToCrop('');
                  }}
                />
              </div>

              {/* Thermal Printer & Receipt Customization */}
              <div className="bg-[#0A122A] border-2 border-blue-900/60 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-blue-900/60">
                  <div className="p-1.5 bg-cyan-950/80 border border-cyan-700/60 rounded-lg text-cyan-400">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">
                      {language === 'fr' ? 'Configuration de l’Imprimante Thermique & Reçus' : 'Thermal Printer & Receipt Customization'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'fr' ? 'Ajustez les formats de papier, en-têtes et pieds de page pour les reçus de caisse et tickets de scolarité.' : 'Configure paper size modes, custom footers, QR verification codes, and receipt print density.'}
                    </p>
                  </div>
                </div>

                {thermalToast && (
                  <div className="bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {language === 'fr' ? 'Paramètres d’impression thermique enregistrés avec succès.' : 'Thermal printer and receipt configuration saved successfully.'}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Paper Size / Mode */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                      {language === 'fr' ? 'Format de Papier & Mode d’Impression' : 'Receipt Paper Size & Print Mode'}
                    </label>
                    <select
                      value={thermalSettings.receiptPaperMode}
                      onChange={(e) => setThermalSettings({ ...thermalSettings, receiptPaperMode: e.target.value as any })}
                      className="w-full px-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    >
                      <option value="a6">A6 Portrait Slip (105mm × 148mm) — Standard Front Desk</option>
                      <option value="80mm">80mm Thermal POS Receipt (Continuous Roll)</option>
                      <option value="58mm">58mm Thermal POS Receipt (Mini Mobile Receipt)</option>
                    </select>
                  </div>

                  {/* Print Density */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                      {language === 'fr' ? 'Densité & Contraste d’Impression' : 'Print Contrast & Density'}
                    </label>
                    <select
                      value={thermalSettings.printDensity}
                      onChange={(e) => setThermalSettings({ ...thermalSettings, printDensity: e.target.value as any })}
                      className="w-full px-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    >
                      <option value="normal">Normal Contrast</option>
                      <option value="dark">Dark (High Contrast Thermal)</option>
                      <option value="extra-dark">Extra Dark (Bold Text)</option>
                    </select>
                  </div>

                  {/* Custom Footer Text */}
                  <div className="md:col-span-2">
                    <label className="block text-slate-200 font-bold mb-1.5 text-xs">
                      {language === 'fr' ? 'Pied de Page Personnalisé du Reçu (Disclaimer)' : 'Custom Receipt Footer Disclaimer'}
                    </label>
                    <input
                      type="text"
                      value={thermalSettings.customFooterText}
                      onChange={(e) => setThermalSettings({ ...thermalSettings, customFooterText: e.target.value })}
                      placeholder="Thank you for your payment. Education is Wealth • Knowledge & Discipline."
                      className="w-full px-3.5 py-3 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 md:col-span-2 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={thermalSettings.includeLogo}
                        onChange={(e) => setThermalSettings({ ...thermalSettings, includeLogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#131E3D] border-blue-700"
                      />
                      <span className="text-xs font-bold text-slate-200">
                        {language === 'fr' ? 'Inclure le Logo Scolaire sur les Reçus' : 'Include Official School Logo on Receipts'}
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={thermalSettings.showQrCode}
                        onChange={(e) => setThermalSettings({ ...thermalSettings, showQrCode: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#131E3D] border-blue-700"
                      />
                      <span className="text-xs font-bold text-slate-200">
                        {language === 'fr' ? 'Inclure le QR Code de Vérification' : 'Include Verification QR Code'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveThermalSettings}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-cyan-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Enregistrer les Options d’Impression' : 'Save Thermal Printer Settings'}</span>
                  </button>
                </div>
              </div>

              {/* Approve Accounts Section */}

              {/* Academic & Operational Defaults */}
              <div className="bg-[#0A122A] border-2 border-blue-900/60 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-blue-900/60">
                  <div className="p-1.5 bg-blue-900/60 border border-blue-600/60 rounded-lg text-blue-300">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-widest">
                    {t('settings.academicHeader') || (language === 'fr' ? 'Paramètres Académiques & Règles Opérationnelles' : 'Academic Parameters & Operational Rules')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 text-xs">
                      {t('settings.academicYear') || (language === 'fr' ? 'Année Académique Active' : 'Active Academic Year')}
                    </label>
                    <select
                      value={settings.activeAcademicYear}
                      onChange={(e) => setSettings({ ...settings, activeAcademicYear: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    >
                      <option value="2025-2026">2025-2026 {language === 'fr' ? '(En cours)' : '(Current)'}</option>
                      <option value="2026-2027">2026-2027 {language === 'fr' ? '(Prochaine)' : '(Upcoming)'}</option>
                      <option value="2024-2025">2024-2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 text-xs">
                      {t('settings.activeTerm') || (language === 'fr' ? 'Trimestre Actif' : 'Active Term')}
                    </label>
                    <select
                      value={settings.activeTerm}
                      onChange={(e) => setSettings({ ...settings, activeTerm: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    >
                      <option value="Third Term">{language === 'fr' ? '3ème Trimestre (En cours)' : 'Third Term (Current)'}</option>
                      <option value="First Term">{language === 'fr' ? '1er Trimestre' : 'First Term'}</option>
                      <option value="Second Term">{language === 'fr' ? '2ème Trimestre' : 'Second Term'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 text-xs">
                      {t('settings.reopeningDate') || (language === 'fr' ? 'Date de Reprise' : 'Next Term Resumption Date')}
                    </label>
                    <input
                      type="date"
                      value={settings.nextTermBegins}
                      onChange={(e) => setSettings({ ...settings, nextTermBegins: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 text-xs">
                      {t('settings.smsSenderId') || (language === 'fr' ? 'ID Expéditeur SMS' : 'SMS Sender ID')}
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={settings.smsSenderId}
                      onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-mono font-bold text-blue-300 text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                    />
                  </div>
                </div>

                {/* Automated Reminders for Incomplete Classwork & Missing Grades */}
                <div className="pt-6 border-t border-blue-950/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-widest">
                      Automated Academic Reminders & Alerts (Rappels Automatiques)
                    </h3>
                  </div>

                  <div className="bg-[#020512] border border-blue-900/30 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-blue-950/10 border border-blue-900/20 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                          Automated Classwork & Missing Grade Reminders
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Automatically scan and trigger notifications to students with missing classwork assignments or incomplete exam scores.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableIncompleteReminders ?? true}
                          onChange={(e) => setSettings({ ...settings, enableIncompleteReminders: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                      </label>
                    </div>

                    {(settings.enableIncompleteReminders ?? true) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 animate-fade-in">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1 text-xs">
                            Notification Frequency (Fréquence)
                          </label>
                          <select
                            value={settings.reminderFrequency || 'Weekly'}
                            onChange={(e) => setSettings({ ...settings, reminderFrequency: e.target.value as any })}
                            className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                          >
                            <option value="Daily">Daily / Quotidien</option>
                            <option value="Weekly">Weekly / Hebdomadaire</option>
                            <option value="Bi-weekly">Bi-weekly / Bi-mensuel</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-200 font-bold mb-1 text-xs">
                            Missing Grade Threshold (Seuil)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={settings.missingGradeThreshold ?? 1}
                            onChange={(e) => setSettings({ ...settings, missingGradeThreshold: Number(e.target.value) })}
                            className="w-full px-3 py-2.5 bg-[#131E3D] border-2 border-blue-700/70 hover:border-blue-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400 focus:bg-[#182750]"
                            placeholder="e.g. 1"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Trigger alert if missing ≥ this many entries</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#131E3D] border-2 border-blue-700/60 rounded-xl self-end h-[46px]">
                          <span className="text-slate-300 font-bold text-xs">Notify Parents Copy</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifyParentsForMissingGrades ?? true}
                              onChange={(e) => setSettings({ ...settings, notifyParentsForMissingGrades: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {/* INSTITUTIONAL ATTENDANCE STATION QR CODE */}
                <div className="bg-[#0A122A] border-2 border-indigo-800/80 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-indigo-900/60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-950 border border-indigo-700/80 rounded-xl text-indigo-400">
                        <QrCodeIcon className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">
                          Official School Attendance Station QR Code
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Print and display this QR code at the school main gate or reception wall for employee clock-in & clock-out.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handlePrintStationPoster}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-indigo-200" />
                        <span>Print Station Poster</span>
                      </button>
                      <a
                        href={stationQrUrl}
                        download={`${settings.schoolName || 'JIPAS'}_Attendance_Station_QR.png`}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-200" />
                        <span>Download PNG</span>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* QR Code Canvas Card */}
                    <div className="bg-slate-950 border border-indigo-900/80 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner">
                      {stationQrUrl ? (
                        <div className="p-3 bg-white rounded-xl border-2 border-indigo-400/40 shadow-2xl">
                          <img
                            src={stationQrUrl}
                            alt="Attendance Station QR Code"
                            className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                          />
                          <div className="font-black text-indigo-600 uppercase tracking-widest mt-1 text-xs">JIPAS</div>
                        </div>
                      ) : (
                        <div className="w-48 h-48 bg-slate-900 rounded-xl animate-pulse flex items-center justify-center text-slate-500 text-xs">
                          Generating Station QR...
                        </div>
                      )}
                      <span className="mt-3 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-700/60">
                        OFFICE-STATION-01
                      </span>
                    </div>

                    {/* Station Configuration & Details */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="block text-slate-200 font-bold mb-1.5 text-xs flex items-center justify-between">
                          <span>Station Location / Name Tag</span>
                          <button
                            type="button"
                            onClick={() => setStationNonce(Date.now())}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors text-[10px] uppercase font-black"
                          >
                            <RefreshCw className="w-3 h-3" /> Refresh QR Token
                          </button>
                        </label>
                        <input
                          type="text"
                          value={stationTitle}
                          onChange={(e) => setStationTitle(e.target.value)}
                          placeholder="e.g. JIPAS MAIN OFFICE ATTENDANCE STATION"
                          className="w-full px-3.5 py-2.5 bg-[#131E3D] border-2 border-indigo-700/70 hover:border-indigo-500 rounded-xl font-bold text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-400 focus:bg-[#182750]"
                        />
                      </div>

                      <div className="bg-[#131E3D] border border-indigo-800/60 p-4 rounded-xl space-y-2 text-xs text-slate-200">
                        <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <span>How Employees Use This QR Code:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] font-medium leading-relaxed">
                          <li>Employees or teachers open the <strong>JIPAS Attendance Scanner</strong> on their mobile phone or tablet.</li>
                          <li>They point their camera lens at this station QR code.</li>
                          <li>The app instantly matches their credentials and records their <strong>Clock-In / Clock-Out</strong> time into the staff audit logs.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DANGER ZONE: SYSTEM FACTORY RESET & ZERO DATA CLEANUP */}
                <div className="pt-6 border-t border-rose-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h3 className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-widest">
                      Danger Zone: Factory Reset & Zero Data Cleanup
                    </h3>
                  </div>

                  <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Reset & Clear All Records</span>
                        <span className="bg-rose-900/80 text-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-700">
                          Permanent
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-200/80 leading-relaxed">
                        Wipe out all students, enrollments, fee bills, payment records, attendance logs, exam reports, broadcasts, and non-admin account data across Firestore and IndexedDB to reset the institution database to zero records.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowClearDataModal(true)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Reset & Clear All Records</span>
                    </button>
                  </div>
                </div>

            {/* Save Button Row */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" /> {t('settings.saveAll') || (language === 'fr' ? 'Enregistrer Tous les Paramètres' : 'Save All System Settings')}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {/* DEDICATED THEME PALETTE & COLOR STUDIO MODULE */}
      {(activeModule === 'system_theme_palette' || activeModule === 'theme_palette' || activeModule === 'color_palette') && (
        <ThemePaletteManager 
          currentPalette={themePalette} 
          onPaletteChange={onUpdateThemePalette} 
        />
      )}

      {/* DEDICATED ACCOUNT REQUESTS QUEUE MODULE */}
      {(activeModule === 'system_account_requests' || activeModule === 'account_requests') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Action Feedback Banner */}
          {actionFeedbackToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionFeedbackToast}</span>
              </div>
              <button 
                onClick={() => setActionFeedbackToast('')} 
                className="text-emerald-500 hover:text-emerald-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Account Registration Requests Queue
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                  pendingUsers.length > 0 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  <Clock className="w-3 h-3" />
                  {pendingUsers.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve newly submitted registration requests from teachers, faculty members, and students/parents.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {pendingUsers.length > 0 && (
                <button
                  onClick={async () => {
                    if (!window.confirm(`Approve and activate all ${pendingUsers.length} pending registration requests?`)) return;
                    for (const u of pendingUsers) {
                      await handleApproveAccount(u);
                    }
                    triggerToast(`All ${pendingUsers.length} pending account requests have been approved!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check className="w-4 h-4" /> Approve All ({pendingUsers.length})
                </button>
              )}
              {onNavigate && (
                <button
                  onClick={() => onNavigate?.('system_users_roles')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Users className="w-4 h-4" /> View All Users
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase">Total Pending Requests</p>
                <h4 className="text-2xl font-black text-amber-900 mt-0.5">{pendingUsers.length}</h4>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Awaiting Administrator Review</p>
              </div>
              <div className="w-10 h-10 bg-amber-200 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-800 uppercase">Teacher / Staff Requests</p>
                <h4 className="text-2xl font-black text-indigo-900 mt-0.5">
                  {pendingUsers.filter(u => u.role !== 'student').length}
                </h4>
                <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Teachers & Administrative Staff</p>
              </div>
              <div className="w-10 h-10 bg-indigo-200 text-indigo-800 rounded-xl flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-800 uppercase">Student / Parent Requests</p>
                <h4 className="text-2xl font-black text-blue-900 mt-0.5">
                  {pendingUsers.filter(u => u.role === 'student').length}
                </h4>
                <p className="text-[10px] text-blue-600 font-medium mt-0.5">Student Portal Registrations</p>
              </div>
              <div className="w-10 h-10 bg-blue-200 text-blue-800 rounded-xl flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Filter:</span>
              <button
                onClick={() => setAccountReqFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  accountReqFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Requests ({pendingUsers.length})
              </button>
              <button
                onClick={() => setAccountReqFilter('faculty')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  accountReqFilter === 'faculty'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Teachers & Staff ({pendingUsers.filter(u => u.role !== 'student').length})
              </button>
              <button
                onClick={() => setAccountReqFilter('student')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  accountReqFilter === 'student'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Students & Parents ({pendingUsers.filter(u => u.role === 'student').length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={accountReqSearch}
                onChange={(e) => setAccountReqSearch(e.target.value)}
                placeholder="Search applicant name, email, phone..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Pending Requests Cards List */}
          {(() => {
            const filteredRequests = pendingUsers.filter(u => {
              if (accountReqFilter === 'faculty' && u.role === 'student') return false;
              if (accountReqFilter === 'student' && u.role !== 'student') return false;
              if (accountReqSearch.trim()) {
                const q = accountReqSearch.toLowerCase();
                const matchName = u.name?.toLowerCase().includes(q);
                const matchEmail = u.email?.toLowerCase().includes(q);
                const matchUsername = u.username?.toLowerCase().includes(q);
                const matchPhone = u.phone?.toLowerCase().includes(q);
                const matchDept = u.department?.toLowerCase().includes(q);
                const matchClass = u.className?.toLowerCase().includes(q);
                const matchAdm = u.admissionNo?.toLowerCase().includes(q);
                return matchName || matchEmail || matchUsername || matchPhone || matchDept || matchClass || matchAdm;
              }
              return true;
            });

            if (filteredRequests.length === 0) {
              return (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 p-8 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">All Caught Up! No Pending Requests</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are currently no new account registrations waiting for review. When new staff or students sign up, they will appear here for approval.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRequests.map(user => (
                  <div
                    key={user.id}
                    className="bg-white border-2 border-amber-200 hover:border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">{user.name}</span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                              user.role === 'teacher' ? 'bg-emerald-100 text-emerald-800' :
                              user.role === 'accountant' ? 'bg-cyan-100 text-cyan-800' :
                              user.role === 'clerk' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-1 flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">@{user.username}</span>
                            {user.email && <span className="text-slate-500">({user.email})</span>}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {user.staffId && (
                          <div className="text-slate-700 font-mono text-[11px]">
                            Staff ID: <span className="font-bold text-indigo-700">{user.staffId}</span>
                          </div>
                        )}
                        {user.department && (
                          <div className="text-slate-700">
                            Dept: <span className="font-bold text-slate-900">{user.department}</span>
                          </div>
                        )}
                        {user.className && (
                          <div className="text-slate-700">
                            Class: <span className="font-bold text-slate-900">{user.className}</span>
                          </div>
                        )}
                        {user.admissionNo && (
                          <div className="text-slate-700 font-mono text-[11px]">
                            Adm No: <span className="font-bold text-indigo-700">{user.admissionNo}</span>
                          </div>
                        )}
                        {user.parentName && (
                          <div className="text-slate-700 col-span-2">
                            Guardian: <span className="font-bold text-slate-900">{user.parentName}</span>
                          </div>
                        )}
                      </div>

                      {user.registeredAt && (
                        <div className="text-[10px] text-slate-400">
                          Submitted on: {new Date(user.registeredAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRejectAccount(user)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(user)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Review / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveAccount(user)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" /> Approve & Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. USERS & ROLES MODULE */}
      {(activeModule === 'system_users_roles' || activeModule === 'users_roles' || activeModule === 'users') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Action Feedback Banner */}
          {actionFeedbackToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionFeedbackToast}</span>
              </div>
              <button 
                onClick={() => setActionFeedbackToast('')} 
                className="text-emerald-500 hover:text-emerald-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Staff Users & Role-Based Access Control
                </h2>
                {pendingUsers.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-extrabold animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {pendingUsers.length} Pending Approval
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage administrative accounts, approve portal registrations, assign roles, and control system permissions.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setSelectedEmployeeId('');
                setEmployeeSearchTerm('');
                setUserFormName('');
                setUserFormLastName('');
                setUserFormOtherNames('');
                setUserFormEmail('');
                setUserFormUsername('');
                setUserFormRole('teacher');
                setUserFormPhone('');
                setUserFormDepartment('Primary School');
                setUserFormClass('Basic 1');
                setUserFormPassword('Password123');
                setShowAddUserModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add New User
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 pt-2">
            <button
              type="button"
              onClick={() => setUserMgmtTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                userMgmtTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Accounts & Directory ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setUserMgmtTab('roles')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                userMgmtTab === 'roles' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Roles & Permissions Matrix (RBAC)
            </button>
            <button
              type="button"
              onClick={() => setUserMgmtTab('staff_updates')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                userMgmtTab === 'staff_updates' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Staff Login Requests
              {staffLoginRequests.filter(r => r.status === 'Pending').length > 0 && (
                <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {staffLoginRequests.filter(r => r.status === 'Pending').length}
                </span>
              )}
            </button>
          </div>

          {userMgmtTab === 'roles' ? (
            <div className="space-y-6 animate-fade-in text-xs">
              {rbacSuccessToast && (
                <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Role-based access control (RBAC) permissions matrix updated and synced successfully!
                  </span>
                  <button onClick={() => setRbacSuccessToast(false)} className="text-white font-black ml-4">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Role Selector Column */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-indigo-700">
                    Configurable Roles
                  </h3>
                  <div className="space-y-2">
                    {rbacRoles.map((role, idx) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRbacRoleIdx(idx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedRbacRoleIdx === idx
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{role.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedRbacRoleIdx === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            Sub-Admin
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1 line-clamp-2 ${selectedRbacRoleIdx === idx ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {role.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        const newRole = {
                          id: `role-${Date.now()}`,
                          name: `Custom Role ${rbacRoles.length + 1}`,
                          description: 'Custom sub-admin operational role.',
                          modules: {
                            setup_management: 'read',
                            system_settings: 'none',
                            teachers: 'read',
                            students: 'read',
                            exams: 'read',
                            fees: 'none',
                            notif_send: 'read',
                            logs_user: 'none'
                          }
                        };
                        setRbacRoles([...rbacRoles, newRole]);
                        setSelectedRbacRoleIdx(rbacRoles.length);
                        triggerToast('New sub-admin role profile created.');
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Custom Sub-Admin Role
                    </button>
                  </div>
                </div>

                {/* Permission Matrix for Selected Role */}
                <div className="lg:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">
                        Editing Permissions for: <span className="text-indigo-600">{rbacRoles[selectedRbacRoleIdx]?.name}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Define whether this role has Read & Write, Read-Only, or No Access to each module.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRbacSuccessToast(true);
                        setTimeout(() => setRbacSuccessToast(false), 3500);
                        triggerToast(`Permissions for "${rbacRoles[selectedRbacRoleIdx]?.name}" successfully updated!`);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Save Role Permissions
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'setup_management', label: 'Setup Management (Academic Years, Terms, Classes, Subjects)', icon: School },
                      { id: 'system_settings', label: 'System Settings & User Account Approvals', icon: Settings },
                      { id: 'teachers', label: 'Staff Management & Staff Attendance', icon: UserCheck },
                      { id: 'students', label: 'Student Enrollment, Attendance & Promotions', icon: Users },
                      { id: 'exams', label: 'Examination Management & Report Cards', icon: Award },
                      { id: 'fees', label: 'Fee Billing, Collections & Financial Statements', icon: DollarSign },
                      { id: 'notif_send', label: 'Notifications, SMS & Broadcast Center', icon: Bell },
                      { id: 'logs_user', label: 'Activity & Login Audit Logs', icon: Shield }
                    ].map(mod => {
                      const currentPermission = rbacRoles[selectedRbacRoleIdx]?.modules[mod.id as keyof typeof rbacRoles[number]['modules']] || 'none';
                      const ModIcon = mod.icon;

                      return (
                        <div key={mod.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                              <ModIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{mod.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Module Identifier: {mod.id}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...rbacRoles];
                                updated[selectedRbacRoleIdx].modules[mod.id as keyof typeof updated[number]['modules']] = 'none';
                                setRbacRoles(updated);
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                currentPermission === 'none'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              No Access
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...rbacRoles];
                                updated[selectedRbacRoleIdx].modules[mod.id as keyof typeof updated[number]['modules']] = 'read';
                                setRbacRoles(updated);
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                currentPermission === 'read'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Read-Only
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...rbacRoles];
                                updated[selectedRbacRoleIdx].modules[mod.id as keyof typeof updated[number]['modules']] = 'read_write';
                                setRbacRoles(updated);
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                currentPermission === 'read_write'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Read & Write
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : userMgmtTab === 'staff_updates' ? (
            <div className="space-y-6 animate-fade-in text-xs">
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-black text-white">Staff Login Credential Update Requests</h3>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl">
                      Review requests from faculty and staff to update their auto-provisioned portal username, official email, phone number, or password. Approving an update instantly commits the new credentials to the staff account.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Pending</span>
                      <span className="text-lg font-black text-amber-400">
                        {staffLoginRequests.filter(r => r.status === 'Pending').length}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Approved</span>
                      <span className="text-lg font-black text-emerald-400">
                        {staffLoginRequests.filter(r => r.status === 'Approved').length}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Total</span>
                      <span className="text-lg font-black text-white">
                        {staffLoginRequests.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Filter Status:</span>
                    {(['all', 'Pending', 'Approved', 'Rejected'] as const).map(filterKey => (
                      <button
                        key={filterKey}
                        onClick={() => setStaffRequestFilter(filterKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          staffRequestFilter === filterKey
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {filterKey === 'all' ? 'All Requests' : filterKey}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Requests List */}
              {staffLoginRequests
                .filter(r => staffRequestFilter === 'all' || r.status === staffRequestFilter)
                .length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                  <KeyRound className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Staff Login Requests Found</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {staffRequestFilter === 'all'
                      ? 'No staff members have submitted login update requests yet.'
                      : `No requests with status "${staffRequestFilter}".`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {staffLoginRequests
                    .filter(r => staffRequestFilter === 'all' || r.status === staffRequestFilter)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                              {req.teacherName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900">{req.teacherName}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  req.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                Staff ID: <span className="font-bold text-slate-700">{req.staffId}</span> • Submitted: {new Date(req.requestedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {req.status === 'Pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveStaffRequest(req.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Approve & Update
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectionModalRequest(req);
                                  setRejectionFeedback('');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comparative Field Changes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {req.requestedUsername && (
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Username</span>
                              <div className="text-xs mt-0.5">
                                <span className="line-through text-slate-400 mr-1.5">{req.currentUsername}</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {req.requestedUsername}
                                </span>
                              </div>
                            </div>
                          )}

                          {req.requestedEmail && (
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                              <div className="text-xs mt-0.5 truncate">
                                <span className="line-through text-slate-400 mr-1.5">{req.currentEmail}</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {req.requestedEmail}
                                </span>
                              </div>
                            </div>
                          )}

                          {req.requestedPhone && (
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                              <div className="text-xs mt-0.5">
                                <span className="line-through text-slate-400 mr-1.5">{req.currentPhone || 'None'}</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {req.requestedPhone}
                                </span>
                              </div>
                            </div>
                          )}

                          {req.requestedPassword && (
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Password Update</span>
                              <div className="text-xs mt-0.5">
                                <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 w-fit">
                                  <KeyRound className="w-3 h-3" /> New Password Requested
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {req.reason && (
                          <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-700 mr-1">Staff Reason:</span>
                            <span className="italic font-medium">"{req.reason}"</span>
                          </div>
                        )}

                        {req.status === 'Approved' && (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Approved and credentials synced to portal user account by <strong>{req.reviewedBy || 'Administrator'}</strong>
                              {req.reviewedAt && ` on ${new Date(req.reviewedAt).toLocaleString()}`}.
                            </span>
                          </div>
                        )}

                        {req.status === 'Rejected' && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 space-y-1">
                            <div className="flex items-center gap-2 font-bold">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Declined by {req.reviewedBy || 'Administrator'}</span>
                            </div>
                            {req.adminFeedback && (
                              <p className="pl-6 italic">Feedback: "{req.adminFeedback}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
          {pendingUsers.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      Pending Registration Approval Queue
                      <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">
                        {pendingUsers.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      New self-registered teachers, staff, or students awaiting administrator review and access activation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{user.name}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            user.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            user.role === 'teacher' ? 'bg-emerald-100 text-emerald-800' :
                            user.role === 'accountant' ? 'bg-cyan-100 text-cyan-800' :
                            user.role === 'clerk' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-mono mt-0.5">
                          @{user.username} {user.email && `• ${user.email}`}
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {user.phone}
                          </div>
                        )}
                        {(user.department || user.className || user.admissionNo) && (
                          <div className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md mt-1.5 font-medium inline-block">
                            {user.department && `Dept: ${user.department}`}
                            {user.className && ` • Class: ${user.className}`}
                            {user.admissionNo && ` • Adm No: ${user.admissionNo}`}
                          </div>
                        )}
                        {user.registeredAt && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Registered: {new Date(user.registeredAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleRejectAccount(user)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleOpenEditUser(user)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Review / Edit
                      </button>
                      <button
                        onClick={() => handleApproveAccount(user)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" /> Approve & Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter, Status Tabs, and Search Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            {/* Status Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Status:</span>
              <button
                onClick={() => setUserStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setUserStatusFilter('Active')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'Active' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Active ({activeUsersCount})
              </button>
              <button
                onClick={() => setUserStatusFilter('Pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  userStatusFilter === 'Pending' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending Approval ({pendingUsers.length})
              </button>
              <button
                onClick={() => setUserStatusFilter('Inactive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'Inactive' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Inactive ({inactiveUsersCount})
              </button>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between pt-1">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, username, email, phone, admission..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Administrators</option>
                    <option value="sub_admin">Sub-Admins</option>
                    <option value="headteacher">Headteachers / Section Heads</option>
                    <option value="hod">Heads of Department (HOD)</option>
                    <option value="ceo">CEO / Proprietors</option>
                    <option value="director">Board Directors</option>
                    <option value="teacher">Teachers</option>
                    <option value="accountant">Accountants</option>
                    <option value="clerk">Clerks / Secretary</option>
                    <option value="student">Students / Parents</option>
                  </select>
                </div>
              </div>
              <div className="text-slate-500 font-medium">
                Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> accounts
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Full Name & ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department / Class</th>
                  <th className="p-3">Contact Details</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Created / Registered</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No user accounts found matching your query or filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const isPending = user.status === 'Pending' || user.isApproved === false;

                    return (
                      <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${isPending ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {user.name}
                            {isPending && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-md font-black">
                                PENDING
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-indigo-600 text-[11px]">@{user.username}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            user.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            user.role === 'headteacher' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            user.role === 'hod' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            user.role === 'sub_admin' ? 'bg-indigo-100 text-indigo-800' :
                            user.role === 'ceo' ? 'bg-amber-100 text-amber-800' :
                            user.role === 'director' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'accountant' ? 'bg-cyan-100 text-cyan-800' :
                            user.role === 'teacher' ? 'bg-emerald-100 text-emerald-800' :
                            user.role === 'clerk' ? 'bg-violet-100 text-violet-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {user.role === 'headteacher' && <Crown className="w-3 h-3 text-purple-700" />}
                            {user.role === 'hod' && <Award className="w-3 h-3 text-teal-700" />}
                            {user.role === 'headteacher' ? (user.leadershipTitle || 'HEADTEACHER') :
                             user.role === 'hod' ? (user.leadershipTitle || 'HOD') :
                             user.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {user.department || user.className || user.leadershipTitle ? (
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {user.department || 'General'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {user.leadershipTitle ? user.leadershipTitle : (user.className || 'All Sections')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <div className="font-medium text-slate-800">{user.email || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.phone || '—'}</div>
                        </td>
                        <td className="p-3">
                          {isPending ? (
                            <button
                              onClick={() => handleApproveAccount(user)}
                              title="Click to approve account"
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              title="Click to toggle status"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                user.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {user.status === 'Active' ? '● Active' : '○ Inactive'}
                            </button>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {user.createdAt || user.registeredAt || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApproveAccount(user)}
                                  title="Approve & Activate Account"
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRejectAccount(user)}
                                  title="Reject Registration"
                                  className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              title="Edit User"
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingUser(user)}
                              title="Delete User"
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      )}

      {/* 3. STUDENT PORTAL CONTROL MODULE */}
      {(activeModule === 'system_student_portal_control' || activeModule === 'system_student_portal_ctrl' || activeModule === 'student_portal_control') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Student Portal Security & Access Control
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or restrict features accessible to students and parents through their online portal accounts.
              </p>
            </div>
            <button
              onClick={() => {
                setPortalToast(true);
                setTimeout(() => setPortalToast(false), 3500);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" /> Save Portal Controls
            </button>
          </div>

          {portalToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Student portal access permissions and security locks updated successfully!
              </span>
              <button onClick={() => setPortalToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* General Access */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-indigo-700">
                Core Portal Availability
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Master Portal Online Switch</span>
                    <span className="text-[11px] text-slate-500">Allow students and parents to log in</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalControls.portalOnline}
                    onChange={(e) => setPortalControls({ ...portalControls, portalOnline: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Terminal Exam Results Viewing</span>
                    <span className="text-[11px] text-slate-500">Display released term reports and score sheets</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalControls.viewTerminalReports}
                    onChange={(e) => setPortalControls({ ...portalControls, viewTerminalReports: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Official PDF Report Card Downloads</span>
                    <span className="text-[11px] text-slate-500">Allow printing stamped terminal report cards</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalControls.downloadReportPdf}
                    onChange={(e) => setPortalControls({ ...portalControls, downloadReportPdf: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Financial Restrictions */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-rose-700">
                Fee & Arrears Security Locks
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Fee Statement & Balance Access</span>
                    <span className="text-[11px] text-slate-500">Display term bills and payment receipts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalControls.viewFeeStatements}
                    onChange={(e) => setPortalControls({ ...portalControls, viewFeeStatements: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block">Lock Results for Unpaid Fee Arrears</span>
                    <span className="text-[11px] text-slate-500">Hide grades until tuition fees are fully cleared</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalControls.lockStudentsInArrears}
                    onChange={(e) => setPortalControls({ ...portalControls, lockStudentsInArrears: e.target.checked })}
                    className="w-5 h-5 text-rose-600 rounded"
                  />
                </label>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-900 mb-1">Arrears Threshold for Result Lock (CFA)</label>
                  <input
                    type="number"
                    value={portalControls.lockArrearsAbove}
                    onChange={(e) => setPortalControls({ ...portalControls, lockArrearsAbove: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Students owing above this amount will have exam cards restricted.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MANAGE PORTAL LOGINS MODULE */}
      {(activeModule === 'system_manage_logins' || activeModule === 'system_manage_portal_logins' || activeModule === 'manage_portal_logins' || activeModule === 'manage_user_logins' || activeModule === 'manage_logins') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Manage User & Portal Logins
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect admission credentials, reset access PINs, lock compromised accounts, and audit user permissions.
              </p>
            </div>

            {/* Quick tab switcher between Students & Staff */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setManageLoginsTab('students')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  manageLoginsTab === 'students'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students & Parents ({filteredPortalLogins.length})
              </button>
              <button
                type="button"
                onClick={() => setManageLoginsTab('staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  manageLoginsTab === 'staff'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff & Admins ({users.length})
              </button>
            </div>
          </div>

          {manageLoginsTab === 'students' ? (
            <>
              {/* Search bar and Class Filter */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[280px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={portalLoginSearch}
                      onChange={(e) => setPortalLoginSearch(e.target.value)}
                      placeholder="Search by student name, admission number..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 uppercase text-[10px]">Class Filter:</span>
                    <select
                      value={selectedPortalLoginClass}
                      onChange={(e) => setSelectedPortalLoginClass(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[150px]"
                    >
                      <option value="All">All Classes</option>
                      {Array.from(new Set([
                        ...getStoredClasses().map(c => c.name),
                        ...portalLogins.map(p => p.className)
                      ])).filter(Boolean).map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-slate-500 font-medium">
                  Showing <strong>{filteredPortalLogins.length}</strong> login credentials
                </div>
              </div>

              {/* Portal Logins Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Access PIN / Passcode</th>
                      <th className="p-3">Account Status</th>
                      <th className="p-3">Last Portal Session</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPortalLogins.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{item.name}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{item.admissionNo}</td>
                        <td className="p-3 text-slate-600">{item.className}</td>
                        <td className="p-3">
                          <span className="font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-slate-800 font-bold tracking-wider">
                            {item.passPin}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{item.lastAccess}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setResetPinModal(item);
                                handlePerformResetPin(item.id);
                              }}
                              title="Generate New PIN"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" /> Reset PIN
                            </button>
                            <button
                              onClick={() => handleTogglePortalLock(item.id)}
                              title={item.status === 'Active' ? 'Lock Account' : 'Unlock Account'}
                              className={`p-1 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer ${
                                item.status === 'Active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {item.status === 'Active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Staff and Administrative User Accounts Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Staff / User Name</th>
                      <th className="p-3">System Role</th>
                      <th className="p-3">Username / Login ID</th>
                      <th className="p-3">Email & Contact</th>
                      <th className="p-3">Department / Assigned Class</th>
                      <th className="p-3">Account Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {users.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{user.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            user.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            user.role === 'headteacher' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            user.role === 'hod' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            user.role === 'sub_admin' ? 'bg-indigo-100 text-indigo-800' :
                            user.role === 'teacher' ? 'bg-emerald-100 text-emerald-800' :
                            user.role === 'accountant' ? 'bg-cyan-100 text-cyan-800' :
                            user.role === 'clerk' ? 'bg-violet-100 text-violet-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'headteacher' && <Crown className="w-3 h-3 text-purple-700" />}
                            {user.role === 'hod' && <Award className="w-3 h-3 text-teal-700" />}
                            {user.role === 'headteacher' ? (user.leadershipTitle || 'HEADTEACHER') :
                             user.role === 'hod' ? (user.leadershipTitle || 'HOD') :
                             user.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700">@{user.username}</td>
                        <td className="p-3 text-slate-600">{user.email || user.phone || '—'}</td>
                        <td className="p-3 text-slate-600">
                          {user.department || user.className || user.leadershipTitle ? (
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {user.department || 'General'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {user.leadershipTitle ? user.leadershipTitle : (user.className || 'General Staff')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">General Staff</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onLoginAsUser?.(user)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Switch active session to view this user's portal dashboard"
                            >
                              <Eye className="w-3.5 h-3.5" /> Login As
                            </button>
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD / EDIT USER MODAL */}
      {(showAddUserModal || editingUser) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 space-y-4 my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {editingUser ? `Edit User: ${editingUser.name}` : 'Create New System User Account'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setEditingUser(null);
                  setSelectedEmployeeId('');
                  setEmployeeSearchTerm('');
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Employee Selection / Search Card (When creating a user or switching employee) */}
              {!editingUser && (
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      Select / Search From Employees & Teachers
                    </label>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {teachers.length} Active Staff Available
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Quickly populate account details by selecting an existing teacher or staff member, or searching by name, Staff ID, or Department.
                  </p>

                  <div className="space-y-2">
                    {/* Live Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search employee by name, ID (e.g. TCH001), department..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                      />
                      {employeeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setEmployeeSearchTerm('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Employee Dropdown Select */}
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        setSelectedEmployeeId(empId);
                        if (!empId) return;

                        const emp = teachers.find(t => t.id === empId);
                        if (emp) {
                          const nameParts = (emp.name || '').trim().split(/\s+/);
                          const lastName = emp.lastName || (nameParts.length > 1 ? nameParts[0] : emp.name);
                          const otherNames = emp.otherNames || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
                          setUserFormLastName(lastName);
                          setUserFormOtherNames(otherNames);
                          setUserFormName(emp.name);
                          
                          // Username suggestion: firstname.lastname or staffId
                          const rawUser = emp.staffId 
                            ? emp.staffId.toLowerCase()
                            : `${(otherNames.split(' ')[0] || lastName).toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
                          setUserFormUsername(rawUser);

                          if (emp.email) setUserFormEmail(emp.email);
                          else setUserFormEmail(`${rawUser}@jipas.edu.gh`);

                          if (emp.phone) setUserFormPhone(emp.phone);
                          if (emp.department) setUserFormDepartment(emp.department);
                          if (emp.campus) setUserFormCampus(emp.campus as any);

                          // Infer appropriate role from designation if available
                          const desLower = (emp.designation || '').toLowerCase();
                          if (desLower.includes('head') || desLower.includes('principal')) {
                            setUserFormRole('headteacher');
                          } else if (desLower.includes('hod') || desLower.includes('head of department')) {
                            setUserFormRole('hod');
                          } else if (desLower.includes('account') || desLower.includes('bursar')) {
                            setUserFormRole('accountant');
                          } else if (desLower.includes('secretary') || desLower.includes('clerk')) {
                            setUserFormRole('clerk');
                          } else {
                            setUserFormRole('teacher');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    >
                      <option value="">-- Choose Employee / Teacher to auto-fill form --</option>
                      {teachers
                        .filter(t => {
                          if (!employeeSearchTerm.trim()) return true;
                          const term = employeeSearchTerm.toLowerCase();
                          return (
                            (t.name || '').toLowerCase().includes(term) ||
                            (t.staffId || '').toLowerCase().includes(term) ||
                            (t.department || '').toLowerCase().includes(term) ||
                            (t.designation || '').toLowerCase().includes(term)
                          );
                        })
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.staffId ? `[${t.staffId}]` : ''} — {t.department || 'Teacher'} ({t.campus || 'General'})
                          </option>
                        ))
                      }
                    </select>

                    {selectedEmployeeId && (
                      <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <span className="flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Linked with: {teachers.find(t => t.id === selectedEmployeeId)?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeId('');
                            setUserFormLastName('');
                            setUserFormOtherNames('');
                            setUserFormName('');
                            setUserFormUsername('');
                            setUserFormEmail('');
                            setUserFormPhone('');
                          }}
                          className="text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name (Surname) *</label>
                  <input
                    type="text"
                    required
                    value={userFormLastName}
                    onChange={(e) => setUserFormLastName(e.target.value)}
                    placeholder="e.g. APPIAH"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Other Names (First & Middle) *</label>
                  <input
                    type="text"
                    required
                    value={userFormOtherNames}
                    onChange={(e) => setUserFormOtherNames(e.target.value)}
                    placeholder="e.g. SAMUEL KWAME"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username / Login ID *</label>
                  <input
                    type="text"
                    required
                    value={userFormUsername}
                    onChange={(e) => setUserFormUsername(e.target.value)}
                    placeholder="e.g. samuel.appiah"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="admin">Administrator (Full)</option>
                    <option value="sub_admin">Sub-Admin (Restricted / Privileged)</option>
                    <option value="ceo">CEO / School Proprietor</option>
                    <option value="director">Board Director</option>
                    <option value="headteacher">Headteacher</option>
                    <option value="hod">Head of Department (HOD)</option>
                    <option value="accountant">Accountant / Bursar</option>
                    <option value="clerk">Clerk / Secretary</option>
                    <option value="student">Student / Parent</option>
                    <option value="cook">Cook</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="security">Security Officer</option>
                    <option value="driver">Driver</option>
                    <option value="librarian">Librarian</option>
                    <option value="nurse">School Nurse</option>
                    <option value="lab_assistant">Lab Assistant</option>
                    <option value="handyman">Maintenance / Handyman</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Campus *</label>
                <select
                  value={userFormCampus}
                  onChange={(e) => setUserFormCampus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-black text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="JIPAS 1">JIPAS 1 (Kpéhénou)</option>
                  <option value="JIPAS 2">JIPAS 2 (Hedzranawoe)</option>
                </select>
              </div>

              {userFormRole === 'headteacher' && (
                <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs flex items-center gap-1.5 text-purple-900">
                      <Crown className="w-4 h-4 text-purple-700" />
                      Headteacher Academic & Section Leadership Settings
                    </h4>
                    <span className="text-[10px] bg-purple-200/80 text-purple-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Executive Role
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">Section / Department Oversight *</label>
                      <select
                        value={userFormDepartment}
                        onChange={(e) => {
                          setUserFormDepartment(e.target.value);
                          if (!userFormLeadershipTitle || userFormLeadershipTitle.startsWith('Headteacher')) {
                            setUserFormLeadershipTitle(`Headteacher - ${e.target.value}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-purple-300 rounded-xl font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 text-xs"
                      >
                        <option value="All Sections / School-wide">All School Sections (General Headteacher)</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">Leadership Designation Title</label>
                      <input
                        type="text"
                        value={userFormLeadershipTitle}
                        onChange={(e) => setUserFormLeadershipTitle(e.target.value)}
                        placeholder="e.g. Headteacher (Primary & JHS)"
                        className="w-full px-3 py-2 border border-purple-300 rounded-xl font-medium bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1.5">Headteacher Administrative & Academic Privileges</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'canEndorseTerminalReports', label: 'Endorse & Approve Terminal Reports' },
                        { key: 'canSuperviseTeachers', label: 'Supervise Section Faculty & Staff' },
                        { key: 'canManageSectionClasses', label: 'Oversee Section Classes & Streams' },
                        { key: 'canViewStudentTranscripts', label: 'View Student Transcripts & Files' },
                        { key: 'canPublishSectionBroadcasts', label: 'Publish Section Circulars & Notices' },
                        { key: 'canManageAttendanceOversight', label: 'Monitor Section Staff & Student Attendance' }
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={userFormHeadteacherPrivileges[item.key as keyof HeadteacherPrivilegesConfig]}
                            onChange={(e) => setUserFormHeadteacherPrivileges(prev => ({
                              ...prev,
                              [item.key]: e.target.checked
                            }))}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-semibold text-slate-800">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {userFormRole === 'hod' && (
                <div className="bg-teal-50/80 border border-teal-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs flex items-center gap-1.5 text-teal-900">
                      <Award className="w-4 h-4 text-teal-700" />
                      Head of Department (HOD) Assignment & Scope
                    </h4>
                    <span className="text-[10px] bg-teal-200/80 text-teal-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Department Lead
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">Assigned Academic Department *</label>
                      <select
                        value={userFormDepartment}
                        onChange={(e) => {
                          setUserFormDepartment(e.target.value);
                          if (!userFormLeadershipTitle || userFormLeadershipTitle.startsWith('HOD -')) {
                            setUserFormLeadershipTitle(`HOD - ${e.target.value}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-teal-300 rounded-xl font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 text-xs"
                      >
                        {departments.length > 0 ? (
                          departments.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="Primary School">Primary School</option>
                            <option value="Junior High School">Junior High School</option>
                            <option value="Nursery & KG">Nursery & KG</option>
                            <option value="Science Department">Science Department</option>
                            <option value="Languages & Humanities">Languages & Humanities</option>
                            <option value="Mathematics & ICT">Mathematics & ICT</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">HOD Designation Title</label>
                      <input
                        type="text"
                        value={userFormLeadershipTitle}
                        onChange={(e) => setUserFormLeadershipTitle(e.target.value)}
                        placeholder="e.g. HOD Science & Technology"
                        className="w-full px-3 py-2 border border-teal-300 rounded-xl font-medium bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1.5">HOD Departmental & Academic Privileges</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'canManageCurriculum', label: 'Curriculum & Syllabus Oversight' },
                        { key: 'canSuperviseDeptTeachers', label: 'Department Faculty Supervision' },
                        { key: 'canEndorseSubjectGrades', label: 'Review & Endorse Subject Marks' },
                        { key: 'canReviewAssessmentSheets', label: 'Continuous Assessment Oversight' },
                        { key: 'canPublishDeptNotices', label: 'Issue Department Notices' },
                        { key: 'canViewDeptAnalytics', label: 'Department Analytics & Pass Rates' }
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-teal-200 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={userFormHodPrivileges[item.key as keyof HodPrivilegesConfig]}
                            onChange={(e) => setUserFormHodPrivileges(prev => ({
                              ...prev,
                              [item.key]: e.target.checked
                            }))}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span className="font-semibold text-slate-800">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {userFormRole === 'sub_admin' && (
                <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-indigo-800">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    Sub-Admin Privileges & Portal Module Access
                  </h4>
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">Access Privilege</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUserFormPrivilege('read')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                          userFormPrivilege === 'read' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Read-Only Access
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserFormPrivilege('read_write')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                          userFormPrivilege === 'read_write' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Read & Write Privilege
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">Allowed Portal Sections / Modules</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'setup_management', label: 'Setup Management' },
                        { id: 'system_settings', label: 'System Settings & Users' },
                        { id: 'teachers', label: 'Staff Management' },
                        { id: 'students', label: 'Student Management' },
                        { id: 'exams', label: 'Examination Management' },
                        { id: 'fees', label: 'Fee Management' },
                        { id: 'notif_send', label: 'Notifications & SMS' },
                        { id: 'logs_user', label: 'Activity & Audit Logs' }
                      ].map(mod => {
                        const isChecked = userFormAllowedModules.includes(mod.id);
                        return (
                          <label key={mod.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserFormAllowedModules([...userFormAllowedModules, mod.id]);
                                } else {
                                  setUserFormAllowedModules(userFormAllowedModules.filter(m => m !== mod.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium text-slate-800">{mod.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {userFormRole !== 'headteacher' && userFormRole !== 'hod' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={userFormDepartment}
                      onChange={(e) => setUserFormDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {departments.length > 0 ? (
                        departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Primary School">Primary School</option>
                          <option value="Junior High School">Junior High School</option>
                          <option value="Nursery & KG">Nursery & KG</option>
                          <option value="Creche">Creche</option>
                          <option value="Administration">Administration</option>
                          <option value="Accounts & Finance">Accounts & Finance</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Class (Optional)</label>
                    <select
                      value={userFormClass}
                      onChange={(e) => setUserFormClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Creche">Creche</option>
                      <option value="Nursery 1">Nursery 1</option>
                      <option value="Nursery 2">Nursery 2</option>
                      <option value="KG 1">KG 1</option>
                      <option value="KG 2">KG 2</option>
                      <option value="Basic 1">Basic 1</option>
                      <option value="Basic 2">Basic 2</option>
                      <option value="Basic 3">Basic 3</option>
                      <option value="Basic 4">Basic 4</option>
                      <option value="Basic 5">Basic 5</option>
                      <option value="Basic 6">Basic 6</option>
                      <option value="JHS 1">JHS 1</option>
                      <option value="JHS 2">JHS 2</option>
                      <option value="JHS 3">JHS 3</option>
                      <option value="All Classes">All Classes / Administrative</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={userFormEmail}
                    onChange={(e) => setUserFormEmail(e.target.value)}
                    placeholder="e.g. user@jipas.edu.gh"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userFormPhone}
                    onChange={(e) => setUserFormPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Users will be able to log in immediately with these credentials.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingUser}
                  onClick={() => {
                    setShowAddUserModal(false);
                    setEditingUser(null);
                    setSelectedEmployeeId('');
                    setEmployeeSearchTerm('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-2"
                >
                  {isSavingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSavingUser ? 'Activating Account...' : (editingUser ? 'Update User Account' : 'Create & Activate Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> ({deletingUser.username})? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN RESET SUCCESS MODAL */}
      {resetPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">PIN Reset Successful</h3>
              <p className="text-xs text-slate-500 mt-1">
                New access passcode generated for <strong>{resetPinModal.name}</strong>:
              </p>
              <div className="my-3 p-3 bg-slate-100 border border-slate-300 rounded-xl font-mono text-xl font-black text-indigo-700 tracking-widest">
                {newGeneratedPin}
              </div>
              <p className="text-[11px] text-slate-400">
                Please securely communicate this PIN to the student/parent.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setResetPinModal(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF LOGIN UPDATE REJECTION MODAL */}
      {rejectionModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Reject Staff Login Update</h3>
              </div>
              <button
                onClick={() => {
                  setRejectionModalRequest(null);
                  setRejectionFeedback('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide feedback or reason for rejecting the credential update request for <strong>{rejectionModalRequest.teacherName}</strong> (ID: {rejectionModalRequest.staffId}):
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rejection Reason / Feedback</label>
              <textarea
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="e.g. Please provide your official institutional email or contact HR for verification."
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectionModalRequest(null);
                  setRejectionFeedback('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectStaffRequest}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FACTORY DATA RESET CONFIRMATION MODAL */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center gap-3 border-b border-rose-900/60 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reset & Clear All Records</h3>
                <p className="text-xs text-rose-300 font-medium">Permanent Factory Reset Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently delete <strong>ALL</strong> student enrollments, fee bills, payments, faculty attendance logs, terminal reports, and logs from both cloud database and local storage.
            </p>

            {isClearingData ? (
              <div className="space-y-3 bg-slate-950 border border-rose-800/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <span>{clearCurrentStep}</span>
                  <span>{clearProgressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full transition-all duration-300 rounded-full shadow-[0_0_10px_#f43f5e]"
                    style={{ width: `${clearProgressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Type <span className="font-mono text-rose-400 font-extrabold uppercase">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-rose-700/80 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isClearingData}
                onClick={() => {
                  setShowClearDataModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingData || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmClearAllData}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                {isClearingData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Factory Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
