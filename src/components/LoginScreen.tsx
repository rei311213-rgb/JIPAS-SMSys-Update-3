import React, { useState, useEffect } from 'react';
import { User, DEFAULT_CEO_PRIVILEGES } from '../types';
import { 
  Mail, Eye, EyeOff, LogIn, CheckCircle2, Lock, Loader2, 
  AlertCircle, ShieldCheck
} from 'lucide-react';
import JIPASLogo from './common/JIPASLogo';
import LanguageSwitcher from './common/LanguageSwitcher';
import { 
  requestPasswordReset, 
  getStoredUsers, 
  authenticateWithFirebase,
  DEFAULT_ACCOUNTANT_PRIVILEGES,
  DEFAULT_SUB_ACCOUNTANT_PRIVILEGES
} from '../services/dbService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  studentsList: { id: string; name: string; admissionNo: string; email?: string; parentPhone?: string }[];
  teachersList?: { id: string; name: string; email: string; classAssigned?: string }[];
}

export default function LoginScreen({ onLogin, studentsList, teachersList = [] }: LoginScreenProps) {
  const [activeWallpaper] = useState<'classroom' | 'assembly'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jipas_login_wallpaper');
      if (saved === 'classroom' || saved === 'assembly') return saved;
    }
    return 'classroom';
  });
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authSuccessNotice, setAuthSuccessNotice] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // --------------------------------------------------------------------------
  // Unified Login Handler
  // --------------------------------------------------------------------------
  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAuthSuccessNotice('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMsg('Please enter your email, username, staff ID, or student admission number.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password or access PIN.');
      return;
    }

    setIsLoading(true);

    try {
      const lower = trimmedId.toLowerCase();

      // ==========================================
      // 1. ADMIN AUTHENTICATION (JAKRei)
      // ==========================================
      const isAdminIdentifier = 
        lower === 'rei311213@gmail.com' ||
        lower === 'rei311213' ||
        lower === 'jakrei';

      if (isAdminIdentifier) {
        if (password !== 'Livinus@23') {
          setErrorMsg('Incorrect administrator password. Please check your credentials.');
          setIsLoading(false);
          return;
        }

        const adminEmail = 'rei311213@gmail.com';
        const adminName = 'JAKRei';

        try {
          const adminUser = await authenticateWithFirebase(adminEmail, password, 'admin', {
            name: adminName,
            email: adminEmail,
            role: 'admin'
          });
          
          setAuthSuccessNotice('Administrator authenticated. Redirecting to Administration Portal...');
          setTimeout(() => onLogin(adminUser), 400);
        } catch {
          // If network / Firebase auth fails, allow offline admin login since password matched
          const adminUser: User = {
            id: 'u-admin',
            name: adminName,
            email: adminEmail,
            role: 'admin',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };
          setAuthSuccessNotice('Administrator authenticated. Redirecting to Administration Portal...');
          setTimeout(() => onLogin(adminUser), 400);
        }
        return;
      }

      // ==========================================
      // 1.1 CHECK DYNAMIC USERS DATABASE FIRST (Includes Admin, CEO, Director, Staff, Student)
      // ==========================================
      const storedUsers = getStoredUsers();
      const matchedUserAccount = storedUsers.find(u => 
        (u.email && u.email.toLowerCase() === lower) ||
        (u.username && u.username.toLowerCase() === lower) ||
        (u.phone && u.phone === trimmedId) ||
        (u.staffId && u.staffId.toLowerCase() === lower) ||
        (u.admissionNo && u.admissionNo.toLowerCase() === lower) ||
        (u.id && u.id.toLowerCase() === lower)
      );

      if (matchedUserAccount) {
        if (matchedUserAccount.status === 'Pending' || matchedUserAccount.isApproved === false) {
          setErrorMsg('Your account is currently pending approval by the School Administrator. You will be granted access as soon as it is approved.');
          setIsLoading(false);
          return;
        }

        if (matchedUserAccount.status === 'Inactive' || matchedUserAccount.status === 'Locked') {
          setErrorMsg('This account is currently inactive or locked. Please contact the school administrator.');
          setIsLoading(false);
          return;
        }

        // Explicitly reject administrator password for non-admin accounts
        if (password.toLowerCase() === 'livinus@23' && matchedUserAccount.role !== 'admin') {
          setErrorMsg('Incorrect password. The administrator password cannot be used for staff or teacher logins.');
          setIsLoading(false);
          return;
        }

        // Validate password based on account type
        const isStudentOrParentAccount = matchedUserAccount.role === 'student' || (matchedUserAccount as any).registrationType === 'student';
        const isExecutiveAccount = matchedUserAccount.role === 'ceo' || matchedUserAccount.role === 'director' || (matchedUserAccount as any).registrationType === 'executive';
        const isStaffAccount = matchedUserAccount.role === 'accountant' || matchedUserAccount.role === 'secretary' || matchedUserAccount.role === 'teacher' || matchedUserAccount.role === 'admin';
        
        const isPasswordValid = 
          (matchedUserAccount.password && matchedUserAccount.password === password) ||
          (!matchedUserAccount.password && (
            (isExecutiveAccount && (
              password === 'CEO@2026' ||
              password === 'Director@2026' ||
              password === '123456' ||
              password.toLowerCase() === 'password'
            )) ||
            (isStudentOrParentAccount && (
              password.toLowerCase() === (matchedUserAccount.admissionNo || '').toLowerCase() ||
              password.toLowerCase() === (matchedUserAccount.id || '').toLowerCase() ||
              password === (matchedUserAccount.phone || (matchedUserAccount as any).parentPhone) ||
              password.toLowerCase() === 'student' ||
              password.toLowerCase() === 'parent' ||
              password === '123456'
            )) ||
            (isStaffAccount && (
              password === '123456' ||
              password.toLowerCase() === 'password' ||
              password.toLowerCase() === (matchedUserAccount.username || '').toLowerCase() ||
              password.toLowerCase() === (matchedUserAccount.role || '').toLowerCase()
            ))
          ));

        if (!isPasswordValid) {
          setErrorMsg(isStudentOrParentAccount 
            ? "Incorrect password. Parents & students can use their registered password, access PIN, or Student ID."
            : isExecutiveAccount
            ? "Incorrect executive password. Please enter your administrator-configured password."
            : "Incorrect password. Please try again or contact administration."
          );
          setIsLoading(false);
          return;
        }

        if (isExecutiveAccount) {
          const execTitle = matchedUserAccount.executiveTitle || (matchedUserAccount.role === 'director' ? 'Board Director' : 'School Proprietor (CEO)');
          setAuthSuccessNotice(`Executive access granted. Welcome, ${matchedUserAccount.name}! Routing to Executive Dashboard...`);
          setTimeout(() => {
            onLogin({
              id: matchedUserAccount.id,
              name: matchedUserAccount.name,
              email: matchedUserAccount.email,
              role: matchedUserAccount.role as any,
              phone: matchedUserAccount.phone,
              executiveTitle: execTitle,
              department: matchedUserAccount.department,
              leadershipTitle: matchedUserAccount.leadershipTitle,
              ceoPrivileges: matchedUserAccount.ceoPrivileges || DEFAULT_CEO_PRIVILEGES,
              avatar: (matchedUserAccount as any).avatar || (matchedUserAccount.role === 'director'
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
            });
          }, 400);
          return;
        }

        const isWardView = isStudentOrParentAccount;
        setAuthSuccessNotice(
          isWardView 
            ? `Welcome! Accessing ${matchedUserAccount.name}'s Ward & Student Portal...`
            : `Welcome back, ${matchedUserAccount.name}! Routing to your portal...`
        );

        setTimeout(() => {
          onLogin({
            id: matchedUserAccount.id,
            name: matchedUserAccount.name,
            email: matchedUserAccount.email,
            role: matchedUserAccount.role,
            phone: matchedUserAccount.phone,
            classAssigned: (matchedUserAccount as any).classAssigned || matchedUserAccount.className,
            admissionNo: (matchedUserAccount as any).admissionNo,
            allowedModules: (matchedUserAccount as any).allowedModules,
            privilege: (matchedUserAccount as any).privilege,
            department: matchedUserAccount.department,
            leadershipTitle: matchedUserAccount.leadershipTitle,
            headteacherPrivileges: matchedUserAccount.headteacherPrivileges,
            hodPrivileges: matchedUserAccount.hodPrivileges,
            accountantPrivileges: matchedUserAccount.accountantPrivileges,
            avatar: (matchedUserAccount as any).avatar || (matchedUserAccount.role === 'teacher' 
              ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80')
          });
        }, 400);
        return;
      }

      // ==========================================
      // 1.2 FALLBACK CEO / DIRECTOR INITIAL AUTHENTICATION (When not yet stored)
      // ==========================================
      const isCEOIdentifier = 
        lower === 'ceo@jipas.edu.gh' ||
        lower === 'ceo' ||
        lower === 'proprietor';

      const isDirectorIdentifier =
        lower === 'director@jipas.edu.gh' ||
        lower === 'director';

      if (isCEOIdentifier) {
        if (password !== 'CEO@2026') {
          setErrorMsg('Incorrect CEO/Proprietor access PIN.');
          setIsLoading(false);
          return;
        }

        const ceoUser: User = {
          id: 'usr-ceo-1',
          name: 'Dr. Kwame Mensah',
          executiveTitle: 'School Proprietor (CEO)',
          email: 'ceo@jipas.edu.gh',
          role: 'ceo',
          ceoPrivileges: DEFAULT_CEO_PRIVILEGES,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        };

        setAuthSuccessNotice('Executive access granted. Redirecting to CEO/Proprietor Dashboard...');
        setTimeout(() => onLogin(ceoUser), 400);
        return;
      }

      if (isDirectorIdentifier) {
        if (password !== 'Director@2026' && password !== 'CEO@2026') {
          setErrorMsg('Incorrect Director access PIN.');
          setIsLoading(false);
          return;
        }

        const directorUser: User = {
          id: 'usr-director-1',
          name: 'Nana Yaw Osei-Bonsu',
          executiveTitle: 'Executive Board Director',
          email: 'director@jipas.edu.gh',
          role: 'director',
          ceoPrivileges: {
            ...DEFAULT_CEO_PRIVILEGES,
            canViewDetailedExpenses: false,
            canViewPayrollDetails: false,
            canViewParentContacts: false,
            readOnlyMode: true
          },
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };

        setAuthSuccessNotice('Executive access granted. Redirecting to Executive Director Dashboard...');
        setTimeout(() => onLogin(directorUser), 400);
        return;
      }

      // ==========================================
      // 3. REGISTERED TEACHER AUTHENTICATION (from teachersList)
      // ==========================================
      const matchedTeacher = teachersList.find(t => 
        (t.email && t.email.toLowerCase() === lower) ||
        (t.id && t.id.toLowerCase() === lower)
      );

      if (matchedTeacher) {
        if (password.toLowerCase() === 'livinus@23') {
          setErrorMsg('Incorrect password. The administrator password cannot be used for staff or teacher logins.');
          setIsLoading(false);
          return;
        }
        try {
          const authUser = await authenticateWithFirebase(matchedTeacher.email, password, 'teacher', {
            id: matchedTeacher.id,
            name: matchedTeacher.name,
            classAssigned: matchedTeacher.classAssigned,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
          });
          setAuthSuccessNotice(`Welcome back, ${matchedTeacher.name}! Redirecting to Teacher Portal...`);
          setTimeout(() => onLogin(authUser), 400);
        } catch (err: any) {
          const errMsg = err?.message || '';
          if (errMsg.includes('password') || errMsg.includes('Incorrect') || errMsg.includes('administrator')) {
            setErrorMsg(errMsg || 'Incorrect password.');
            setIsLoading(false);
            return;
          }
          setAuthSuccessNotice(`Welcome back, ${matchedTeacher.name}! Redirecting to Teacher Portal...`);
          setTimeout(() => {
            onLogin({
              id: matchedTeacher.id,
              name: matchedTeacher.name,
              email: matchedTeacher.email,
              role: 'teacher',
              classAssigned: matchedTeacher.classAssigned,
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
            });
          }, 400);
        }
        return;
      }

      // ==========================================
      // 4. REGISTERED STUDENT / PARENT AUTHENTICATION (from studentsList)
      // Parents use student ID / admission number to access their ward's portal
      // ==========================================
      const matchedStudent = studentsList.find(s => 
        (s.admissionNo && s.admissionNo.toLowerCase() === lower) ||
        (s.id && s.id.toLowerCase() === lower) ||
        (s.email && s.email.toLowerCase() === lower) ||
        (s.parentPhone && s.parentPhone.replace(/\s+/g, '') === trimmedId.replace(/\s+/g, '')) ||
        ((s as any).rollNo && (s as any).rollNo.toLowerCase() === lower)
      );

      if (matchedStudent) {
        const studentDisplayName = (matchedStudent as any).fullName || matchedStudent.name || 'Student';
        const studentEmail = matchedStudent.email || `${matchedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.jipas.com`;

        try {
          const authUser = await authenticateWithFirebase(studentEmail, password, 'student', {
            id: matchedStudent.id,
            name: studentDisplayName,
            admissionNo: matchedStudent.admissionNo,
            avatar: (matchedStudent as any).photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'
          });
          setAuthSuccessNotice(`Welcome! Accessing ${studentDisplayName}'s Ward & Student Portal...`);
          setTimeout(() => onLogin(authUser), 400);
        } catch (err: any) {
          const errMsg = err?.message || '';
          if (errMsg.includes('password') || errMsg.includes('Incorrect') || errMsg.includes('administrator')) {
            setErrorMsg(errMsg || 'Incorrect password.');
            setIsLoading(false);
            return;
          }
          setAuthSuccessNotice(`Welcome! Accessing ${studentDisplayName}'s Ward & Student Portal...`);
          setTimeout(() => {
            onLogin({
              id: matchedStudent.id,
              name: studentDisplayName,
              email: studentEmail,
              role: 'student',
              admissionNo: matchedStudent.admissionNo,
              avatar: (matchedStudent as any).photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'
            });
          }, 400);
        }
        return;
      }

      // ==========================================
      // 5. UNKNOWN CREDENTIALS
      // ==========================================
      setErrorMsg('Invalid credentials. No active account found matching your details. Please verify your Staff ID, Student ID, or Email and Password.');
    } catch (err: any) {
      console.error('Unified login error:', err);
      setErrorMsg(err?.message || 'Authentication error. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* High-Resolution School Wallpaper Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-100"
        style={{ 
          backgroundImage: `url(${activeWallpaper === 'classroom' ? '/wallpapers/classroom.jpg' : '/wallpapers/assembly.jpg'})` 
        }}
      />
      {/* Cinematic Dark Gradient & Atmosphere Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/90 backdrop-blur-[1.5px]" />
      <div className="absolute inset-0 bg-blue-950/20 mix-blend-overlay" />

      {/* Language Switcher Wrapper */}
      <div className="absolute top-4 right-4 z-20 flex items-center">
        <LanguageSwitcher variant="pill" />
      </div>

      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top School Branding Header */}
      <div className="flex flex-col items-center mb-6 text-center z-10 space-y-3">
        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
          <JIPASLogo size="lg" rounded={false} />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2 drop-shadow-md">
            <span>JIPAS</span>
            <span className="text-emerald-400 font-light">•</span>
            <span className="text-base sm:text-lg font-bold text-indigo-200 tracking-normal">Academic Portal</span>
          </h1>
          <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mt-0.5 drop-shadow-sm">
            Education is Wealth • GES Accredited System
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SIGN IN & USER AUTHENTICATION CARD                            */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full max-w-[480px] mx-auto z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6 sm:p-8 z-10 transition-all duration-300">
          
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-slate-900 font-black text-xl tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-500">
              Enter your credentials to be automatically routed to your portal.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authSuccessNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{authSuccessNotice}</span>
            </div>
          )}

          <form onSubmit={handleUnifiedSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Email, Staff ID, or Student ID</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-detected</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. staff_id, student ID, or email"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password or Access PIN
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const targetEmail = identifier.includes('@') ? identifier.trim() : prompt('Please enter your account email address for password reset:');
                    if (!targetEmail) return;
                    try {
                      await requestPasswordReset(targetEmail);
                      alert(`Password reset instructions have been dispatched to ${targetEmail}. Please check your inbox or contact the administration.`);
                    } catch (e: any) {
                      alert(e?.message || 'Failed to dispatch reset request. Please contact school administration.');
                    }
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs text-slate-600 font-medium">Remember this device</span>
              </label>

              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                AES Secured
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-indigo-900 active:scale-[0.99] disabled:opacity-75 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Authenticating & Routing to Portal...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In to Portal</span>
                </>
              )}
            </button>
          </form>

          {/* School-Provisioned Accounts Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-1.5">
            <p className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
              <span>School-Provisioned Account Access</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
              Faculty & staff login user accounts are automatically created by the school administration with secure credentials. Teachers have the privilege to edit their login details in the teacher portal with admin approval. Students and parents access the portal directly using their Student Admission ID.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="mt-8 text-center text-xs text-slate-400 font-medium z-10">
        © 2026 JIPAS • Professional Academic & Financial Management Platform
      </div>
    </div>
  );
}
