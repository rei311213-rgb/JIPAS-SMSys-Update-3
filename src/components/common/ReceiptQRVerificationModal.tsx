import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  Search, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  SwitchCamera,
  FileText,
  User,
  Calendar,
  CreditCard
} from 'lucide-react';
import { getStoredPayments, getStoredStudents } from '../../services/storageService';
import { formatCurrency } from '../../utils/financeUtils';
import { PaymentRecord, Student } from '../../types';

interface ReceiptQRVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptVerified?: (payment: PaymentRecord) => void;
}

export interface VerificationResult {
  status: 'AUTHENTIC' | 'VOIDED' | 'UNVERIFIED' | 'INVALID_QR';
  message: string;
  paymentRecord?: PaymentRecord;
  parsedData?: any;
}

export default function ReceiptQRVerificationModal({
  isOpen,
  onClose,
  onReceiptVerified
}: ReceiptQRVerificationModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'IDLE' | 'STARTING' | 'SCANNING' | 'ERROR' | 'DENIED'>('IDLE');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [manualReceiptNo, setManualReceiptNo] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('IDLE');
  }, []);

  // Perform authoritative verification of parsed QR payload or receipt number
  const verifyReceiptPayload = useCallback((rawText: string) => {
    try {
      const storedPayments = getStoredPayments();
      let parsed: any = null;
      let targetReceiptNo = rawText.trim();

      // Check if payload is URL with verification query params
      if (rawText.includes('http://') || rawText.includes('https://') || rawText.includes('verify_receipt=')) {
        try {
          const urlObj = new URL(rawText.startsWith('http') ? rawText : `http://localhost${rawText}`);
          const rNo = urlObj.searchParams.get('verify_receipt') || urlObj.searchParams.get('receiptNo') || urlObj.searchParams.get('r');
          const adm = urlObj.searchParams.get('student') || urlObj.searchParams.get('adm');
          const name = urlObj.searchParams.get('name');
          const amt = parseFloat(urlObj.searchParams.get('amt') || '0');
          const dt = urlObj.searchParams.get('dt');
          const id = urlObj.searchParams.get('id');
          if (rNo) targetReceiptNo = rNo;
          parsed = {
            receiptNo: rNo,
            admissionNo: adm,
            studentName: name,
            amount: amt,
            date: dt,
            receiptId: id,
            institution: 'JOY INTERNATIONAL SCHOOL (JIPAS)',
            verificationUrl: rawText
          };
        } catch {
          // not valid url, continue
        }
      } else if (rawText.trim().startsWith('{') && rawText.trim().endsWith('}')) {
        try {
          parsed = JSON.parse(rawText);
          targetReceiptNo = (parsed.receiptNo || parsed.receiptId || '').trim();
        } catch {
          // not valid json, treat as receipt number
        }
      }

      // Query local/stored payments by receiptNo or ID
      const normalizedTarget = targetReceiptNo.toLowerCase();
      const matchedPayment = storedPayments.find(p => 
        (p.receiptNo && p.receiptNo.toLowerCase().trim() === normalizedTarget) ||
        (p.id && p.id.toLowerCase().trim() === normalizedTarget) ||
        (p.referenceNo && p.referenceNo.toLowerCase().trim() === normalizedTarget) ||
        (parsed && parsed.admissionNo && p.admissionNo && p.admissionNo.toLowerCase().trim() === parsed.admissionNo.toLowerCase().trim() && p.amount === parsed.amount)
      );

      if (matchedPayment) {
        const isVoided = matchedPayment.status === 'Voided' || (matchedPayment as any).isVoided === true;
        if (isVoided) {
          setVerificationResult({
            status: 'VOIDED',
            message: 'This payment receipt was found in JIPAS database but has been VOIDED or CANCELLED.',
            paymentRecord: matchedPayment,
            parsedData: parsed
          });
        } else {
          setVerificationResult({
            status: 'AUTHENTIC',
            message: 'Official JIPAS receipt verified successfully! Authenticated with bursary records.',
            paymentRecord: matchedPayment,
            parsedData: parsed
          });
          if (onReceiptVerified) {
            onReceiptVerified(matchedPayment);
          }
        }
      } else if (parsed && parsed.institution && parsed.receiptNo) {
        // Has valid JIPAS QR signature structure but not in local cache
        setVerificationResult({
          status: 'UNVERIFIED',
          message: `QR signature detected for Receipt #${parsed.receiptNo} (${parsed.studentName || 'Student'}), but matching record was not found in active local bursary cache.`,
          parsedData: parsed
        });
      } else {
        setVerificationResult({
          status: 'INVALID_QR',
          message: 'Scanned QR code does not contain a recognized JIPAS payment receipt signature or matching record.',
          parsedData: { raw: rawText }
        });
      }
    } catch (err: any) {
      setVerificationResult({
        status: 'INVALID_QR',
        message: 'Could not process receipt QR payload. Please try again or search manually.',
        parsedData: { error: String(err) }
      });
    }
  }, [onReceiptVerified]);

  // Frame scanning loop using requestAnimationFrame + jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        // QR detected! Stop camera and verify
        stopCamera();
        verifyReceiptPayload(code.data);
        return;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, verifyReceiptPayload]);

  // Start live webcam scanning
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraState('STARTING');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraState('SCANNING');
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('DENIED');
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or upload an image of the QR code.');
      } else {
        setCameraState('ERROR');
        setCameraError(err.message || 'Unable to start camera.');
      }
    }
  }, [facingMode, stopCamera, scanFrame]);

  // Manage start/stop when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !verificationResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, verificationResult, startCamera, stopCamera]);

  // Image File Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          verifyReceiptPayload(code.data);
        } else {
          setVerificationResult({
            status: 'INVALID_QR',
            message: 'No readable QR code found in the uploaded image. Please ensure the QR code is clearly visible and well-lit.',
            parsedData: null
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual Receipt Search handler
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo.trim()) return;
    verifyReceiptPayload(manualReceiptNo.trim());
  };

  const handleResetVerification = () => {
    setVerificationResult(null);
    setManualReceiptNo('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">Receipt Authenticity Verifier</h3>
              <p className="text-[10.5px] text-slate-500 font-medium">Instant JIPAS Official Bursary QR Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Result Display */}
        {verificationResult ? (
          <div className="space-y-4 animate-scale-in">
            {verificationResult.status === 'AUTHENTIC' && (
              <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-5 text-emerald-950 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">JIPAS Authenticated</span>
                    <h4 className="text-base font-black text-emerald-900">Official Payment Verified</h4>
                  </div>
                </div>

                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  {verificationResult.message}
                </p>

                {verificationResult.paymentRecord && (
                  <div className="bg-white/90 rounded-xl p-3.5 border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Receipt No:</span>
                      <span className="font-mono font-black text-emerald-900">{verificationResult.paymentRecord.receiptNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Student Name:</span>
                      <strong className="text-slate-900">{verificationResult.paymentRecord.studentName}</strong>
                    </div>
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Admission No:</span>
                      <span className="font-mono font-bold text-indigo-700">{verificationResult.paymentRecord.admissionNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Class / Stream:</span>
                      <span className="font-semibold text-slate-800">{verificationResult.paymentRecord.className}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Academic Period:</span>
                      <span className="font-semibold text-slate-800">
                        {verificationResult.paymentRecord.academicYear} ({verificationResult.paymentRecord.term})
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Payment Purpose:</span>
                      <span className="font-bold text-slate-800">{verificationResult.paymentRecord.paidAs || 'Tuition Fee'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-black uppercase text-emerald-800">Verified Amount:</span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {formatCurrency(verificationResult.paymentRecord.paid ?? verificationResult.paymentRecord.amount ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {verificationResult.status === 'VOIDED' && (
              <div className="bg-rose-50 border-2 border-rose-500/40 rounded-2xl p-5 text-rose-950 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">Security Alert</span>
                    <h4 className="text-base font-black text-rose-900">Receipt Revoked / Voided</h4>
                  </div>
                </div>
                <p className="text-xs text-rose-800 font-medium">
                  {verificationResult.message}
                </p>
                {verificationResult.paymentRecord && (
                  <div className="bg-white/90 rounded-xl p-3 border border-rose-200 text-xs">
                    <p>Receipt #{verificationResult.paymentRecord.receiptNo} for {verificationResult.paymentRecord.studentName} ({verificationResult.paymentRecord.admissionNo}) was flagged as voided in the bursary audit log.</p>
                  </div>
                )}
              </div>
            )}

            {(verificationResult.status === 'UNVERIFIED' || verificationResult.status === 'INVALID_QR') && (
              <div className="bg-amber-50 border-2 border-amber-500/40 rounded-2xl p-5 text-amber-950 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Verification Unconfirmed</span>
                    <h4 className="text-base font-black text-amber-900">No Matching Bursary Record</h4>
                  </div>
                </div>
                <p className="text-xs text-amber-800 font-medium">
                  {verificationResult.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetVerification}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Another Receipt</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  setCameraError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('manual');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search ID</span>
              </button>
            </div>

            {/* TAB 1: Live Webcam Scanner */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                <div className="relative aspect-square max-h-72 w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* QR Target Crosshairs Overlay */}
                  {cameraState === 'SCANNING' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      </div>
                      <span className="absolute bottom-3 text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                        Align Receipt QR within frame
                      </span>
                    </div>
                  )}

                  {cameraState === 'STARTING' && (
                    <div className="text-center p-4 text-slate-400 space-y-2">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                      <p className="text-xs font-bold">Initializing optical scanner...</p>
                    </div>
                  )}

                  {(cameraState === 'ERROR' || cameraState === 'DENIED') && (
                    <div className="text-center p-6 text-slate-300 space-y-3 max-w-xs">
                      <CameraOff className="w-10 h-10 mx-auto text-rose-400" />
                      <p className="text-xs font-semibold leading-relaxed text-rose-200">
                        {cameraError || 'Camera could not be activated.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera controls */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Point your camera directly at the receipt QR code
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Switch camera"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Upload File / Image Scanner */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition-all space-y-2.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Click or Drag Receipt QR Image</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supports PNG, JPG, or screenshot files</p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 shadow-2xs">
                    Browse File
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: Manual Search ID */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSearch} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Receipt Number or Reference ID
                  </label>
                  <input
                    type="text"
                    value={manualReceiptNo}
                    onChange={(e) => setManualReceiptNo(e.target.value)}
                    placeholder="e.g. REC/2026/123456 or RCT-20261003-..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify Against Ledger</span>
                </button>
              </form>
            )}

            {/* Quick Helper Note */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[10.5px] text-slate-500 leading-relaxed flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All physical JIPAS receipts contain an encrypted SHA QR code at the bottom. Verification cross-references our authoritative ledger.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
