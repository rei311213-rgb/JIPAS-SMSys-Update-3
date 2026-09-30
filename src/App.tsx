import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Student, Teacher, TermReport, StudentBill, PaymentRecord, CalendarEvent, NotificationItem, LoginLog,
  AcademicYearItem, TermItem, DepartmentItem, ClassItem, HouseItem, SubjectItem, ClassFeeTariffItem, ClassReportBroadcast,
  ThemePaletteConfig, CourseItem, UserRole, UserAccountItem
} from './types';
import { 
  DEFAULT_THEME_PALETTE, 
  getStoredUsers,
  getStoredStudents,
  getStoredBills,
  getStoredReports,
  getStoredTeachers,
  getStoredAcademicYears,
  getStoredTerms,
  getStoredDepartments,
  getStoredCourses,
  getStoredClasses,
  getStoredHouses,
  getStoredSubjects,
  getStoredPayments,
  getStoredCalendarEvents,
  getStoredNotifications,
  getStoredClassFeeTariffs,
  getStoredClassBroadcasts,
  recordSecurityAuditLog,
  saveStoredStudents,
  saveStoredTeachers,
  saveStoredBills,
  saveStoredReports,
  saveStoredAcademicYears,
  saveStoredTerms,
  saveStoredDepartments,
  saveStoredCourses,
  saveStoredClasses,
  saveStoredHouses,
  saveStoredSubjects,
  saveStoredCalendarEvents,
  saveStoredPayments,
  saveStoredClassBroadcasts,
  saveStoredUsers,
  saveStoredTeacherAttendance,
  saveStoredExpenses,
  saveStoredFinancialAudits,
  saveStoredClassFeeTariffs,
  saveStoredPaymentSettings,
  saveStoredSecretarySummaries,
  saveStoredNotifications,
  saveStoredBankDeposits,
  saveStoredSecurityAuditLogs
} from './services/storageService';
import {
  saveStoredPayrollRuns,
  saveStoredSalaryStructures,
  saveStoredStaffLoans,
  saveStoredPayrollSettings
} from './services/payrollService';
import LoginScreen from './components/LoginScreen';
import AdminPortal from './components/AdminPortal';
import TeacherPortal from './components/TeacherPortal';
import AccountantPortal from './components/AccountantPortal';
import SecretaryPortal from './components/SecretaryPortal';
import StudentPortal from './components/StudentPortal';
import CEOPortal from './components/CEOPortal';
import HeadmasterPortal from './components/HeadmasterPortal';
import HeaderNavigation from './components/common/HeaderNavigation';
import JIPASLogo from './components/common/JIPASLogo';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import { CampusProvider } from './context/CampusContext';
import SyncNowButton from './components/common/SyncNowButton';
import CampusSelector from './components/common/CampusSelector';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { useI18n } from './i18n/I18nContext';
import { LogOut, UserCheck, ShieldCheck, Shield, Calculator, BookOpen, UserCog, Database, FileText, Crown, Award, GraduationCap } from 'lucide-react';
import { SupabaseAuthService } from './services/supabaseAuthService';
import { 
  seedInitialDatabase, 
  subscribeStudents, 
  subscribeTeachers, 
  subscribeAcademicYears,
  subscribeTerms,
  subscribeDepartments,
  subscribeCourses,
  subscribeClasses,
  subscribeHouses,
  subscribeSubjects,
  subscribeReports, 
  subscribeBills, 
  subscribePayments,
  subscribeCalendarEvents,
  subscribeNotifications,
  saveStudent,
  deleteStudent,
  saveTeacher,
  deleteTeacher,
  saveAllAcademicYears,
  saveAllTerms,
  saveAllDepartments,
  saveAllCourses,
  saveAllClasses,
  saveAllHouses,
  saveAllSubjects,
  saveReport,
  saveBill,
  savePayment,
  saveCalendarEvent,
  saveNotification,
  signOutFirebaseUser,
  subscribeAuthState,
  generateUniqueAdmissionNo,
  getUserProfile,
  forceSyncCollections,
  subscribeClassFeeTariffs,
  subscribeClassBroadcasts,
  saveClassBroadcast,
  deleteBill,
  deleteReport,
  getStoredThemePalette,
  applyThemePaletteToDom,
  subscribeThemePalette,
  saveThemePalette,
  recordSecurityAuditLogInFirestore,
  subscribeDemoStatus,
  restoreEntireDatabase
} from './services/dbService';
import { initLocalForageStore, idbClear } from './services/idbService';
import { initBackgroundSync, subscribeSupabaseRealtime, pullFromSupabaseCloud, pushToSupabaseCloud } from './services/syncService';

export type AuthBootstrapState = 
  | 'AUTH_LOADING'
  | 'AUTHENTICATED'
  | 'AUTHENTICATED_WITH_ROLE'
  | 'UNAUTHENTICATED'
  | 'AUTH_ERROR';

export default function App() {
  const { t } = useI18n();
  const [authBootstrapState, setAuthBootstrapState] = useState<AuthBootstrapState>('AUTH_LOADING');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('jipas_current_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.role) {
        localStorage.removeItem('jipas_current_user');
        localStorage.removeItem('jipas_session_role');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('jipas_current_user');
      localStorage.removeItem('jipas_session_role');
      return null;
    }
  });
  const [adminOriginalUser, setAdminOriginalUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('jipas_admin_original_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginAsUser = (userAcc: UserAccountItem) => {
    if (!adminOriginalUser && currentUser && currentUser.role === 'admin') {
      setAdminOriginalUser(currentUser);
      localStorage.setItem('jipas_admin_original_user', JSON.stringify(currentUser));
    }
    const targetUser: User = {
      id: userAcc.id,
      name: userAcc.name,
      email: userAcc.email,
      role: userAcc.role,
      phone: userAcc.phone,
      campus: userAcc.campus as any,
      department: userAcc.department,
      classAssigned: userAcc.className || userAcc.classAssigned,
      admissionNo: userAcc.admissionNo,
      allowedModules: userAcc.allowedModules,
      accountantPrivileges: userAcc.accountantPrivileges,
      ceoPrivileges: userAcc.ceoPrivileges,
      headteacherPrivileges: userAcc.headteacherPrivileges,
      hodPrivileges: userAcc.hodPrivileges,
      executiveTitle: userAcc.executiveTitle,
      leadershipTitle: userAcc.leadershipTitle
    };
    setCurrentUser(targetUser);
    setSessionRole(targetUser.role);
    setAuthBootstrapState('AUTHENTICATED_WITH_ROLE');
    localStorage.setItem('jipas_current_user', JSON.stringify(targetUser));
    localStorage.setItem('jipas_session_role', targetUser.role);
    localStorage.removeItem('jipas_active_page_admin');
    triggerToast(`🛡️ Impersonating user: ${targetUser.name} (${targetUser.role.toUpperCase()})`);
  };
  const [sessionRole, setSessionRole] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem('jipas_session_role');
      if (saved) return saved as UserRole;
      const user = localStorage.getItem('jipas_current_user');
      return user ? JSON.parse(user).role : null;
    } catch {
      return null;
    }
  });

  const handleRoleToggle = () => {
    if (!currentUser) return;
    const isSpecialRole = currentUser.role === 'headteacher' || currentUser.role === 'hod' || currentUser.role === 'headmaster';
    if (!isSpecialRole) return;

    const newRole: UserRole = sessionRole === 'teacher' ? currentUser.role : 'teacher';
    setSessionRole(newRole);
    localStorage.setItem('jipas_session_role', newRole);
    triggerToast(`Switched to ${newRole.replace('_', ' ')} view`);
  };
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('jipas_session_id') || null;
  });
  const [fbAuthUid, setFbAuthUid] = useState<string | null>(null);
  const [dbSynced, setDbSynced] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const isInitializingRef = useRef(false);
  
  // App state - local-first persistence guarantees immediate data availability on refresh
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getStoredTeachers());
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>(() => getStoredAcademicYears());
  const [terms, setTerms] = useState<TermItem[]>(() => getStoredTerms());
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => getStoredDepartments());
  const [courses, setCourses] = useState<CourseItem[]>(() => getStoredCourses());
  const [classes, setClasses] = useState<ClassItem[]>(() => getStoredClasses());
  const [houses, setHouses] = useState<HouseItem[]>(() => getStoredHouses());
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => getStoredSubjects());
  const [reports, setReports] = useState<TermReport[]>(() => getStoredReports());
  const [bills, setBills] = useState<StudentBill[]>(() => getStoredBills());
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getStoredPayments());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => getStoredCalendarEvents());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getStoredNotifications());
  const [classFeeTariffs, setClassFeeTariffs] = useState<ClassFeeTariffItem[]>(() => getStoredClassFeeTariffs());
  const [broadcasts, setBroadcasts] = useState<ClassReportBroadcast[]>(() => getStoredClassBroadcasts());
  const [themePalette, setThemePalette] = useState<ThemePaletteConfig>(() => getStoredThemePalette());
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddNotification = async (notif: NotificationItem) => {
    try {
      await saveNotification(notif);
      setNotifications(prev => [notif, ...prev]);
      triggerToast('Notification sent successfully.');
    } catch (err) {
      console.warn('saveNotification error:', err);
      setNotifications(prev => [notif, ...prev]);
    }
  };

  useEffect(() => {
    // Listen for cloud sync events to refresh local React state across collections
    const handleCloudSync = () => {
      setStudents(getStoredStudents());
      setTeachers(getStoredTeachers());
      setBills(getStoredBills());
      setPayments(getStoredPayments());
      setReports(getStoredReports());
      setClasses(getStoredClasses());
      setAcademicYears(getStoredAcademicYears());
      setTerms(getStoredTerms());
      setDepartments(getStoredDepartments());
      setCourses(getStoredCourses());
      setHouses(getStoredHouses());
      setSubjects(getStoredSubjects());
      setCalendarEvents(getStoredCalendarEvents());
      setNotifications(getStoredNotifications());
      setClassFeeTariffs(getStoredClassFeeTariffs());
      setBroadcasts(getStoredClassBroadcasts());
    };

    window.addEventListener('jipas_cloud_synced', handleCloudSync);
    return () => window.removeEventListener('jipas_cloud_synced', handleCloudSync);
  }, []);

  // 1. Definite Authentication Bootstrap Sequence
  useEffect(() => {
    if (isInitializingRef.current || isBootstrapped) return;
    isInitializingRef.current = true;

    const cleanupBgSync = initBackgroundSync();
    const unsubRealtime = subscribeSupabaseRealtime(() => {
      setStudents(getStoredStudents());
      setTeachers(getStoredTeachers());
      setBills(getStoredBills());
      setPayments(getStoredPayments());
      setReports(getStoredReports());
    });

    const runAuthBootstrap = async () => {
      try {
        console.log('[App Bootstrap] Step 1: Initializing IndexedDB local cache...');
        await initLocalForageStore();

        try {
          localStorage.removeItem('jipas_current_user_pwd');
        } catch {}

        console.log('[App Bootstrap] Step 2: Resolving Session Auth state...');
        const spUser = await SupabaseAuthService.getCurrentUser();
        const savedUserStr = localStorage.getItem('jipas_current_user');
        let profile: User | null = null;
        if (savedUserStr) {
          try { profile = JSON.parse(savedUserStr); } catch {}
        }

        if (spUser || profile) {
          const uid = spUser?.id || profile?.id || 'admin-user';
          setFbAuthUid(uid);
          setAuthBootstrapState('AUTHENTICATED');

          if (!profile && spUser?.email?.toLowerCase() === 'rei311213@gmail.com') {
            profile = {
              id: uid,
              name: 'JAKRei',
              email: spUser.email,
              role: 'admin',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            };
          }

          if (profile && profile.role) {
            console.log(`[App Bootstrap] Role resolved authoritatively: '${profile.role}' for user '${profile.name}'`);
            setCurrentUser(profile);
            setSessionRole(profile.role);
            setAuthBootstrapState('AUTHENTICATED_WITH_ROLE');
            
            // Sync data from Supabase Cloud
            try {
              await forceSyncCollections(profile.role);
              setDbSynced(true);
            } catch (syncErr) {
              console.warn('[App Bootstrap] Initial sync notice:', syncErr);
            }
          } else {
            console.log('[App Bootstrap] No role assigned yet. Directing to LoginScreen.');
            setAuthBootstrapState('UNAUTHENTICATED');
          }
        } else {
          console.log('[App Bootstrap] Resolving local cached user state...');
          // If offline and cached session exists, enable offline access
          if (typeof localStorage !== 'undefined') {
            const savedUserStr = localStorage.getItem('jipas_current_user');
            if (savedUserStr) {
              try {
                const parsed = JSON.parse(savedUserStr);
                if (parsed && parsed.role) {
                  setCurrentUser(parsed);
                  setSessionRole(parsed.role);
                  setAuthBootstrapState('AUTHENTICATED_WITH_ROLE');
                  setIsBootstrapped(true);
                  return;
                }
              } catch {}
            }
          }

          setCurrentUser(null);
          setSessionRole(null);
          setAuthBootstrapState('UNAUTHENTICATED');
        }
      } catch (err) {
        console.error('[App Bootstrap] Initialization error:', err);
        setAuthBootstrapState('AUTH_ERROR');
      } finally {
        setIsBootstrapped(true);
      }
    };

    runAuthBootstrap();

    const unsubAuth = subscribeAuthState((u) => {
      setFbAuthUid(u ? u.uid : null);
      if (!u && authBootstrapState !== 'AUTH_LOADING') {
        setCurrentUser(null);
        setSessionRole(null);
        setAuthBootstrapState('UNAUTHENTICATED');
      }
    });

    return () => {
      cleanupBgSync();
      unsubRealtime();
      unsubAuth();
    };
  }, []);

  // 2. Protected Real-Time Listeners (ONLY attached when AUTHENTICATED_WITH_ROLE)
  useEffect(() => {
    if (authBootstrapState !== 'AUTHENTICATED_WITH_ROLE' || !currentUser) {
      return;
    }

    console.log(`[App Listeners] Attaching authorized real-time listeners for role: '${currentUser.role}'...`);
    const unsubs: (() => void)[] = [];

    // Institutional subscriptions
    unsubs.push(subscribeClasses((cls) => setClasses(cls)));
    unsubs.push(subscribeAcademicYears((ays) => setAcademicYears(ays)));
    unsubs.push(subscribeTerms((tms) => setTerms(tms)));
    unsubs.push(subscribeDepartments((depts) => setDepartments(depts)));
    unsubs.push(subscribeCourses((crs) => setCourses(crs)));
    unsubs.push(subscribeHouses((hs) => setHouses(hs)));
    unsubs.push(subscribeSubjects((subs) => setSubjects(subs)));
    unsubs.push(subscribeCalendarEvents((evts) => setCalendarEvents(evts)));
    unsubs.push(subscribeNotifications((notifs) => setNotifications(notifs)));
    unsubs.push(subscribeClassFeeTariffs((tariffs) => setClassFeeTariffs(tariffs)));
    unsubs.push(subscribeClassBroadcasts((bcasts) => setBroadcasts(bcasts)));
    unsubs.push(subscribeThemePalette((palette) => {
      setThemePalette(palette);
      applyThemePaletteToDom(palette);
    }));
    unsubs.push(subscribeDemoStatus((cleared) => {
      if (cleared) handleClearAllData(true);
    }));

    // Role-protected subscriptions
    unsubs.push(subscribeStudents((data) => setStudents(data)));
    unsubs.push(subscribeTeachers((data) => setTeachers(data)));
    unsubs.push(subscribeReports((data) => setReports(data)));
    unsubs.push(subscribeBills((data) => setBills(data)));
    unsubs.push(subscribePayments((data) => setPayments(data)));

    return () => {
      console.log('[App Listeners] Detaching authorized listeners.');
      unsubs.forEach(unsub => unsub());
    };
  }, [authBootstrapState, currentUser?.id, currentUser?.role, fbAuthUid]);

  // Role & Privilege Intrusion Detection System (IDS)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email?.toLowerCase() === 'rei311213@gmail.com') {
        return;
      }

      const registeredUsers = getStoredUsers();
      const actualUser = registeredUsers.find(u => u.email?.toLowerCase() === currentUser.email?.toLowerCase());

      if (actualUser) {
        const isExecRole = (r: string) => r === 'ceo' || r === 'director';
        const isAdminRole = (r: string) => r === 'admin';

        const isRoleCompatible = 
          actualUser.role === currentUser.role ||
          (isExecRole(actualUser.role) && isExecRole(currentUser.role));

        if (!isRoleCompatible) {
          console.error('CRITICAL: Local session role mismatch. Privilege escalation/role tampering suspected.');
          console.log('Role mismatch detected:', {
            currentUserRole: currentUser.role,
            actualUserRole: actualUser.role,
            userEmail: currentUser.email
          });
          recordSecurityAuditLog({
            performedBy: currentUser.name || 'Console Attacker',
            performedByRole: currentUser.role || 'Unverified',
            targetUser: actualUser.name,
            targetUserRole: actualUser.role,
            actionType: 'Access Violation Attempt',
            details: `Role tampering attempt blocked. Session specified: "${currentUser.role}", actual registered role: "${actualUser.role}". Access denied, session destroyed.`
          });

          // Revoke active session forcefully
          handleLogout();
          triggerToast('⚠️ Security Exception: Session signature invalid or altered.');
        } else if (actualUser.role !== currentUser.role) {
          // Keep registered user role synced with valid session role
          const updatedUsers = registeredUsers.map(u => 
            u.email?.toLowerCase() === currentUser.email?.toLowerCase() ? { ...u, role: currentUser.role } : u
          );
          saveStoredUsers(updatedUsers);
        }
      }
    }
  }, [currentUser]);

  const formatTimestamp = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleLogin = (user: User) => {
    const now = new Date();
    const timeFormatted = formatTimestamp(now);
    const logId = `log-${Date.now()}`;

    // Detect browser & device
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

    let os = 'Windows 10';
    if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Macintosh')) os = 'macOS';

    const newLog: LoginLog = {
      id: logId,
      user: user.name,
      role: (user.role || '').charAt(0).toUpperCase() + (user.role || '').slice(1),
      email: user.email,
      ipAddress: '154.162.113.93',
      device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
      browser: browser,
      os: os,
      loginTime: timeFormatted,
      logoutTime: 'Active Session',
      status: 'Success'
    };

    setLoginLogs(prev => [newLog, ...prev]);
    setCurrentSessionId(logId);
    setCurrentUser(user);
    setSessionRole(user.role);
    setAuthBootstrapState('AUTHENTICATED_WITH_ROLE');

    // Save session to localStorage so refresh doesn't go back to login screen
    // Force reset all module tracking keys to guarantee every login navigates to the dashboard
    try {
      localStorage.setItem('jipas_current_user', JSON.stringify(user));
      localStorage.setItem('jipas_session_id', logId);
      localStorage.setItem('jipas_session_role', user.role);
      localStorage.removeItem('jipas_active_page_admin');
      localStorage.removeItem('jipas_active_page_teacher');
      localStorage.removeItem('jipas_active_page_accountant');
      localStorage.removeItem('jipas_active_page_student');
      localStorage.setItem('jipas_force_dashboard', 'true');

      // Keep stored system users registry in sync with user's login role
      if (user.email) {
        const storedUsers = getStoredUsers();
        const existingIdx = storedUsers.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (existingIdx !== -1) {
          storedUsers[existingIdx] = { ...storedUsers[existingIdx], role: user.role };
          saveStoredUsers(storedUsers);
        }
      }
    } catch (e) {
      console.warn('Could not store session in localStorage:', e);
    }
    window.location.hash = 'dashboard';
  };

  const handleLogout = async () => {
    if (currentSessionId) {
      const now = new Date();
      const logoutFormatted = formatTimestamp(now);
      setLoginLogs(prev => prev.map(log => 
        log.id === currentSessionId ? { ...log, logoutTime: logoutFormatted } : log
      ));
    }
    try {
      await signOutFirebaseUser();
    } catch (e) {
      console.warn('[App] SignOut notice:', e);
    }
    setCurrentUser(null);
    setCurrentSessionId(null);
    setSessionRole(null);
    setAdminOriginalUser(null);
    setFbAuthUid(null);
    setAuthBootstrapState('UNAUTHENTICATED');
    try {
      localStorage.removeItem('jipas_current_user');
      localStorage.removeItem('jipas_current_user_pwd');
      localStorage.removeItem('jipas_session_id');
      localStorage.removeItem('jipas_session_role');
      localStorage.removeItem('jipas_admin_original_user');
      localStorage.removeItem('jipas_active_page_admin');
      localStorage.removeItem('jipas_active_page_teacher');
      localStorage.removeItem('jipas_active_page_accountant');
      localStorage.removeItem('jipas_active_page_student');
      localStorage.removeItem('jipas_force_dashboard');
    } catch (e) {
      console.warn('Could not clear session storage:', e);
    }
    window.location.hash = '';
    triggerToast('Logged out securely.');
  };

  const handleClearAllData = (skipConfirm: boolean = false) => {
    if (!skipConfirm) {
      const confirmed = window.confirm('⚠️ WARNING: Are you sure you want to clear all app records, students, fees, and staff data? This action is permanent and intentional.');
      if (!confirmed) return;
    }

    try {
      // Atomic state batch reset
      setStudents([]);
      setTeachers([]);
      setReports([]);
      setBills([]);
      setPayments([]);
      setAcademicYears([]);
      setTerms([]);
      setDepartments([]);
      setCourses([]);
      setClasses([]);
      setHouses([]);
      setSubjects([]);
      setCalendarEvents([]);
      setNotifications([]);
      setClassFeeTariffs([]);
      setBroadcasts([]);

      if (!skipConfirm) {
        triggerToast('All existing records, students, fees, and staff data have been comprehensively cleared.');
      }
      console.log('[App] handleClearAllData executed: all application records reset atomically.');
    } catch (err) {
      console.error('[App] Error executing handleClearAllData:', err);
      if (!skipConfirm) {
        triggerToast('Failed to clear app data.');
      }
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      // Explicitly enforce compliance with the production 'JIPAS/YYYY/000X' specification
      let admissionNo = newStudent.admissionNo;
      if (
        !admissionNo || 
        admissionNo === 'PENDING-APPROVAL' || 
        admissionNo.includes('PENDING') || 
        !admissionNo.toUpperCase().startsWith('JIPAS/')
      ) {
        admissionNo = generateUniqueAdmissionNo(getStoredStudents());
      }

      const formattedStudent: Student = {
        ...newStudent,
        admissionNo
      };

      // 1. Wait for Firestore persistence promise to resolve first (wait-for-completion)
      await saveStudent(formattedStudent);

      const newBill: StudentBill = {
        id: `bill-${Date.now()}`,
        studentId: formattedStudent.id,
        studentName: formattedStudent.fullName,
        admissionNo: formattedStudent.admissionNo,
        className: formattedStudent.className,
        academicYear: formattedStudent.academicYear || '2025-2026',
        term: formattedStudent.term || 'Third Term',
        items: [
          { name: 'Tuition Fee', amount: 350 },
          { name: 'Classes Fee', amount: 50 },
          { name: 'Bus-User Fee', amount: 200 },
          { name: 'Printing Fee', amount: 20 },
          { name: 'PTA Dues', amount: 50 },
          { name: 'Sports Levy', amount: 25 },
          { name: 'Clinic Levy', amount: 20 }
        ],
        subTotal: 715,
        arrears: 0,
        discount: 0,
        payable: 715,
        paid: 0,
        balance: 715,
        status: 'Unpaid'
      };
      await saveBill(newBill);

      const newReport: TermReport = {
        id: `rep-${Date.now()}`,
        studentId: formattedStudent.id,
        studentName: formattedStudent.fullName,
        admissionNo: formattedStudent.admissionNo,
        className: formattedStudent.className,
        academicYear: formattedStudent.academicYear || '2025-2026',
        term: formattedStudent.term || 'Third Term',
        attendancePresent: 65,
        attendanceTotal: 70,
        conduct: 'Good & respectful',
        attitude: 'Attentive and eager to learn',
        interest: 'Reading, Science and Football',
        teacherComment: 'A very promising student. Shows dedication to studies.',
        headmasterComment: 'Good performance. Keep up the high standard.',
        scores: [
          { subject: 'Mathematics', classScore: 26, examScore: 58, total: 84, grade: '1', remark: 'Higher' },
          { subject: 'English Language', classScore: 24, examScore: 54, total: 78, grade: '2', remark: 'Higher' },
          { subject: 'Integrated Science', classScore: 28, examScore: 60, total: 88, grade: '1', remark: 'Higher' },
          { subject: 'Computing', classScore: 25, examScore: 55, total: 80, grade: '1', remark: 'Higher' },
          { subject: 'Creative Arts', classScore: 27, examScore: 56, total: 83, grade: '1', remark: 'Higher' },
          { subject: 'Our World Our People', classScore: 25, examScore: 56, total: 81, grade: '1', remark: 'Higher' },
          { subject: 'Religious & Moral Edu.', classScore: 26, examScore: 54, total: 80, grade: '1', remark: 'Higher' }
        ],
        totalScore: 574,
        averageScore: 82.0,
        position: '3rd'
      };
      await saveReport(newReport);

      // 2. Force-sync UI state after confirmed persistence
      setStudents(getStoredStudents());
      setBills(getStoredBills());
      setReports(getStoredReports());
      triggerToast(`Student ${formattedStudent.fullName} (${formattedStudent.admissionNo}) successfully added and synced to Supabase!`);
    } catch (err: any) {
      console.error('handleAddStudent error:', err);
      triggerToast('Error saving student to backend database.');
    }
  };

  const handleUpdateStudent = async (student: Student) => {
    try {
      await saveStudent(student);
      setStudents(getStoredStudents());
      triggerToast(`Student ${student.fullName} updated and synced successfully.`);
    } catch (err) {
      console.error('handleUpdateStudent error:', err);
      triggerToast('Failed to update student.');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      await deleteStudent(studentId);
      setStudents(getStoredStudents());
      triggerToast('Student deleted successfully from database.');
    } catch (err) {
      console.error('handleDeleteStudent error:', err);
      triggerToast('Failed to delete student.');
    }
  };

  const handleAddTeacher = async (teacher: Teacher) => {
    try {
      await saveTeacher(teacher);
      setTeachers(getStoredTeachers());
      triggerToast(`Teacher ${teacher.name} added and synced successfully.`);
    } catch (err) {
      console.error('handleAddTeacher error:', err);
      triggerToast('Failed to save teacher.');
    }
  };

  const handleUpdateTeacher = async (teacher: Teacher) => {
    try {
      await saveTeacher(teacher);
      setTeachers(getStoredTeachers());
      triggerToast(`Teacher ${teacher.name} updated successfully.`);
    } catch (err) {
      console.error('handleUpdateTeacher error:', err);
      triggerToast('Failed to update teacher.');
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      await deleteTeacher(teacherId);
      setTeachers(getStoredTeachers());
      triggerToast('Teacher removed successfully from database.');
    } catch (err) {
      console.error('handleDeleteTeacher error:', err);
      triggerToast('Failed to delete teacher.');
    }
  };

  const handleUpdateAcademicYears = async (newAys: AcademicYearItem[]) => {
    setAcademicYears(newAys);
    saveStoredAcademicYears(newAys);
    try {
      await saveAllAcademicYears(newAys);
    } catch (err) {
      console.warn('saveAllAcademicYears sync notice:', err);
    }
    pushToSupabaseCloud().catch(console.warn);
  };

  const handleUpdateTerms = async (newTerms: TermItem[]) => {
    setTerms(newTerms);
    saveStoredTerms(newTerms);
    try {
      await saveAllTerms(newTerms);
    } catch (err) {
      console.warn('saveAllTerms sync notice:', err);
    }
    pushToSupabaseCloud().catch(console.warn);
  };

  const handleUpdateDepartments = async (newDepts: DepartmentItem[]) => {
    setDepartments(newDepts);
    saveStoredDepartments(newDepts);
    try {
      await saveAllDepartments(newDepts);
    } catch (err) {
      console.warn('saveAllDepartments sync notice:', err);
    }
  };

  const handleUpdateCourses = async (newCourses: CourseItem[]) => {
    setCourses(newCourses);
    saveStoredCourses(newCourses);
    try {
      await saveAllCourses(newCourses);
    } catch (err) {
      console.warn('saveAllCourses sync notice:', err);
    }
  };

  const handleUpdateClasses = async (newClasses: ClassItem[]) => {
    setClasses(newClasses);
    saveStoredClasses(newClasses);
    try {
      await saveAllClasses(newClasses);
    } catch (err) {
      console.warn('saveAllClasses sync notice:', err);
    }
  };

  const handleUpdateHouses = async (newHouses: HouseItem[]) => {
    setHouses(newHouses);
    saveStoredHouses(newHouses);
    try {
      await saveAllHouses(newHouses);
    } catch (err) {
      console.warn('saveAllHouses sync notice:', err);
    }
  };

  const handleUpdateSubjects = async (newSubjects: SubjectItem[]) => {
    setSubjects(newSubjects);
    saveStoredSubjects(newSubjects);
    try {
      await saveAllSubjects(newSubjects);
    } catch (err) {
      console.warn('saveAllSubjects sync notice:', err);
    }
  };

  const handleAddEvent = async (newEvent: CalendarEvent) => {
    setCalendarEvents(prev => {
      const updated = [newEvent, ...prev];
      saveStoredCalendarEvents(updated);
      return updated;
    });
    try {
      await saveCalendarEvent(newEvent);
    } catch (err) {
      console.warn('saveCalendarEvent sync notice:', err);
    }
  };

  const handleAddPayment = async (newPayment: PaymentRecord) => {
    const currentPayments = getStoredPayments();
    const updatedPayments = [newPayment, ...currentPayments.filter(p => p.id !== newPayment.id)];
    saveStoredPayments(updatedPayments);
    setPayments(updatedPayments);

    try {
      await savePayment(newPayment);
    } catch (err) {
      console.warn('savePayment sync notice:', err);
    }

    // Real-time synchronization with StudentBill:
    let updatedTargetBill: StudentBill | null = null;
    const currentBills = getStoredBills();
    const updatedBills = (currentBills.length > 0 ? currentBills : bills).map(bill => {
      const matchById = newPayment.studentId && bill.studentId && bill.studentId === newPayment.studentId;
      const matchByAdm = newPayment.admissionNo && bill.admissionNo && bill.admissionNo.trim().toUpperCase() === newPayment.admissionNo.trim().toUpperCase();
      if (matchById || matchByAdm) {
        const currentPaid = bill.paid ?? (bill as any).paidAmount ?? 0;
        const currentPayable = bill.payable ?? (bill as any).totalAmount ?? 0;
        const paymentAmt = newPayment.paid ?? newPayment.amount ?? 0;
        const newPaid = currentPaid + paymentAmt;
        const newBal = Math.max(0, currentPayable - newPaid);
        const newStatus = newBal === 0 ? 'Fully Paid' : (newPaid > 0 ? 'Partially Paid' : 'Unpaid');
        const b = {
          ...bill,
          paid: newPaid,
          paidAmount: newPaid,
          balance: newBal,
          status: newStatus as any
        };
        updatedTargetBill = b;
        return b;
      }
      return bill;
    });

    setBills(updatedBills);
    saveStoredBills(updatedBills);
    if (updatedTargetBill) {
      try {
        await saveBill(updatedTargetBill);
      } catch (err) {
        console.warn('saveBill after payment sync notice:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
    }
  };

  const handleUpdateReports = async (updatedReports: TermReport[]) => {
    setReports(updatedReports);
    saveStoredReports(updatedReports);
    for (const r of updatedReports) {
      try {
        await saveReport(r);
      } catch (err) {
        console.warn('saveReport sync notice:', err);
      }
    }
  };

  const handleCleanOrphanedRecords = async () => {
    const validStudentIds = new Set(students.map(s => s.id));
    const validAdmissionNos = new Set(students.map(s => s.admissionNo.toLowerCase().trim()).filter(Boolean));

    const isStudentAlive = (studentId?: string, admissionNo?: string) => {
      if (studentId && validStudentIds.has(studentId)) return true;
      if (admissionNo && validAdmissionNos.has(admissionNo.toLowerCase().trim())) return true;
      return false;
    };

    const orphanedBills = bills.filter(b => !isStudentAlive(b.studentId, b.admissionNo));
    const orphanedReports = reports.filter(r => !isStudentAlive(r.studentId, r.admissionNo));

    if (orphanedBills.length === 0 && orphanedReports.length === 0) {
      return { cleanedBillsCount: 0, cleanedReportsCount: 0, totalCleaned: 0 };
    }

    const nextBills = bills.filter(b => isStudentAlive(b.studentId, b.admissionNo));
    const nextReports = reports.filter(r => isStudentAlive(r.studentId, r.admissionNo));

    setBills(nextBills);
    saveStoredBills(nextBills);

    setReports(nextReports);
    saveStoredReports(nextReports);

    for (const b of orphanedBills) {
      try {
        await deleteBill(b.id);
      } catch (err) {
        console.error('Failed to delete orphaned bill:', err);
      }
    }
    for (const r of orphanedReports) {
      try {
        await deleteReport(r.id);
      } catch (err) {
        console.error('Failed to delete orphaned report:', err);
      }
    }

    triggerToast(`Quick Clean: Removed ${orphanedBills.length} orphaned bills and ${orphanedReports.length} orphaned reports.`);
    return {
      cleanedBillsCount: orphanedBills.length,
      cleanedReportsCount: orphanedReports.length,
      totalCleaned: orphanedBills.length + orphanedReports.length
    };
  };

  const handleUpdateSingleReport = async (updatedReport: TermReport) => {
    setReports(prev => {
      const updated = prev.map(r => r.id === updatedReport.id ? updatedReport : r);
      saveStoredReports(updated);
      return updated;
    });
    try {
      await saveReport(updatedReport);
    } catch (err) {
      console.warn('saveReport sync notice:', err);
    }
  };

  const handleUpdateBroadcasts = async (updatedBroadcasts: ClassReportBroadcast[]) => {
    setBroadcasts(updatedBroadcasts);
    saveStoredClassBroadcasts(updatedBroadcasts);
    for (const b of updatedBroadcasts) {
      try {
        await saveClassBroadcast(b);
      } catch (err) {
        console.warn('saveClassBroadcast sync notice:', err);
      }
    }
  };

  const handleRestoreData = async (data: any) => {
    try {
      await restoreEntireDatabase(data);
      
      // Update reactive local state for elements loaded globally
      if (data.students && Array.isArray(data.students)) {
        setStudents(data.students);
      }
      if (data.teachers && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
      }
      if (data.reports && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
      if (data.bills && Array.isArray(data.bills)) {
        setBills(data.bills);
      }
      if (data.payments && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
      if (data.calendarEvents && Array.isArray(data.calendarEvents)) {
        setCalendarEvents(data.calendarEvents);
      }
      if (data.notifications && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('[App] Failed to fully restore database state in Firestore:', err);
      throw err;
    }
  };

  if (authBootstrapState === 'AUTH_LOADING') {
    return (
      <div className="min-h-screen bg-[#040814] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="flex flex-col items-center max-w-sm text-center relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 border border-indigo-500/30 animate-pulse">
            <JIPASLogo size="lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">JIPAS STUDENTS HUB</h1>
          <p className="text-xs text-indigo-300/80 font-medium mb-8">Secure Academic & Institutional Cloud Gateway</p>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 shadow-lg">
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Verifying session authorization...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser || authBootstrapState === 'UNAUTHENTICATED' || authBootstrapState === 'AUTH_ERROR') {
    return (
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <LoginScreen 
              onLogin={handleLogin} 
              studentsList={students.map(s => ({ 
                id: s.id, 
                name: s.fullName, 
                admissionNo: s.admissionNo,
                parentPhone: s.parentPhone
              }))}
              teachersList={teachers.map(t => ({
                id: t.id,
                name: t.name,
                email: t.email,
                classAssigned: t.classesTeaching?.[0]
              }))}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Find active student record if role is student
  const fallbackStudent: Student = {
    id: currentUser?.id || 'STU-DEMO',
    fullName: currentUser?.name || 'Student Account',
    admissionNo: currentUser?.admissionNo || 'JIPAS/2026/0001',
    gender: 'Male',
    className: 'Basic 1',
    rollNo: '01',
    dob: '2018-01-01',
    house: 'Blue House',
    parentName: 'Parent/Guardian',
    parentPhone: '+233 24 000 0000',
    department: 'Primary School',
    campus: 'JIPAS 1',
    status: 'Active',
    academicYear: '2026/2027',
    term: 'First Term',
    isCurrent: true,
    enrollmentDate: new Date().toISOString().split('T')[0]
  };

  const activeStudent = students.find(s => s.id === currentUser.id || s.admissionNo === currentUser.admissionNo) || students[0] || fallbackStudent;

  const fallbackTeacher: Teacher = {
    id: currentUser?.id || 'TCH-DEMO',
    staffId: currentUser?.teacherId || 'TCH-2026-001',
    name: currentUser?.name || 'School Teacher',
    email: currentUser?.email || 'teacher@jipas.edu.gh',
    phone: '0240000000',
    gender: 'Male',
    academicQualification: 'B.Ed. Basic Education',
    professionalQualification: 'Professional Teacher License',
    designation: 'Class Teacher',
    rank: 'Senior Superintendent I',
    department: 'Primary Department',
    classesTaught: ['Basic 1', 'Basic 2'],
    subjectsTaught: ['Mathematics', 'English Language', 'Science'],
    ntcLicenseNo: 'NTC/TR/2026/001',
    emergencyContact: '0244123456',
    bloodGroup: 'O+',
    dateOfEmployment: '2022-09-01',
    dateJoined: '2022-09-01'
  };
  const rawTeacher = teachers.find(t => t.email === currentUser?.email) || teachers[0] || fallbackTeacher;
  const activeTeacher: Teacher = {
    ...fallbackTeacher,
    ...rawTeacher,
    classesTaught: Array.isArray(rawTeacher?.classesTaught) && rawTeacher.classesTaught.length > 0 ? rawTeacher.classesTaught : ['Basic 1'],
    subjectsTaught: Array.isArray(rawTeacher?.subjectsTaught) && rawTeacher.subjectsTaught.length > 0 ? rawTeacher.subjectsTaught : ['Mathematics', 'English Language', 'Science']
  };

  return (
    <CampusProvider>
      <div 
        className="min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white"
      style={{
        backgroundColor: themePalette.backgroundColor,
        color: themePalette.textColor
      }}
    >
      {adminOriginalUser && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xl sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <span className="bg-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-xs">ADMIN IMPERSONATION MODE</span>
            <span>You are currently viewing the dashboard as <strong>{currentUser?.name}</strong> (<span className="uppercase">{currentUser?.role}</span>).</span>
          </div>
          <button
            onClick={() => {
              setCurrentUser(adminOriginalUser);
              setSessionRole(adminOriginalUser.role);
              setAdminOriginalUser(null);
              localStorage.removeItem('jipas_admin_original_user');
              localStorage.setItem('jipas_current_user', JSON.stringify(adminOriginalUser));
              localStorage.setItem('jipas_session_role', adminOriginalUser.role);
              localStorage.removeItem('jipas_active_page_admin');
              triggerToast('Returned to Master Admin Dashboard.');
            }}
            className="px-3.5 py-1.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-black shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <span>Return to Master Admin Dashboard</span>
          </button>
        </div>
      )}
      {/* Ambient glowing wave graphics matching theme design */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top subtle blue glow */}
        <div 
          className="absolute -top-40 left-1/4 w-[600px] h-[350px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: themePalette.primaryColor }}
        />
        {/* Bottom right futuristic silk wave glow */}
        <div className="absolute -bottom-24 right-0 w-[800px] h-[500px] bg-gradient-to-tl from-blue-700/20 via-indigo-600/15 to-purple-600/10 blur-3xl rounded-full" />
        <svg className="absolute bottom-0 right-0 w-full max-w-4xl h-96 opacity-40 mix-blend-screen" viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 400 C 300 350, 500 200, 1000 250 L 1000 400 L 0 400 Z" fill="url(#wave-grad-1)" />
          <path d="M100 400 C 400 320, 700 150, 1000 180 L 1000 400 L 100 400 Z" fill="url(#wave-grad-2)" opacity="0.6" />
          <defs>
            <linearGradient id="wave-grad-1" x1="0" y1="200" x2="1000" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="wave-grad-2" x1="100" y1="150" x2="1000" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B142A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-blue-800/60 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Consolidated Site Header Component */}
      <HeaderNavigation 
        currentUser={currentUser} 
        sessionRole={sessionRole} 
        themePalette={themePalette} 
        handleLogout={handleLogout} 
      />

      {/* Main Content Area with Subtle Slide-In Portal Transition */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 overflow-x-hidden">
        <OfflineIndicator />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sessionRole}
            initial={{ opacity: 0, x: 24, filter: 'blur(1px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -24, filter: 'blur(1px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {sessionRole === 'admin' && (
              <AdminPortal
                currentUser={currentUser}
                isLoading={!dbSynced}
                themePalette={themePalette}
                onUpdateThemePalette={(newPalette) => {
                  setThemePalette(newPalette);
                  saveThemePalette(newPalette);
                }}
                students={students}
                teachers={teachers}
                academicYears={academicYears}
                terms={terms}
                departments={departments}
                courses={courses}
                classes={classes}
                houses={houses}
                subjects={subjects}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                classFeeTariffs={classFeeTariffs}
                broadcasts={broadcasts}
                loginLogs={loginLogs}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onAddTeacher={handleAddTeacher}
                onUpdateTeacher={handleUpdateTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onUpdateAcademicYears={handleUpdateAcademicYears}
                onUpdateTerms={handleUpdateTerms}
                onUpdateDepartments={handleUpdateDepartments}
                onUpdateCourses={handleUpdateCourses}
                onUpdateClasses={handleUpdateClasses}
                onUpdateHouses={handleUpdateHouses}
                onUpdateSubjects={handleUpdateSubjects}
                onAddEvent={handleAddEvent}
                onAddPayment={handleAddPayment}
                onUpdateReports={handleUpdateReports}
                onUpdateBroadcasts={handleUpdateBroadcasts}
                onAddNotification={handleAddNotification}
                onRestoreData={handleRestoreData}
                onLogout={handleLogout}
                onCleanOrphaned={handleCleanOrphanedRecords}
                onClearAllData={handleClearAllData}
                onLoginAsUser={handleLoginAsUser}
              />
            )}

            {(sessionRole === 'headteacher' || sessionRole === 'headmaster' || sessionRole === 'hod') && (
              <HeadmasterPortal
                currentUser={currentUser}
                themePalette={themePalette}
                students={students}
                teachers={teachers}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                broadcasts={broadcasts}
              />
            )}

            {sessionRole === 'teacher' && (
              <TeacherPortal
                teacher={activeTeacher}
                students={students}
                teachers={teachers}
                departments={departments}
                courses={courses}
                classes={classes}
                subjects={subjects}
                houses={houses}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                broadcasts={broadcasts}
                onUpdateReport={handleUpdateSingleReport}
                onUpdateBroadcasts={handleUpdateBroadcasts}
                onAddStudent={handleAddStudent}
                onRestoreData={handleRestoreData}
                onLogout={handleLogout}
              />
            )}

            {sessionRole === 'accountant' && (
              <AccountantPortal
                currentUser={currentUser}
                bills={bills}
                payments={payments}
                students={students}
                onAddPayment={handleAddPayment}
                onAddNotification={handleAddNotification}
                onUpdateBills={(updatedBills) => {
                  setBills(updatedBills);
                  saveStoredBills(updatedBills);
                }}
                onLogout={handleLogout}
              />
            )}

            {(sessionRole === 'secretary' || sessionRole === 'clerk') && (
              <SecretaryPortal
                secretary={currentUser}
                students={students}
                bills={bills}
                payments={payments}
                courses={courses}
                calendarEvents={calendarEvents}
                notifications={notifications}
                onAddPayment={handleAddPayment}
                onAddNotification={handleAddNotification}
                onAddStudent={handleAddStudent}
                onUpdateBills={(updatedBills) => {
                  setBills(updatedBills);
                  saveStoredBills(updatedBills);
                }}
                onLogout={handleLogout}
              />
            )}

            {(sessionRole === 'student' || sessionRole === 'parent') && (
              <StudentPortal
                student={activeStudent}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                broadcasts={broadcasts}
              />
            )}

            {(sessionRole === 'ceo' || sessionRole === 'director' || currentUser.role === 'ceo' || currentUser.role === 'director') && (
              <CEOPortal
                currentUser={currentUser}
                students={students}
                teachers={teachers}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                academicYears={academicYears}
                terms={terms}
                departments={departments}
                classes={classes}
                houses={houses}
                subjects={subjects}
                onLogout={handleLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-[#040814]/90 border-t border-slate-800/60 py-6 text-center text-xs text-slate-400 relative z-10">
        <p>© 2026 JIPAS. All rights reserved. Powered by Academy Cloud Services & Supabase Cloud.</p>
      </footer>
    </div>
  </CampusProvider>
  );
}
