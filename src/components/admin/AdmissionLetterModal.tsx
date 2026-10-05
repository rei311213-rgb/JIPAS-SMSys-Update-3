import React from 'react';
import { Printer, Download, X, GraduationCap, School, CheckCircle2 } from 'lucide-react';
import { Student } from '../../types';
import { printContent } from '../../utils/printUtils';
import JIPASLogo, { getSchoolLogo } from '../common/JIPASLogo';

interface AdmissionLetterModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdmissionLetterModal({
  student,
  isOpen,
  onClose
}: AdmissionLetterModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    const todayDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const reportingDate = 'Monday, 15th September 2026';

    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 40px 50px; color: #0f172a; max-width: 820px; margin: 0 auto; line-height: 1.6; background: #fff;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="width: 85px;">
            <img src="${absoluteLogoSrc}" alt="JIPAS Logo" style="width: 80px; height: 80px; object-fit: contain;" />
          </div>
          <div style="text-align: center; flex: 1; padding: 0 16px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; text-transform: uppercase;">
              Joy International School
            </h1>
            <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: bold; color: #b91c1c; text-transform: uppercase;">
              Primary • Junior High • Senior High School
            </p>
            <p style="margin: 3px 0 0 0; font-size: 11px; font-style: italic; color: #475569;">
              "Excellence in Knowledge and Character"
            </p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
              01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Filling Station & Hedzranawoe • Lomé — Togo<br/>
              Tel: (00228) 22 60 21 38 / 90 83 60 48 • Email: joyjipas2002@gmail.com
            </p>
          </div>
          <div style="width: 85px; text-align: right;">
            <div style="border: 1px solid #cbd5e1; width: 80px; height: 85px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; text-align: center; background: #f8fafc;">
              Affix Passport Photograph
            </div>
          </div>
        </div>

        <!-- Meta info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
          <div>
            <p style="margin: 0;"><strong>Our Ref:</strong> JIPAS/ADM/${new Date().getFullYear()}/${student.id.slice(-4).toUpperCase()}</p>
            <p style="margin: 2px 0 0 0;"><strong>Admission No:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${student.admissionNo || student.id}</span></p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0;"><strong>Date:</strong> ${todayDate}</p>
            <p style="margin: 2px 0 0 0;"><strong>Campus:</strong> ${student.campus || 'JIPAS 1 (Kpéhénou)'}</p>
          </div>
        </div>

        <!-- Recipient -->
        <div style="margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 0;">To the Parent / Guardian of:</p>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; color: #1e293b;">
            Master / Miss ${student.fullName.toUpperCase()}
          </p>
          ${student.parentName ? `<p style="margin: 2px 0 0 0; color: #475569;">C/O: ${student.parentName} (${student.parentPhone || ''})</p>` : ''}
        </div>

        <!-- Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="display: inline-block; margin: 0; font-size: 16px; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; text-transform: uppercase;">
            OFFICIAL OFFER OF PROVISIONAL ADMISSION
          </h2>
        </div>

        <!-- Body -->
        <div style="font-size: 13px; text-align: justify; margin-bottom: 16px;">
          <p style="margin: 0 0 12px 0;">
            Dear Parent / Guardian,
          </p>
          <p style="margin: 0 0 12px 0;">
            Following your application and the successful vetting of academic and conduct credentials, the Academic Board 
            of <strong>Joy International School (JIPAS)</strong> is pleased to offer <strong>${student.fullName.toUpperCase()}</strong> 
            provisional admission into:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 12px 0; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px;">
            <tbody>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; width: 35%; border-bottom: 1px solid #e2e8f0;">Assigned Class / Level:</td>
                <td style="padding: 8px 12px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #e2e8f0;">${student.className}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Department / Section:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${student.department || 'Basic Education'}</td>
              </tr>
              ${student.course ? `
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Course / Programme:</td>
                <td style="padding: 8px 12px; font-weight: bold; color: #047857; border-bottom: 1px solid #e2e8f0;">${student.course}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Allocated House of Residence:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${student.house || 'Blue House'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold;">Official Resumption Date:</td>
                <td style="padding: 8px 12px; font-weight: bold; color: #b91c1c;">${reportingDate} at 7:30 AM</td>
              </tr>
            </tbody>
          </table>

          <p style="margin: 0 0 10px 0;">
            <strong>Terms of Admission & Institutional Requirements:</strong>
          </p>
          <ol style="margin: 0 0 16px 0; padding-left: 20px; font-size: 12px;">
            <li style="margin-bottom: 4px;"><strong>School Uniform & Dress Code:</strong> Prescribed school uniform, black leather shoes, and white socks must be worn strictly every school day.</li>
            <li style="margin-bottom: 4px;"><strong>Financial Obligations:</strong> Tuition and termly levies must be paid in full or in agreed standing installments prior to official registration on opening day.</li>
            <li style="margin-bottom: 4px;"><strong>Attendance & Discipline:</strong> High standards of moral discipline, punctuality, and attendance (minimum 85%) are prerequisite for term promotion.</li>
            <li style="margin-bottom: 4px;"><strong>Stationery & Textbooks:</strong> All exercise books and Ministry-approved course textbooks must be procured before class commencement.</li>
          </ol>

          <p style="margin: 0 0 24px 0;">
            We congratulate the student on their admission to the Joy International family and trust that their time with us 
            will be fruitful, inspiring, and academically rewarding.
          </p>
        </div>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px;">
          <div style="text-align: center; width: 220px;">
            <div style="border-bottom: 1px solid #0f172a; margin-bottom: 4px; height: 35px;"></div>
            <p style="margin: 0; font-size: 12px; font-weight: bold;">Head of Admissions</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">Joy International School</p>
          </div>

          <div style="text-align: center; width: 140px; border: 2px dashed #94a3b8; padding: 12px 6px; border-radius: 8px;">
            <p style="margin: 0; font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">
              Official School<br/>Seal & Stamp
            </p>
          </div>

          <div style="text-align: center; width: 220px;">
            <div style="border-bottom: 1px solid #0f172a; margin-bottom: 4px; height: 35px;"></div>
            <p style="margin: 0; font-size: 12px; font-weight: bold;">Headmaster / Principal</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">Joy International School</p>
          </div>
        </div>
      </div>
    `;

    printContent(html, `JIPAS_Admission_Letter_${student.admissionNo || student.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Official Admission Letter</h3>
              <p className="text-xs text-slate-400">Generate, review, and print official admission letter</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student Name:</span>
            <span className="font-black text-slate-900 text-sm">{student.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Admission Number:</span>
            <span className="font-mono font-bold text-indigo-700">{student.admissionNo || student.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Class & Department:</span>
            <span className="font-bold text-slate-800">{student.className} • {student.department || 'Primary'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Campus:</span>
            <span className="font-semibold text-slate-700">{student.campus || 'JIPAS 1'}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Clicking <strong>Print Admission Letter</strong> will format the official Joy International School letterhead, provisional acceptance statement, curriculum guidelines, reporting date, and Headmaster signature block ready for print or saving as PDF.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Admission Letter
          </button>
        </div>
      </div>
    </div>
  );
}
