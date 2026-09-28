import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface ReceiptQRCodeProps {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  amount: number;
  date: string;
  receiptId?: string;
  referenceNo?: string;
  size?: number;
  showLabel?: boolean;
}

export default function ReceiptQRCode({ 
  receiptNo, 
  studentName, 
  admissionNo, 
  amount, 
  date,
  receiptId,
  referenceNo,
  size = 96,
  showLabel = true
}: ReceiptQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const payload = JSON.stringify({
        receiptId: receiptId || '',
        receiptNo,
        referenceNo: referenceNo || '',
        studentName,
        admissionNo,
        amount,
        date,
        institution: 'JOY INTERNATIONAL SCHOOL (JIPAS)',
        verified: true
      });

      QRCode.toCanvas(canvasRef.current, payload, {
        width: size,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error);
      });
    }
  }, [receiptNo, studentName, admissionNo, amount, date, receiptId, referenceNo, size]);

  if (!showLabel) {
    return <canvas ref={canvasRef} width={size} height={size} style={{ width: `${size}px`, height: `${size}px`, maxWidth: '100%', objectFit: 'contain' }} className="rounded-sm" />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
      <canvas ref={canvasRef} width={size} height={size} style={{ width: `${size}px`, height: `${size}px`, maxWidth: '100%', objectFit: 'contain' }} className="rounded-md" />
      <span className="text-[9px] font-mono font-bold text-slate-500 mt-1">Scan to Verify</span>
    </div>
  );
}
