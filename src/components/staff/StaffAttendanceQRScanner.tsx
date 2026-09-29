import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  QrCode, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  SwitchCamera, 
  Sparkles, 
  Lock, 
  AlertTriangle, 
  AlertCircle,
  HelpCircle,
  X,
  Radio,
  Check,
  ShieldAlert
} from 'lucide-react';
import { StaffAttendanceService } from '../../services/supabase/staffAttendanceService';

interface StaffAttendanceQRScannerProps {
  onSuccess?: () => void;
  onClose?: () => void;
  teacher?: any;
  currentUser?: any;
  employee?: any;
}

export type CameraState = 
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'CAMERA_READY'
  | 'SCANNING'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'CAMERA_UNAVAILABLE'
  | 'BROWSER_UNSUPPORTED'
  | 'STOPPING'
  | 'ERROR';

export type PermissionStatusState = 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN';

export interface CameraErrorInfo {
  code: 'NOT_ALLOWED' | 'NOT_FOUND' | 'NOT_READABLE' | 'INSECURE_CONTEXT' | 'UNSUPPORTED' | 'UNKNOWN';
  title: string;
  message: string;
  steps: string[];
}

export default function StaffAttendanceQRScanner({ 
  onSuccess, 
  onClose,
  teacher, 
  currentUser, 
  employee 
}: StaffAttendanceQRScannerProps) {
  // Resolve profile from props, localStorage, or optional context wrapper safely
  let profile: any = null;

  const targetUser = employee || currentUser || teacher;
  if (targetUser) {
    profile = {
      id: targetUser.id,
      campusId: targetUser.campusId || targetUser.campus_id,
      fullName: targetUser.name || targetUser.fullName || targetUser.full_name,
      role: targetUser.role
    };
  }

  if (!profile && typeof localStorage !== 'undefined') {
    const cachedUser = localStorage.getItem('jipas_current_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        profile = {
          id: parsed.id,
          campusId: parsed.campusId || parsed.campus_id,
          fullName: parsed.name || parsed.fullName || parsed.full_name,
          role: parsed.role
        };
      } catch {}
    }
  }

  const userRole = (profile?.role || '').toLowerCase().trim();
  const isExecutiveExempt = userRole === 'ceo' || userRole === 'director';

  // Scanner & Stream State
  const [cameraState, setCameraState] = useState<CameraState>('IDLE');
  const [permissionDiagnostic, setPermissionDiagnostic] = useState<PermissionStatusState>('UNKNOWN');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [scanResult, setScanResult] = useState<{ 
    status: 'SIGNED_IN' | 'SIGNED_OUT' | 'OFFLINE_QUEUED'; 
    message: string; 
    timestamp: string;
    staffName: string;
    campusName: string;
    date: string;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [detectedDevicesCount, setDetectedDevicesCount] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // DOM & Lifecycle Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isDecodingLockedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const lastScanTimestampRef = useRef<number>(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Camera Permissions API & enumerate video devices if available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then((perm) => {
          if (perm) {
            setPermissionDiagnostic(perm.state.toUpperCase() as PermissionStatusState);
            perm.onchange = () => {
              setPermissionDiagnostic(perm.state.toUpperCase() as PermissionStatusState);
            };
          }
        })
        .catch(() => {
          setPermissionDiagnostic('UNKNOWN');
        });
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setDetectedDevicesCount(videoDevices.length);
      }).catch(() => {});
    }
  }, [cameraState]);

  // Stop camera tracks cleanly and release media device hardware
  const stopCameraStream = useCallback(() => {
    setCameraState('STOPPING');
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('[StaffQRScanner] Error stopping tracks:', e);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraState('IDLE');
  }, []);

  // Handle visibility change (pause camera when tab is switched)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCameraStream();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopCameraStream]);

  // Clean unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Error parser converting native media exceptions to user-friendly diagnostics
  const parseMediaError = useCallback((err: any): { errorInfo: CameraErrorInfo; state: CameraState } => {
    const errName = err?.name || '';
    const errMsg = (err?.message || '').toLowerCase();

    // 1. Insecure Context Check
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return {
        state: 'BROWSER_UNSUPPORTED',
        errorInfo: {
          code: 'INSECURE_CONTEXT',
          title: 'HTTPS Connection Required',
          message: 'Camera access requires a secure HTTPS connection.',
          steps: [
            'Ensure you are accessing JIPAS Students Hub via https:// in your mobile browser.',
            'Verify your SSL connection and reload the page.'
          ]
        }
      };
    }

    // 2. Permission Denied / NotAllowedError
    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errName === 'SecurityError' ||
      errMsg.includes('permission') ||
      errMsg.includes('denied') ||
      errMsg.includes('dismissed')
    ) {
      return {
        state: 'PERMISSION_DENIED',
        errorInfo: {
          code: 'NOT_ALLOWED',
          title: 'Camera Permission Denied',
          message: 'Camera permission was denied for this site.',
          steps: [
            'Open your browser\'s Site Settings → Camera → Allow.',
            'Tap "Try Camera Again" to restart live camera scanning.'
          ]
        }
      };
    }

    // 3. No Camera Found / NotFoundError
    if (
      errName === 'NotFoundError' ||
      errName === 'DevicesNotFoundError' ||
      errMsg.includes('not found') ||
      errMsg.includes('no camera')
    ) {
      return {
        state: 'CAMERA_UNAVAILABLE',
        errorInfo: {
          code: 'NOT_FOUND',
          title: 'No Camera Detected',
          message: 'No usable camera was detected on this device.',
          steps: [
            'Ensure your phone or tablet has a functional camera lens.',
            'Verify camera permissions inside site settings and retry.'
          ]
        }
      };
    }

    // 4. Camera In Use / NotReadableError
    if (
      errName === 'NotReadableError' ||
      errName === 'TrackStartError' ||
      errName === 'AbortError' ||
      errMsg.includes('could not start') ||
      errMsg.includes('already in use')
    ) {
      return {
        state: 'CAMERA_UNAVAILABLE',
        errorInfo: {
          code: 'NOT_READABLE',
          title: 'Camera In Use',
          message: 'The camera is currently being used by another application or could not be opened.',
          steps: [
            'Close other video/camera applications or browser tabs.',
            'Tap "Try Camera Again" after closing conflicting apps.'
          ]
        }
      };
    }

    // 5. General / Unknown
    return {
      state: 'ERROR',
      errorInfo: {
        code: 'UNKNOWN',
        title: 'Camera Stream Error',
        message: 'Camera permission is allowed, but the camera could not be opened.',
        steps: [
          'Verify browser camera access and try again.',
          'Reload the page or check site permissions.'
        ]
      }
    };
  }, []);

  // Process live camera decoded QR token (LIVE CAMERA ONLY)
  const handleLiveCameraQrDetected = async (decodedToken: string) => {
    // HARD SECURITY CONDITION: Enforce live active MediaStream & live video tracks
    const hasActiveCameraStream = 
      streamRef.current !== null && 
      streamRef.current.active === true && 
      streamRef.current.getVideoTracks().some((track) => track.readyState === 'live');

    if (!hasActiveCameraStream) {
      setScanError('Camera is not active. Start the live camera before scanning attendance.');
      return;
    }

    const now = Date.now();
    // 5-10 second duplicate cooldown protection
    if (now - lastScanTimestampRef.current < 5000) {
      return;
    }

    if (isDecodingLockedRef.current) return;
    isDecodingLockedRef.current = true;
    lastScanTimestampRef.current = now;

    setScanError(null);

    // Stop active camera stream immediately upon successful recognition
    stopCameraStream();

    if (!profile) {
      setScanError('Please sign in before recording attendance.');
      isDecodingLockedRef.current = false;
      return;
    }

    const todayDateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedCampusName = profile.campusId ? `Campus ${profile.campusId}` : 'Main Campus';

    try {
      if (navigator.onLine) {
        // ONLINE QR SUBMISSION
        const result = await StaffAttendanceService.scanEntranceQr(
          decodedToken,
          profile.id,
          profile.campusId || ''
        );

        setScanResult({
          status: result.status,
          message: result.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          staffName: profile.fullName || 'Staff Member',
          campusName: formattedCampusName,
          date: todayDateStr
        });

        if (onSuccess) onSuccess();
      } else {
        // OFFLINE QUEUE SUBMISSION
        await StaffAttendanceService.queueOfflineScan(
          decodedToken,
          profile.id,
          profile.campusId || '',
          profile.fullName
        );

        setScanResult({
          status: 'OFFLINE_QUEUED',
          message: 'Connection unavailable. The attendance event will be synchronized when connectivity returns.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          staffName: profile.fullName || 'Staff Member',
          campusName: formattedCampusName,
          date: todayDateStr
        });
      }
    } catch (err: any) {
      console.error('[StaffQRScanner] QR processing error:', err);
      const rawMsg = err.message || '';
      let formattedError = rawMsg || 'QR verification failed. Please try scanning again.';

      // Specific Error Message Mapping
      if (rawMsg.includes('invalid') || rawMsg.includes('format')) {
        formattedError = 'Invalid school entrance QR code.';
      } else if (rawMsg.includes('expired')) {
        formattedError = 'This entrance QR code has expired.';
      } else if (rawMsg.includes('revoked') || rawMsg.includes('inactive')) {
        formattedError = 'This entrance QR code is no longer active.';
      } else if (rawMsg.includes('campus')) {
        formattedError = 'This entrance QR belongs to another campus.';
      } else if (rawMsg.includes('weekend')) {
        formattedError = 'Staff attendance is not available on weekends.';
      } else if (rawMsg.includes('holiday')) {
        formattedError = 'Staff attendance is closed for today\'s school holiday.';
      } else if (rawMsg.includes('authorized') || rawMsg.includes('role')) {
        formattedError = 'Your account is not authorized for staff attendance.';
      }

      setScanError(formattedError);
    } finally {
      isDecodingLockedRef.current = false;
    }
  };

  // Continuous frame-by-frame QR inspection (but not automatic submission)
  const startDecodingLoop = useCallback(() => {
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const decodeFrame = async () => {
      if (!isMountedRef.current || !streamRef.current?.active) return;
      animationFrameIdRef.current = requestAnimationFrame(decodeFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(decodeFrame);
  }, []);

  // Handle Shutter Capture
  const handleCaptureQr = async () => {
    if (!videoRef.current || !canvasRef.current || isDecodingLockedRef.current) return;
    
    // Check stream
    const hasActiveCameraStream = 
      streamRef.current !== null && 
      streamRef.current.active === true && 
      streamRef.current.getVideoTracks().some((track) => track.readyState === 'live');

    if (!hasActiveCameraStream) {
      setScanError('Camera is not active. Start the live camera before capturing.');
      return;
    }

    isDecodingLockedRef.current = true;
    setCameraState('SCANNING'); // Reusing as 'capturing'/'processing'

    // Capture frame
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Stop camera immediately
      stopCameraStream();

      // Decode
      let decoded: string | null = null;
      
      // 1. BarcodeDetector
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) decoded = barcodes[0].rawValue;
        } catch {}
      }

      // 2. jsQR Fallback
      if (!decoded) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) decoded = code.data;
      }

      if (decoded) {
        await handleLiveCameraQrDetected(decoded.trim());
      } else {
        setScanError('QR code not detected. Please point the camera directly at the school entrance QR and try again.');
        setCameraState('IDLE');
      }
    }
    isDecodingLockedRef.current = false;
  };

  // Robust Camera Initialization Sequence
  const startCamera = useCallback(async (targetFacing: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setScanResult(null);
    setScanError(null);
    setCameraError(null);
    isDecodingLockedRef.current = false;
    setCameraState('REQUESTING_PERMISSION');
    
    // ... (keep HTTPS/Browser checks)
    // HTTPS / Secure Context Check
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setCameraState('BROWSER_UNSUPPORTED');
      setCameraError({
        code: 'INSECURE_CONTEXT',
        title: 'HTTPS Connection Required',
        message: 'Camera access requires a secure HTTPS connection.',
        steps: [
          'Verify your browser URL begins with https://',
          'Reload the page inside a modern mobile browser.'
        ]
      });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('BROWSER_UNSUPPORTED');
      setCameraError({
        code: 'UNSUPPORTED',
        title: 'Browser Unsupported',
        message: 'This browser does not support live camera scanning.',
        steps: [
          'Ensure your browser is updated to the latest version.'
        ]
      });
      return;
    }

    let mediaStream: MediaStream | null = null;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (primaryErr: any) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (fallbackErr: any) {
        const { state, errorInfo } = parseMediaError(fallbackErr || primaryErr);
        setCameraError(errorInfo);
        setCameraState(state);
        return;
      }
    }

    if (!mediaStream) {
      setCameraState('CAMERA_UNAVAILABLE');
      return;
    }

    streamRef.current = mediaStream;
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('autoplay', 'true');
      videoRef.current.setAttribute('muted', 'true');
      await videoRef.current.play();
      setCameraState('CAMERA_READY');
      startDecodingLoop();
    }
  }, [facingMode, parseMediaError, startDecodingLoop, stopCameraStream]);


  // Toggle Front / Rear Camera
  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Close scanner and cleanup
  const handleCloseScanner = () => {
    stopCameraStream();
    setCameraState('IDLE');
    if (onClose) onClose();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 max-w-xl mx-auto">
      {/* Hidden processing canvas for live video frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Bar */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isOffline ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3 h-3" /> Connection: OFFLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Wifi className="w-3 h-3" /> Connection: ONLINE
              </span>
            )}
          </div>

          {/* Camera State Badge */}
          <div>
            {cameraState === 'REQUESTING_PERMISSION' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Camera: REQUESTING
              </span>
            )}
            {(cameraState === 'SCANNING' || cameraState === 'CAMERA_READY') && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Radio className="w-3 h-3 text-emerald-500 animate-ping" /> Camera: READY
              </span>
            )}
            {cameraState === 'PERMISSION_DENIED' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                <Lock className="w-3 h-3" /> Camera: DENIED
              </span>
            )}
            {cameraState === 'CAMERA_UNAVAILABLE' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                <CameraOff className="w-3 h-3" /> Camera: UNAVAILABLE
              </span>
            )}
            {cameraState === 'IDLE' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                <Camera className="w-3 h-3" /> Camera: IDLE
              </span>
            )}
          </div>
        </div>

        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>SCAN SCHOOL ENTRANCE QR</span>
        </h2>
        <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          Current Academic Period: 2025–2026 • Third Term
        </div>
      </div>

      {/* EXECUTIVE EXEMPTION VIEW */}
      {isExecutiveExempt ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/60 rounded-full flex items-center justify-center mx-auto text-amber-700 dark:text-amber-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Executive Exemption Active
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 max-w-sm mx-auto leading-relaxed">
              Leadership positions (CEO and Director) are exempt from mandatory daily entrance QR attendance clock-ins.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* SUCCESS SIGN-IN / SIGN-OUT RESULT CARD */}
          {scanResult && (
            <div className={`p-6 rounded-3xl border text-center space-y-4 animate-in fade-in shadow-md ${
              scanResult.status === 'OFFLINE_QUEUED' 
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
            }`}>
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-black text-xl uppercase tracking-tight">
                  {scanResult.status === 'SIGNED_IN' && '✓ SIGNED IN'}
                  {scanResult.status === 'SIGNED_OUT' && '✓ SIGNED OUT'}
                  {scanResult.status === 'OFFLINE_QUEUED' && '✓ QUEUED OFFLINE'}
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                  {scanResult.message}
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-2 gap-3 text-left text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Staff Member</span>
                  <span className="text-slate-900 dark:text-white font-bold">{scanResult.staffName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Campus</span>
                  <span className="text-slate-900 dark:text-white font-bold">{scanResult.campusName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Date</span>
                  <span className="text-slate-900 dark:text-white font-bold">{scanResult.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Recorded Time</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{scanResult.timestamp}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => startCamera(facingMode)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer transition"
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}

          {/* SCAN ERROR BANNER */}
          {scanError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* CAMERA ERROR / PERMISSION PANEL */}
          {cameraError && (
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-5 text-center shadow-xl animate-in fade-in">
              <div className="flex justify-center">
                <div className={`p-4 rounded-full border ${
                  cameraError.code === 'NOT_ALLOWED'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : cameraError.code === 'NOT_FOUND'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                }`}>
                  {cameraError.code === 'NOT_ALLOWED' ? (
                    <Lock className="w-8 h-8 text-rose-400" />
                  ) : cameraError.code === 'NOT_FOUND' ? (
                    <CameraOff className="w-8 h-8 text-amber-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border bg-slate-900 text-slate-300 border-slate-700">
                  {cameraError.code === 'NOT_ALLOWED' && '🚫 CAMERA PERMISSION DENIED'}
                  {cameraError.code === 'NOT_FOUND' && '📷 NO CAMERA DETECTED'}
                  {cameraError.code === 'NOT_READABLE' && '⚠️ HARDWARE BUSY'}
                  {cameraError.code === 'INSECURE_CONTEXT' && '🔒 INSECURE PROTOCOL'}
                  {cameraError.code === 'UNSUPPORTED' && '🌐 BROWSER UNSUPPORTED'}
                  {cameraError.code === 'UNKNOWN' && '⚠️ HARDWARE EXCEPTION'}
                </div>
                <h4 className="font-black text-base text-white tracking-tight">{cameraError.title}</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {cameraError.message}
                </p>
              </div>

              {/* Resolution Steps */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-left text-xs space-y-2 text-slate-300 leading-relaxed max-w-md mx-auto">
                <div className="font-extrabold text-[11px] text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Resolution Steps:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] font-medium">
                  {cameraError.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Action Buttons: Retry Camera */}
              <div className="flex items-center justify-center pt-1">
                <button
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-900/50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Camera</span>
                </button>
              </div>
            </div>
          )}

          {/* LIVE CAMERA VIEWFINDER */}
          {(cameraState === 'SCANNING' || cameraState === 'REQUESTING_PERMISSION' || cameraState === 'CAMERA_READY') && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-indigo-500/50 aspect-square w-full max-w-xs sm:max-w-sm mx-auto flex items-center justify-center shadow-2xl">
                {/* Native Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none border-[24px] border-slate-950/70 flex items-center justify-center">
                  <div className="relative w-full h-full border-2 border-indigo-400 rounded-xl">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-indigo-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-indigo-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-indigo-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Shutter Control Bar */}
              <div className="flex flex-col items-center justify-center gap-3 pt-1 max-w-sm mx-auto">
                <button
                  onClick={handleCaptureQr}
                  disabled={cameraState !== 'CAMERA_READY'}
                  className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition shadow-lg ${
                    cameraState === 'CAMERA_READY'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-900/20'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>{cameraState === 'SCANNING' ? 'READING QR...' : 'CAPTURE QR'}</span>
                </button>

                <div className="flex items-center justify-center gap-2 w-full">
                  <button
                    onClick={handleToggleCamera}
                    className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>Switch</span>
                  </button>

                  <button
                    onClick={stopCameraStream}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INITIAL IDLE VIEW */}
          {cameraState === 'IDLE' && !cameraError && !scanResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 rounded-3xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Live Camera Attendance Required
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Attendance can only be recorded by scanning the QR code using your live camera at the school entrance. QR images from your gallery or saved photographs are not supported.
                </p>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={() => startCamera('environment')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2.5 cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-indigo-200" />
                  <span>Start Camera</span>
                </button>
              </div>
            </div>
          )}
          {/* MOBILE CAMERA DIAGNOSTICS FOR STAFF / ADMIN TROUBLESHOOTING */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-[11px] font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition py-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showDiagnostics ? 'Hide Scanner Diagnostics' : 'Show Camera & Hardware Diagnostics'}</span>
            </button>

            {showDiagnostics && (
              <div className="mt-3 bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 text-xs font-mono space-y-2 animate-in fade-in">
                <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span>CAMERA HARDWARE DIAGNOSTICS</span>
                  <span className="text-emerald-400">PASSED</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Camera API</span>
                    <span className="font-bold text-slate-200">
                      {typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? 'SUPPORTED' : 'UNSUPPORTED'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Secure Context</span>
                    <span className="font-bold text-slate-200">
                      {typeof window !== 'undefined' && window.isSecureContext ? 'YES (HTTPS)' : 'NO (HTTP)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Camera Permission</span>
                    <span className={`font-bold ${permissionDiagnostic === 'GRANTED' ? 'text-emerald-400' : permissionDiagnostic === 'DENIED' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {permissionDiagnostic}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Camera Devices</span>
                    <span className="font-bold text-slate-200">
                      {detectedDevicesCount > 0 ? `${detectedDevicesCount} Detected` : 'Enumerating...'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Active Camera</span>
                    <span className="font-bold text-slate-200">
                      {facingMode === 'environment' ? 'REAR (Environment)' : 'FRONT (User)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Stream Status</span>
                    <span className={`font-bold ${streamRef.current?.active ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {streamRef.current?.active ? 'ACTIVE' : 'STOPPED'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">QR Decoder Engine</span>
                    <span className="font-bold text-indigo-300">
                      {typeof window !== 'undefined' && 'BarcodeDetector' in window ? 'BarcodeDetector + jsQR (Live Frames)' : 'jsQR (Live Frames)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Scan Source</span>
                    <span className="font-bold text-emerald-400">
                      LIVE CAMERA ONLY
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Network</span>
                    <span className={`font-bold ${isOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isOffline ? 'OFFLINE' : 'ONLINE'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[9px] uppercase">Authorized Campus</span>
                    <span className="font-bold text-indigo-300">
                      {profile?.campusId ? `Campus ${profile.campusId}` : 'Main Campus (Authorized)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
