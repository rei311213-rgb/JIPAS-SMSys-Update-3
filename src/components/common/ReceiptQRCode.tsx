import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface ReceiptQRCodeProps {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  amount: number;
  date: string;
  receiptId?: string;
  referenceNo?: string;
  verificationUrl?: string;
  size?: number;
  showLabel?: boolean;
  clickable?: boolean;
}

export function buildReceiptVerificationUrl(params: {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  amount: number;
  date: string;
  receiptId?: string;
}): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://ais-pre-i7tr4tqdfcusu3i3cszmlm-418644276814.europe-west2.run.app';

  const query = new URLSearchParams({
    verify_receipt: params.receiptNo,
    student: params.admissionNo,
    name: params.studentName,
    amt: String(params.amount),
    dt: params.date,
    id: params.receiptId || '',
    auth: 'jipas-certified',
    v: '2'
  });

  return `${origin}/?${query.toString()}`;
}

export default function ReceiptQRCode({ 
  receiptNo, 
  studentName, 
  admissionNo, 
  amount, 
  date, 
  receiptId, 
  referenceNo, 
  verificationUrl: customVerificationUrl,
  size = 96, 
  showLabel = true,
  clickable = true
}: ReceiptQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  useEffect(() => {
    const finalUrl = customVerificationUrl || buildReceiptVerificationUrl({
      receiptNo,
      studentName,
      admissionNo,
      amount,
      date,
      receiptId
    });

    setGeneratedUrl(finalUrl);

    if (canvasRef.current) {
      // Encode the dynamic verification URL into the QR code
      QRCode.toCanvas(canvasRef.current, finalUrl, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error);
      });
    }
  }, [receiptNo, studentName, admissionNo, amount, date, receiptId, referenceNo, customVerificationUrl, size]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!clickable || !generatedUrl) return;
    e.stopPropagation();
    try {
      window.dispatchEvent(new CustomEvent('jipas_open_verify_receipt', {
        detail: { receiptNo, admissionNo, studentName, amount, date, receiptId, verificationUrl: generatedUrl }
      }));
    } catch {}
  };

  if (!showLabel) {
    return (
      <div 
        className={`inline-block ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        title={`Scan to digitally verify on JIPAS Portal: ${receiptNo}`}
        onClick={handleCanvasClick}
      >
        <canvas 
          ref={canvasRef} 
          width={size} 
          height={size} 
          style={{ width: `${size}px`, height: `${size}px`, maxWidth: '100%', objectFit: 'contain' }} 
          className="rounded-xs" 
        />
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200 shadow-2xs ${clickable ? 'cursor-pointer hover:border-indigo-400 hover:shadow-xs transition-all' : ''}`}
      onClick={handleCanvasClick}
      title="Click or scan with smartphone to verify digital authenticity"
    >
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size} 
        style={{ width: `${size}px`, height: `${size}px`, maxWidth: '100%', objectFit: 'contain' }} 
        className="rounded-md" 
      />
      <div className="flex items-center gap-1 mt-1 text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[8.5px] font-mono font-bold text-slate-600">Scan to Verify</span>
      </div>
    </div>
  );
}
