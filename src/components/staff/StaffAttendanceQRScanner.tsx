import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, ShieldCheck, AlertCircle, RefreshCw, Smartphone, QrCode, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { StaffAttendanceService } from '../../services/supabase/staffAttendanceService';

interface StaffAttendanceQRScannerProps {
  onSuccess?: () => void;
  teacher?: any;
}

export default function StaffAttendanceQRScanner({ onSuccess, teacher }: StaffAttendanceQRScannerProps) {
  // Resolve profile from props, localStorage, or optional context wrapper safely
  let profile: any = null;

  if (teacher) {
    profile = {
      id: teacher.id,
      campusId: teacher.campusId || teacher.campus_id,
      fullName: teacher.name || teacher.fullName || teacher.full_name
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
          fullName: parsed.name || parsed.fullName || parsed.full_name
        };
      } catch {}
    }
  }

  if (!profile) {
    console.log('[StaffAttendanceQRScanner] Relying strictly on local storage profile data.');
  }

  const [isScannerActive, setIsCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: string; message: string; timestamp: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const isScanningLockedRef = useRef(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setScanResult(null);
    setScanError(null);
    setCameraPermissionError(null);
    isScanningLockedRef.current = false;

    setIsCameraActive(true);

    // Short delay to ensure container element is rendered in DOM
    setTimeout(async () => {
      try {
        const scannerInstance = new Html5Qrcode("staff-qr-reader-container");
        qrCodeInstanceRef.current = scannerInstance;

        await scannerInstance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          handleScanSuccess,
          () => {} // Quiet failure logs during active scanning
        );
      } catch (err: any) {
        console.warn('[StaffQRScanner] Camera start exception:', err);
        setCameraPermissionError(
          err.message || 'Camera permission was denied or camera hardware is currently unavailable.'
        );
        setIsCameraActive(false);
      }
    }, 150);
  };

  const stopScanning = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (e) {
        console.warn('[StaffQRScanner] Error stopping scanner:', e);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsCameraActive(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isScanningLockedRef.current) return;
    isScanningLockedRef.current = true; // Lock scanning pipeline immediately

    // Play visual feedback
    setScanError(null);

    // Stop camera stream immediately upon success
    await stopScanning();

    if (!profile) {
      setScanError('You must be logged in as an authorized staff member.');
      isScanningLockedRef.current = false;
      return;
    }

    try {
      if (navigator.onLine) {
        // --- ONLINE REPLAY ---
        const result = await StaffAttendanceService.scanEntranceQr(
          decodedText,
          profile.id,
          profile.campusId || ''
        );

        setScanResult({
          status: result.status,
          message: result.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (onSuccess) onSuccess();
      } else {
        // --- OFFLINE QUEUEING ---
        await StaffAttendanceService.queueOfflineScan(
          decodedText,
          profile.id,
          profile.campusId || '',
          profile.fullName
        );

        setScanResult({
          status: 'OFFLINE_QUEUED',
          message: 'Attendance recorded offline. Waiting for network synchronization.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err: any) {
      console.error('[StaffQRScanner] Scan registration failed:', err);
      setScanError(err.message || 'Verification failed. Please try scanning again.');
    } finally {
      isScanningLockedRef.current = false;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          {isOffline ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
              <WifiOff className="w-3 h-3" /> Offline Mode Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Wifi className="w-3 h-3" /> Online Connected
            </span>
          )}
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-600" />
          <span>Scan School Entrance QR Code</span>
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Present your camera lens to the official JIPAS entrance poster to record your daily arrival and departure timestamps.
        </p>
      </div>

      {scanResult && (
        <div className={`p-4 rounded-2xl border text-center space-y-2 animate-in fade-in ${
          scanResult.status === 'OFFLINE_QUEUED' 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${scanResult.status === 'OFFLINE_QUEUED' ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span className="font-bold text-sm">Scan Successful!</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed">{scanResult.message}</p>
          <div className="text-[10px] font-mono text-slate-500 font-bold">Registered at {scanResult.timestamp}</div>
        </div>
      )}

      {scanError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {cameraPermissionError && (
        <div className="bg-slate-950 text-white rounded-3xl p-5 border border-slate-800 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Camera Stream Blocked</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              {cameraPermissionError}
            </p>
          </div>
          <div className="bg-slate-900 p-3.5 rounded-xl text-left text-[10px] space-y-1.5 text-slate-300 leading-normal max-w-sm mx-auto">
            <div className="font-black text-amber-400 uppercase tracking-wider">💡 Quick Checklist:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Tap the settings slider/padlock icon left of URL.</li>
              <li>Set <strong>Camera</strong> access to <strong>Allow</strong>.</li>
              <li>Ensure no other app is actively locking your lens.</li>
            </ol>
          </div>
          <button
            onClick={startScanning}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Enabling Camera Again
          </button>
        </div>
      )}

      {isScannerActive ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500/50 aspect-square max-w-xs mx-auto flex items-center justify-center">
            {/* Real-time HTML5 Reader Anchor Element */}
            <div id="staff-qr-reader-container" className="w-full h-full" />
            
            {/* Visual Scan Frame Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[24px] border-slate-950/70 flex items-center justify-center">
              <div className="relative w-full h-full border-2 border-indigo-400">
                {/* Breathing/Scan Laser Bar */}
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-md shadow-indigo-500 opacity-80 animate-pulse" style={{ top: '50%' }} />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={stopScanning}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel Camera Scanning
            </button>
          </div>
        </div>
      ) : (
        !cameraPermissionError && !scanResult && (
          <div className="text-center py-6">
            <button
              onClick={startScanning}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Camera className="w-4 h-4 text-indigo-200" />
              <span>Initiate Scanner Camera</span>
            </button>
          </div>
        )
      )}

      {scanResult && (
        <div className="flex justify-center">
          <button
            onClick={startScanning}
            className="px-5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl cursor-pointer"
          >
            Scan Another QR Code
          </button>
        </div>
      )}
    </div>
  );
}
