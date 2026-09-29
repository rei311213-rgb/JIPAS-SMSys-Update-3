import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { EntranceQrCode } from '../../services/supabase/entranceQrService';

interface EntranceQRPrintPageProps {
  qrCode: EntranceQrCode;
  rawToken: string;
  campusName: string;
  onClose: () => void;
}

export default function EntranceQRPrintPage({ qrCode, rawToken, campusName, onClose }: EntranceQRPrintPageProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  useEffect(() => {
    if (rawToken) {
      QRCode.toDataURL(rawToken, {
        width: 380,
        margin: 2,
        color: {
          dark: '#4338ca', // indigo-700
          light: '#ffffff'
        }
      })
        .then(url => setQrImageUrl(url))
        .catch(err => console.error('[QRPrintPage] Error generating QR code image:', err));
    }
  }, [rawToken]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        
        {/* Modal Controls (Not printed) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Print-Friendly Entrance Poster</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Poster</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="jipas-qr-print-area" className="p-8 space-y-8 bg-white text-slate-900 text-center font-sans print:p-0 print:m-0 print:shadow-none print:border-0">
          
          {/* Header Banner */}
          <div className="space-y-2 border-b-2 border-slate-900 pb-6">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">
              JIPAS Students Hub
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Institution Management System
            </p>
          </div>

          {/* Call to action */}
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
              Staff Daily Attendance
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Scan Here to Record Your Daily Attendance
            </p>
          </div>

          {/* Large QR Container */}
          <div className="flex justify-center py-4">
            <div className="border-4 border-slate-900 p-3 rounded-2xl bg-white shadow-md space-y-2">
              {qrImageUrl ? (
                <img src={qrImageUrl} className="w-64 h-64 mx-auto" alt="Entrance QR" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 font-bold text-xs">
                  Generating QR Image...
                </div>
              )}
              <div className="font-black text-lg tracking-widest text-slate-900 uppercase">JIPAS</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-900 pt-6 max-w-sm mx-auto text-left text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Campus:</span>
              <span className="font-extrabold text-slate-900 text-sm leading-tight block">
                {campusName}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Entrance Location:</span>
              <span className="font-extrabold text-slate-900 text-sm leading-tight block">
                {qrCode.name}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl max-w-xs mx-auto text-[10px] font-bold text-slate-500 leading-normal">
            "Please launch the <strong>JIPAS Students Hub App</strong> on your mobile browser or Android device, navigate to the Staff Portal, and scan using the <strong>Scan Entrance QR</strong> scanner lens."
          </div>
        </div>

        {/* Poster Download Action */}
        {qrImageUrl && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-center print:hidden">
            <a
              href={qrImageUrl}
              download={`JIPAS_Entrance_${qrCode.name.replace(/\s+/g, '_')}_QR.png`}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" /> Download raw QR Image
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
