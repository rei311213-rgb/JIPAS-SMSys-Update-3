import React, { useState } from 'react';
import { 
  X, Printer, CreditCard, ShieldCheck, QrCode, Phone, Mail, 
  MapPin, CheckCircle2, RotateCw, Palette, Download, Sparkles
} from 'lucide-react';
import JIPASLogo from '../common/JIPASLogo';

interface IDCardToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any; // Can be Student or Teacher
  defaultIssueDate?: string;
  defaultExpiryDate?: string;
}

import { printContent } from '../../utils/printUtils';

export default function IDCardToolModal({
  isOpen,
  onClose,
  record,
  defaultIssueDate,
  defaultExpiryDate
}: IDCardToolModalProps) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [cardTheme, setCardTheme] = useState<'indigo' | 'emerald' | 'crimson' | 'amber'>('indigo');
  const [issueDate, setIssueDate] = useState(defaultIssueDate || '2026-09-01');
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate || '2029-12-31');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const isStudent = 'admissionNo' in record;
  const fullName = record.fullName || record.name || 'N/A';
  const roleTitle = isStudent ? 'STUDENT' : (record.designation || 'FACULTY MEMBER');
  const idNumber = isStudent ? record.admissionNo : (record.staffId || record.id);
  const classOrDept = isStudent ? record.className : (record.department || 'Primary Faculty');
  const extraInfo = isStudent 
    ? `Campus: ${record.campus || 'JIPAS 1'}` 
    : `Rank: ${record.rank || 'Faculty'}`;
  
  // Comprehensive Student Biodata (Excluding Blood group and House)
  const studentDob = record.dob || 'N/A';
  const studentGender = record.gender || 'N/A';
  const studentNationality = record.nationality || 'Ghanaian';
  const studentCampus = record.campus || 'JIPAS 1';
  
  const photoUrl = record.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80';
  const emergencyPhone = isStudent ? (record.parentPhone || record.emergencyContactPhone || '0249755593') : (record.phone || '0249755593');
  const emergencyEmail = isStudent ? 'info@jipas.com' : (record.email || 'info@jipas.com');

  const getThemeClasses = () => {
    switch (cardTheme) {
      case 'emerald':
        return {
          banner: 'bg-emerald-600 text-white',
          textAccent: 'text-emerald-600',
          border: 'border-emerald-600',
          gradient: 'from-emerald-900 to-teal-950',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'crimson':
        return {
          banner: 'bg-rose-600 text-white',
          textAccent: 'text-rose-600',
          border: 'border-rose-600',
          gradient: 'from-rose-900 to-slate-950',
          badge: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'amber':
        return {
          banner: 'bg-amber-600 text-slate-950',
          textAccent: 'text-amber-600',
          border: 'border-amber-500',
          gradient: 'from-amber-900 to-amber-950',
          badge: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      default:
        return {
          banner: 'bg-indigo-600 text-white',
          textAccent: 'text-indigo-600',
          border: 'border-indigo-600',
          gradient: 'from-slate-900 to-indigo-950',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
    }
  };

  const theme = getThemeClasses();

  const handlePrintCard = () => {
    const cardWidth = orientation === 'landscape' ? '85.6mm' : '53.98mm';
    const cardHeight = orientation === 'landscape' ? '53.98mm' : '85.6mm';

    const renderFrontHTML = () => {
      if (orientation === 'landscape') {
        return `
          <div class="card landscape-card front-card">
            <div class="header">
              <div class="logo-area">
                <span class="logo-sym">J</span>
                <div>
                  <div class="school-title">JOY INTERNATIONAL SCHOOL (JIPAS)</div>
                  <div class="school-sub">Lomé — Togo</div>
                </div>
              </div>
              <div class="badge">${roleTitle}</div>
            </div>
            <div class="body">
              <img src="${photoUrl}" class="avatar" />
              <div class="info-area">
                <div class="name">${fullName}</div>
                <div class="id-row">ID: <strong>${idNumber}</strong></div>
                <div class="meta-row">Class/Dept: <strong>${classOrDept}</strong></div>
                <div class="meta-row">${extraInfo}</div>
                ${isStudent ? `
                  <div class="biodata-grid" style="display: flex; gap: 8px; font-size: 7px; color: #94a3b8; margin-top: 2px;">
                    <span>DOB: <strong>${studentDob}</strong></span>
                    <span>Sex: <strong>${studentGender}</strong></span>
                    <span>Nat: <strong>${studentNationality}</strong></span>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="footer">
              <span>Issued: ${issueDate} • Expires: ${expiryDate}</span>
              <span class="footer-badge">ISO/IEC 7810 ID-1</span>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="card portrait-card front-card">
            <div class="header" style="text-align: center;">
              <div class="school-title" style="font-size: 11px; margin-bottom: 2px;">JOY INTERNATIONAL SCHOOL (JIPAS)</div>
              <div class="school-sub" style="font-size: 7px;">Official Identity Card</div>
            </div>
            <div class="portrait-body">
              <img src="${photoUrl}" class="portrait-avatar" />
              <div class="portrait-name">${fullName}</div>
              <div class="portrait-badge">${roleTitle}</div>
              <div class="portrait-info">
                <div>ID: <strong>${idNumber}</strong></div>
                <div>Class/Dept: <strong>${classOrDept}</strong></div>
                <div>${extraInfo}</div>
                ${isStudent ? `
                  <div style="font-size: 6.5px; color: #94a3b8; margin-top: 3px; line-height: 1.2;">
                    DOB: <strong>${studentDob}</strong> | Sex: <strong>${studentGender}</strong><br/>
                    Nat: <strong>${studentNationality}</strong>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="footer">
              <span>Issued: ${issueDate} • Expires: ${expiryDate}</span>
            </div>
          </div>
        `;
      }
    };

    const renderBackHTML = () => {
      if (orientation === 'landscape') {
        return `
          <div class="card landscape-card back-card">
            <div class="back-title">IMPORTANT INFORMATION</div>
            <div class="back-text">
              1. This identity card remains the property of JIPAS. If found, please return to nearest branch.<br/>
              2. Alteration of this document renders it invalid and constitutes an offense.<br/>
              3. In case of emergency, notify parents / next of kin immediately.
            </div>
            <div class="back-footer">
              <div>
                <strong>EMERGENCY CONTACTS:</strong><br/>
                Tel: ${emergencyPhone} | Email: ${emergencyEmail}
              </div>
              <div class="barcode">|||| | | ||| | || ||||</div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="card portrait-card back-card">
            <div class="back-title" style="margin-top: 10px;">IMPORTANT INFO</div>
            <div class="back-text" style="font-size: 7px; line-height: 1.4; margin: 10px 0;">
              This card is the property of JOY INTERNATIONAL SCHOOL (JIPAS).<br/>
              If found, please return to the school administration office.<br/><br/>
              <strong>Emergency Contacts:</strong><br/>
              Phone: ${emergencyPhone}<br/>
              Email: ${emergencyEmail}
            </div>
            <div style="text-align: center; margin-top: auto; padding-bottom: 10px;">
              <div class="barcode" style="font-size: 16px;">|||| | | ||| | || ||||</div>
              <div style="font-size: 6px; color: #94a3b8; margin-top: 4px;">ISO/IEC 7810 ID-1 Standard</div>
            </div>
          </div>
        `;
      }
    };

    const fullHTML = `
      <style>
        @page {
          size: ${cardWidth} ${cardHeight};
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .print-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          justify-content: center;
        }
        .card {
          box-sizing: border-box;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #1e293b;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .landscape-card {
          width: 85.6mm;
          height: 53.98mm;
          padding: 10px;
        }
        .portrait-card {
          width: 53.98mm;
          height: 85.6mm;
          padding: 12px 10px;
        }
        
        /* Landscape Styling */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #334155;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .logo-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-sym {
          width: 20px;
          height: 20px;
          background: #4f46e5;
          color: white;
          font-weight: 900;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }
        .school-title {
          font-size: 9px;
          font-weight: 900;
          color: #f8fafc;
          letter-spacing: 0.2px;
        }
        .school-sub {
          font-size: 6px;
          color: #94a3b8;
        }
        .badge {
          font-size: 7px;
          font-weight: 900;
          background: #4f46e5;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .body {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 4px;
        }
        .avatar {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          border: 1.5px solid #4f46e5;
          object-fit: cover;
          background: #1e293b;
        }
        .info-area {
          font-size: 8px;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .name {
          font-size: 11px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 2px;
        }
        .id-row {
          font-size: 9px;
          color: #fbbf24;
          font-family: monospace;
        }
        .meta-row {
          color: #cbd5e1;
        }
        .footer {
          margin-top: auto;
          border-top: 1px solid #334155;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 6px;
          color: #94a3b8;
        }
        .footer-badge {
          font-weight: bold;
          color: #4f46e5;
        }

        /* Portrait Specific Styles */
        .portrait-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 6px;
          flex-grow: 1;
        }
        .portrait-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2px solid #4f46e5;
          object-fit: cover;
          margin-bottom: 4px;
          background: #1e293b;
        }
        .portrait-name {
          font-size: 10px;
          font-weight: 900;
          color: white;
          margin-bottom: 2px;
        }
        .portrait-badge {
          font-size: 6px;
          font-weight: 900;
          background: #4f46e5;
          padding: 1px 6px;
          border-radius: 3px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .portrait-info {
          font-size: 7px;
          line-height: 1.3;
          color: #cbd5e1;
          width: 100%;
          border-top: 1px dashed #334155;
          padding-top: 6px;
        }

        /* Back Card Styling */
        .back-card {
          background: #0f172a;
          color: #cbd5e1;
        }
        .back-title {
          font-size: 9px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #334155;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .back-text {
          font-size: 6.5px;
          line-height: 1.4;
          color: #94a3b8;
        }
        .back-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid #334155;
          padding-top: 4px;
          font-size: 6px;
        }
        .barcode {
          font-family: monospace;
          font-size: 14px;
          letter-spacing: 0.5px;
          color: #f8fafc;
        }

        @media print {
          body {
            background: none;
            height: auto;
          }
          .print-container {
            gap: 0;
          }
          .card {
            page-break-after: always;
            border: none;
            border-radius: 0;
          }
        }
      </style>
      <div class="print-container">
        ${renderFrontHTML()}
        ${renderBackHTML()}
      </div>
    `;

    printContent(fullHTML, `ID_Card_${fullName}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-none">
        
        {/* Left Side: Interactive ID Card Design Area */}
        <div className="flex-1 bg-slate-50 p-6 flex flex-col justify-between border-r border-slate-100 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                ISO/IEC 7810 ID-1 Card Preview
              </span>
              <span className="text-[10px] bg-slate-200/80 font-bold px-2 py-0.5 rounded text-slate-600 uppercase">
                85.60 mm x 53.98 mm
              </span>
            </div>

            {/* Front & Back Cards Preview Area */}
            <div className="flex flex-col items-center justify-center gap-6 py-6">
              {/* FRONT SIDE CARD */}
              <div 
                className={`relative rounded-2xl shadow-lg border p-4.5 bg-slate-950 text-white flex flex-col justify-between overflow-hidden transition-all ${
                  orientation === 'landscape' 
                    ? 'w-[340px] h-[215px]' 
                    : 'w-[215px] h-[340px]'
                }`}
              >
                {/* School Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <JIPASLogo size="xs" />
                    <div className="text-left">
                      <h4 className="text-[10px] font-black tracking-tight text-white leading-none">JOY INTERNATIONAL SCHOOL (JIPAS)</h4>
                      <p className="text-[7px] text-slate-400 mt-0.5 leading-none">Lomé — Togo</p>
                    </div>
                  </div>
                  <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${theme.banner}`}>
                    {roleTitle}
                  </span>
                </div>

                {/* Card Main Body */}
                <div className={`flex gap-4 items-center ${orientation === 'portrait' ? 'flex-col text-center mt-3' : ''}`}>
                  <img 
                    src={photoUrl} 
                    alt={fullName} 
                    className={`object-cover bg-slate-800 border-2 ${theme.border} ${
                      orientation === 'portrait' 
                        ? 'w-[72px] h-[72px] rounded-full' 
                        : 'w-18 h-18 rounded-xl shadow-xs'
                    }`}
                  />
                  <div className={`space-y-0.5 overflow-hidden ${orientation === 'portrait' ? 'w-full text-center mt-2' : ''}`}>
                    <h3 className="text-xs font-black text-white truncate leading-tight">{fullName}</h3>
                    <p className={`text-[10px] font-mono font-bold leading-none ${theme.textAccent}`}>{idNumber}</p>
                    <p className="text-[9px] text-slate-300">Class/Dept: <strong>{classOrDept}</strong></p>
                    <p className="text-[9px] text-slate-400">{extraInfo}</p>
                    {isStudent && (
                      <div className="pt-1 flex flex-wrap gap-1 text-[7.5px] text-slate-300 font-medium">
                        <span className="bg-slate-800/80 px-1 py-0.5 rounded border border-white/10">DOB: {studentDob}</span>
                        <span className="bg-slate-800/80 px-1 py-0.5 rounded border border-white/10">Sex: {studentGender}</span>
                        <span className="bg-slate-800/80 px-1 py-0.5 rounded border border-white/10">Nat: {studentNationality}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex justify-between items-center text-[7px] text-slate-400 border-t border-white/10 pt-2">
                  <span>Issued: {issueDate} • Expires: {expiryDate}</span>
                  <span className="font-bold">ISO/IEC 7810</span>
                </div>
              </div>

              {/* BACK SIDE CARD */}
              <div 
                className={`relative rounded-2xl shadow-lg border p-4.5 bg-slate-900 text-slate-300 flex flex-col justify-between overflow-hidden transition-all ${
                  orientation === 'landscape' 
                    ? 'w-[340px] h-[215px]' 
                    : 'w-[215px] h-[340px]'
                }`}
              >
                <div className="space-y-2 text-left">
                  <h4 className="text-[9px] font-black text-white tracking-wider border-b border-white/10 pb-1 uppercase">
                    Important Information
                  </h4>
                  <p className="text-[7.5px] text-slate-400 leading-normal">
                    1. This identity card remains the property of JIPAS.<br/>
                    2. Alteration of this document renders it invalid.<br/>
                    3. If found, please return to any school office branch.
                  </p>
                </div>

                {/* Back Card Footer */}
                <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[7px]">
                  <div className="text-left leading-normal">
                    <span className="block font-black text-white text-[6px]">EMERGENCY CONTACTS</span>
                    <span>Tel: {emergencyPhone}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs tracking-widest text-white leading-none">||| || | | ||</span>
                    <span className="text-[5px] text-slate-500 mt-1 font-mono">ID-1 STANDARD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Options & Control Panel */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">ID Tool Options</h3>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Layout Orientation Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Orientation</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['portrait', 'landscape'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setOrientation(mode)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize cursor-pointer transition-colors ${
                      orientation === mode ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Theme Style</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'indigo', name: 'Navy', color: 'bg-indigo-600' },
                  { id: 'emerald', name: 'Teal', color: 'bg-emerald-600' },
                  { id: 'crimson', name: 'Ruby', color: 'bg-rose-600' },
                  { id: 'amber', name: 'Amber', color: 'bg-amber-500' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCardTheme(item.id as any)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-colors ${
                      cardTheme === item.id 
                        ? 'border-indigo-600 bg-indigo-50/30' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${item.color}`} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Issue & Expiry Setup */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date of Issue</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Quick Metadata Stats */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-600 space-y-2">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span>Record Class:</span>
                <span className="font-extrabold text-slate-900 capitalize">{isStudent ? 'Student' : 'Teacher/Staff'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span>Template Spec:</span>
                <span className="font-mono text-slate-900 font-bold">ISO/IEC 7810 ID-1</span>
              </div>
              <div className="flex justify-between">
                <span>Target Resolution:</span>
                <span className="text-emerald-700 font-bold">300 DPI Vector High-Res</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePrintCard}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Generate & Print ID Card</span>
          </button>
        </div>

      </div>
    </div>
  );
}
