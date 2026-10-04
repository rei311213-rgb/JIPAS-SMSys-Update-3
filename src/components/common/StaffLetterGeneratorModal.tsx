import React, { useState } from 'react';
import { 
  X, Printer, Download, FileText, CheckCircle2, ShieldCheck, 
  Building2, User, Calendar, DollarSign, Award, Sparkles, Briefcase
} from 'lucide-react';
import { Teacher } from '../../types';
import JIPASLogo, { getSchoolLogo } from './JIPASLogo';
import { SCHOOL_CONTACT } from '../../constants/schoolInfo';
import { printContent } from '../../utils/printUtils';

export type StaffLetterType = 'employment' | 'confirmation';

interface StaffLetterGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Teacher;
  initialType?: StaffLetterType;
}

export default function StaffLetterGeneratorModal({
  isOpen,
  onClose,
  staff,
  initialType = 'employment'
}: StaffLetterGeneratorModalProps) {
  const [letterType, setLetterType] = useState<StaffLetterType>(initialType);

  // Customizable letter fields
  const [refNo, setRefNo] = useState(() => {
    const year = new Date().getFullYear();
    const idNum = (staff.staffId || staff.id).replace(/[^0-9]/g, '').slice(-3) || '001';
    return letterType === 'employment' 
      ? `JIPAS/HR/EMP/${year}/${idNum}`
      : `JIPAS/HR/CONF/${year}/${idNum}`;
  });

  const [letterDate, setLetterDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  const [commencementDate, setCommencementDate] = useState(
    staff.dateOfEmployment || staff.dateJoined || '1st September 2026'
  );

  const [confirmationEffectiveDate, setConfirmationEffectiveDate] = useState(
    staff.probationEndDate || '1st March 2027'
  );

  const [designation, setDesignation] = useState(staff.designation || 'Faculty Member');
  const [department, setDepartment] = useState(staff.department || 'Academic Department');
  const [campus, setCampus] = useState(staff.campus || 'JIPAS 1 (Main Campus)');
  const [monthlySalary, setMonthlySalary] = useState(staff.monthlySalary ? String(staff.monthlySalary) : '1,850.00');
  const [probationMonths, setProbationMonths] = useState('3 Months');
  const [reportingTo, setReportingTo] = useState('Head of School / CEO');
  const [nationality, setNationality] = useState(staff.nationality || 'Ghanaian');
  const [commendation, setCommendation] = useState(
    'Demonstrated commendable pedagogical competence, punctual classroom attendance, exemplary student rapport, and active compliance with school policies.'
  );

  if (!isOpen || !staff) return null;

  const handleTypeSwitch = (type: StaffLetterType) => {
    setLetterType(type);
    const year = new Date().getFullYear();
    const idNum = (staff.staffId || staff.id).replace(/[^0-9]/g, '').slice(-3) || '001';
    setRefNo(type === 'employment' ? `JIPAS/HR/EMP/${year}/${idNum}` : `JIPAS/HR/CONF/${year}/${idNum}`);
  };

  const handlePrint = () => {
    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    const ceoSig = typeof window !== 'undefined' ? localStorage.getItem('jipas_ceo_signature') || '' : '';

    const printHtml = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 40px 50px; color: #0f172a; max-width: 840px; margin: 0 auto; line-height: 1.5; background: #fff;">
        <!-- Official Letterhead -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
          <div style="width: 85px;">
            <img src="${absoluteLogoSrc}" alt="JIPAS Logo" style="width: 80px; height: 80px; object-fit: contain;" />
          </div>
          <div style="text-align: center; flex: 1; padding: 0 16px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">
              JOY INTERNATIONAL SCHOOL (JIPAS)
            </h1>
            <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: bold; color: #4338ca; text-transform: uppercase;">
              Bilingual Educational Complex • Nursery • Primary • Junior High • Senior High
            </p>
            <p style="margin: 3px 0 0 0; font-size: 11px; font-style: italic; color: #475569;">
              "Knowledge, Discipline, Excellence & Leadership"
            </p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
              ${SCHOOL_CONTACT.address}<br/>
              Tel: ${SCHOOL_CONTACT.tel} • Email: ${SCHOOL_CONTACT.email}
            </p>
          </div>
          <div style="width: 85px; text-align: right;">
            <div style="border: 2px solid #0f172a; width: 75px; height: 80px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; color: #0f172a; text-align: center; font-weight: bold; text-transform: uppercase; background: #f8fafc;">
              OFFICIAL HR<br/>COMMUNICATION
            </div>
          </div>
        </div>

        <!-- Meta Grid -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 12px;">
          <div>
            <p style="margin: 0;"><strong>Our Ref:</strong> <span style="font-family: monospace; font-weight: bold; color: #4338ca;">${refNo}</span></p>
            <p style="margin: 2px 0 0 0;"><strong>Staff ID:</strong> <span style="font-family: monospace; font-weight: bold;">${staff.staffId || staff.id}</span></p>
            <p style="margin: 2px 0 0 0;"><strong>Nationality:</strong> ${nationality}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0;"><strong>Date:</strong> ${letterDate}</p>
            <p style="margin: 2px 0 0 0;"><strong>Campus:</strong> ${campus}</p>
          </div>
        </div>

        <!-- Recipient Info -->
        <div style="margin-bottom: 18px; font-size: 12px; border-left: 3px solid #4338ca; padding-left: 10px;">
          <p style="margin: 0; color: #64748b;">Private & Confidential</p>
          <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: bold; color: #0f172a;">
            ${staff.gender === 'Female' ? 'Ms. / Mrs.' : 'Mr.'} ${staff.name.toUpperCase()}
          </p>
          <p style="margin: 2px 0 0 0; color: #475569;">Designation: <strong>${designation}</strong></p>
          <p style="margin: 2px 0 0 0; color: #475569;">Department: <strong>${department}</strong></p>
          <p style="margin: 2px 0 0 0; color: #475569;">Contact: ${staff.phone || ''} • ${staff.email || ''}</p>
        </div>

        ${letterType === 'employment' ? `
          <!-- Title: Offer of Employment -->
          <div style="text-align: center; margin-bottom: 18px;">
            <h2 style="display: inline-block; margin: 0; font-size: 15px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 3px; text-transform: uppercase;">
              OFFICIAL OFFER OF PROVISIONAL APPOINTMENT & EMPLOYMENT
            </h2>
          </div>

          <!-- Body: Employment Letter -->
          <div style="font-size: 12px; text-align: justify; margin-bottom: 16px;">
            <p style="margin: 0 0 10px 0;">Dear ${staff.name},</p>
            <p style="margin: 0 0 10px 0;">
              On behalf of the Governing Board and Executive Management of <strong>JOY INTERNATIONAL SCHOOL (JIPAS)</strong>, 
              we are pleased to offer you provisional appointment as <strong>${designation.toUpperCase()}</strong> in the <strong>${department}</strong>, 
              tenable at <strong>${campus}</strong>, with effect from <strong>${commencementDate}</strong>.
            </p>
            <p style="margin: 0 0 10px 0;">
              This appointment is subject to the provisions of the Ghana Education Service / Togolese Ministry of National Education guidelines 
              and the JIPAS Staff Code of Professional Conduct, on the following terms and conditions:
            </p>

            <div style="margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11.5px;">
              <p style="margin: 0 0 6px 0;"><strong>1. Job Title & Reporting Line:</strong> You will serve as <em>${designation}</em> and report directly to the <em>${reportingTo}</em>.</p>
              <p style="margin: 0 0 6px 0;"><strong>2. Probationary Period:</strong> You shall serve a probationary period of <strong>${probationMonths}</strong>. During this period, your performance, instructional delivery, student discipline management, and professional integrity will be appraised.</p>
              <p style="margin: 0 0 6px 0;"><strong>3. Remuneration & Benefits:</strong> You will receive a consolidated monthly gross salary of <strong>CFA / GHS ${monthlySalary}</strong>, payable on or before the 28th of every month, subject to statutory pension (SSNIT / Caisse Nationale) and income tax deductions.</p>
              <p style="margin: 0 0 6px 0;"><strong>4. Working Hours & Duties:</strong> Official hours of work are 7:30 AM to 4:00 PM (Monday to Friday), plus scheduled co-curricular, staff meetings, and terminal assessment invigilation.</p>
              <p style="margin: 0 0 6px 0;"><strong>5. Child Safeguarding & Ethics:</strong> JIPAS maintains zero tolerance for corporal punishment, sexual harassment, unauthorized absenteeism, or professional misconduct.</p>
              <p style="margin: 0;"><strong>6. Termination of Contract:</strong> During probation, either party may terminate this appointment by giving two (2) weeks' written notice or salary in lieu thereof.</p>
            </div>

            <p style="margin: 0 0 10px 0;">
              We congratulate you on your appointment and look forward to your valuable contribution to the academic and moral development of our students.
            </p>
          </div>
        ` : `
          <!-- Title: Post-Probation Confirmation -->
          <div style="text-align: center; margin-bottom: 18px;">
            <h2 style="display: inline-block; margin: 0; font-size: 15px; font-weight: 900; color: #047857; border-bottom: 2px solid #047857; padding-bottom: 3px; text-transform: uppercase;">
              CONFIRMATION OF SUBSTANTIVE APPOINTMENT AFTER SUCCESSFUL PROBATION
            </h2>
          </div>

          <!-- Body: Confirmation Letter -->
          <div style="font-size: 12px; text-align: justify; margin-bottom: 16px;">
            <p style="margin: 0 0 10px 0;">Dear ${staff.name},</p>
            <p style="margin: 0 0 10px 0;">
              We write on behalf of the Executive Directorate of <strong>JOY INTERNATIONAL SCHOOL (JIPAS)</strong> to formally congratulate you on 
              the successful completion of your <strong>${probationMonths}</strong> probationary service.
            </p>
            <p style="margin: 0 0 10px 0;">
              Following formal performance review and appraisal by the Academic Oversight Board, Management is pleased to confirm your substantive 
              tenured appointment as <strong>${designation.toUpperCase()}</strong> in the <strong>${department}</strong> with effect from <strong>${confirmationEffectiveDate}</strong>.
            </p>

            <div style="margin: 12px 0; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px; font-size: 11.5px; color: #064e3b;">
              <p style="margin: 0 0 6px 0;"><strong>1. Appraisal Commendation:</strong> ${commendation}</p>
              <p style="margin: 0 0 6px 0;"><strong>2. Confirmed Status & Tenure:</strong> You are now a fully confirmed permanent faculty member of Joy International School, entitled to all standard staff welfare, medical clinic, and statutory pension privileges.</p>
              <p style="margin: 0 0 6px 0;"><strong>3. Consolidated Remuneration:</strong> Your confirmed monthly remuneration stands at <strong>CFA / GHS ${monthlySalary}</strong> plus applicable responsibility/transport allowances.</p>
              <p style="margin: 0 0 6px 0;"><strong>4. Annual Leave Entitlement:</strong> You are entitled to statutory school vacation leave and official institutional holidays.</p>
              <p style="margin: 0;"><strong>5. Notice of Separation:</strong> Post-confirmation separation requires one (1) full calendar term's written notice or salary in lieu thereof by either party.</p>
            </div>

            <p style="margin: 0 0 10px 0;">
              We trust that you will continue to discharge your duties with the high level of devotion, excellence, and moral integrity that characterized your probationary tenure.
            </p>
          </div>
        `}

        <!-- Signatures & Official Seal Grid -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1;">
          <div style="text-align: center; width: 220px;">
            ${ceoSig ? `<img src="${ceoSig}" style="height: 40px; max-width: 140px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />` : `<div style="height: 35px; border-bottom: 1px dashed #475569;"></div>`}
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #0f172a;">Executive Director / CEO</p>
            <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748b;">Joy International School (JIPAS)</p>
          </div>

          <div style="text-align: center; width: 130px;">
            <div style="width: 65px; height: 65px; border: 2px dashed #4338ca; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #4338ca; transform: rotate(5deg); text-transform: uppercase;">
              OFFICIAL SEAL<br/>& STAMP
            </div>
          </div>

          <div style="text-align: center; width: 220px;">
            <div style="height: 35px; border-bottom: 1px dashed #475569;"></div>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #0f172a;">Head of School / Registrar</p>
            <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748b;">Human Resources & Registry</p>
          </div>
        </div>

        <!-- Perforated Employee Acceptance Tear-Off Section -->
        <div style="margin-top: 26px; padding-top: 12px; border-top: 2px dashed #94a3b8; font-size: 10.5px;">
          <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 9px; font-family: monospace; margin-bottom: 6px;">
            <span>✂ PLEASE DETACH, SIGN AND RETURN THE DUPLICATE COPY TO THE HR OFFICE</span>
            <span>JIPAS HR REGISTRY COPY</span>
          </div>
          <p style="margin: 0 0 6px 0; font-style: italic;">
            "I, <strong>${staff.name}</strong> (Staff ID: <strong>${staff.staffId || staff.id}</strong>), hereby accept the appointment and terms contained in this ${letterType === 'employment' ? 'offer letter' : 'confirmation notice'}, and agree to abide strictly by the rules, safeguarding policies, and code of conduct of Joy International School."
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 12px;">
            <div style="width: 45%;">
              <div style="border-bottom: 1px solid #0f172a; height: 18px;"></div>
              <span style="font-size: 9px; color: #64748b;">Employee Signature</span>
            </div>
            <div style="width: 25%;">
              <div style="border-bottom: 1px solid #0f172a; height: 18px;"></div>
              <span style="font-size: 9px; color: #64748b;">Date</span>
            </div>
            <div style="width: 25%;">
              <div style="border-bottom: 1px solid #0f172a; height: 18px;"></div>
              <span style="font-size: 9px; color: #64748b;">Phone Number</span>
            </div>
          </div>
        </div>
      </div>
    `;

    printContent(printHtml);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">Official Employee Letter Generator</h3>
              <p className="text-xs text-slate-400">
                Staff: <strong className="text-white">{staff.name}</strong> • Ref: {refNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" /> Print Letter
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header: Letter Type Switcher */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="inline-flex p-1 bg-white rounded-2xl border border-slate-300 shadow-2xs">
            <button
              onClick={() => handleTypeSwitch('employment')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                letterType === 'employment'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-indigo-600'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>1. Offer of Employment (Probationary)</span>
            </button>
            <button
              onClick={() => handleTypeSwitch('confirmation')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                letterType === 'confirmation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-600'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>2. Confirmation Letter (After Probation)</span>
            </button>
          </div>

          <span className="text-slate-500 font-bold text-[11px]">
            Target Role: <strong className="text-slate-900">{designation}</strong>
          </span>
        </div>

        {/* Configurable Form Drawer + Live Preview */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
          {/* Quick Customizer Fields */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Customize Letter Terms & Conditions
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Salary (CFA / GHS)</label>
                <input
                  type="text"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold font-mono bg-slate-50 text-indigo-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {letterType === 'employment' ? 'Commencement Date' : 'Effective Confirmation Date'}
                </label>
                <input
                  type="text"
                  value={letterType === 'employment' ? commencementDate : confirmationEffectiveDate}
                  onChange={(e) => {
                    if (letterType === 'employment') setCommencementDate(e.target.value);
                    else setConfirmationEffectiveDate(e.target.value);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Probation Duration</label>
                <select
                  value={probationMonths}
                  onChange={(e) => setProbationMonths(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50 cursor-pointer"
                >
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Officer</label>
                <input
                  type="text"
                  value={reportingTo}
                  onChange={(e) => setReportingTo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                />
              </div>
            </div>

            {letterType === 'confirmation' && (
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">Appraisal & Commendation Remarks</label>
                <textarea
                  rows={2}
                  value={commendation}
                  onChange={(e) => setCommendation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-medium"
                />
              </div>
            )}
          </div>

          {/* Letterhead Preview Container */}
          <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 max-w-3xl mx-auto text-slate-900 font-serif leading-relaxed">
            {/* Header */}
            <div className="flex flex-col items-center text-center pb-4 border-b-2 border-slate-900">
              <JIPASLogo size="md" className="mb-2" />
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                JOY INTERNATIONAL SCHOOL (JIPAS)
              </h2>
              <p className="text-xs font-bold text-indigo-700 uppercase mt-0.5">
                Bilingual Educational Complex • Nursery • Primary • JHS • SHS
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {SCHOOL_CONTACT.address} | Tel: {SCHOOL_CONTACT.tel} | Email: {SCHOOL_CONTACT.email}
              </p>
            </div>

            {/* Meta Row */}
            <div className="flex justify-between items-start py-4 text-xs font-sans border-b border-slate-200">
              <div>
                <div><strong>Our Ref:</strong> <span className="font-mono text-indigo-700 font-bold">{refNo}</span></div>
                <div><strong>Staff ID:</strong> <span className="font-mono font-bold">{staff.staffId || staff.id}</span></div>
                <div><strong>Nationality:</strong> {nationality}</div>
              </div>
              <div className="text-right">
                <div><strong>Date:</strong> {letterDate}</div>
                <div><strong>Campus:</strong> {campus}</div>
              </div>
            </div>

            {/* Recipient */}
            <div className="py-4 text-xs font-sans border-l-4 border-indigo-600 pl-3 my-2 bg-slate-50/60 rounded-r-xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Private & Confidential</span>
              <strong className="text-sm text-slate-900 block font-serif">
                {staff.gender === 'Female' ? 'Ms. / Mrs.' : 'Mr.'} {staff.name}
              </strong>
              <div className="text-slate-600">Designation: <strong>{designation}</strong> ({department})</div>
              <div className="text-slate-600">Contact: {staff.phone || '0240000000'} • {staff.email}</div>
            </div>

            {/* Letter Title */}
            <div className="text-center my-4">
              <h3 className={`inline-block font-black text-sm uppercase px-3 py-1 rounded-full border ${
                letterType === 'employment' 
                  ? 'bg-indigo-50 text-indigo-950 border-indigo-200' 
                  : 'bg-emerald-50 text-emerald-950 border-emerald-200'
              }`}>
                {letterType === 'employment' 
                  ? 'OFFICIAL OFFER OF PROVISIONAL APPOINTMENT & EMPLOYMENT'
                  : 'CONFIRMATION OF SUBSTANTIVE APPOINTMENT AFTER SUCCESSFUL PROBATION'}
              </h3>
            </div>

            {/* Body */}
            <div className="text-xs space-y-3 text-justify leading-relaxed">
              <p>Dear {staff.name},</p>
              {letterType === 'employment' ? (
                <>
                  <p>
                    On behalf of the Governing Board and Executive Management of <strong>JOY INTERNATIONAL SCHOOL (JIPAS)</strong>, 
                    we are pleased to offer you provisional appointment as <strong>{designation.toUpperCase()}</strong> in the <strong>{department}</strong>, 
                    tenable at <strong>{campus}</strong>, with effect from <strong>{commencementDate}</strong>.
                  </p>
                  <p>
                    This appointment is subject to the provisions of the Ghana Education Service / Togolese Ministry of National Education guidelines 
                    and the JIPAS Staff Code of Professional Conduct, on the following terms and conditions:
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-sans text-[11.5px]">
                    <div><strong>1. Position & Reporting Line:</strong> You will serve as <em>{designation}</em> and report directly to the <em>{reportingTo}</em>.</div>
                    <div><strong>2. Probationary Period:</strong> You shall serve a probationary period of <strong>{probationMonths}</strong>. During this period, your instructional delivery, classroom discipline, and moral integrity will be appraised.</div>
                    <div><strong>3. Remuneration:</strong> You will receive a monthly gross salary of <strong>CFA / GHS {monthlySalary}</strong>, payable on or before the 28th of every month, subject to statutory pension and tax deductions.</div>
                    <div><strong>4. Working Hours:</strong> 7:30 AM to 4:00 PM (Monday to Friday), plus scheduled staff seminars and academic invigilation.</div>
                    <div><strong>5. Child Safeguarding:</strong> Zero tolerance for corporal punishment or professional misconduct.</div>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    We write on behalf of the Executive Directorate of <strong>JOY INTERNATIONAL SCHOOL (JIPAS)</strong> to formally congratulate you on 
                    the successful completion of your <strong>{probationMonths}</strong> probationary service.
                  </p>
                  <p>
                    Following formal performance review and appraisal by the Academic Oversight Board, Management is pleased to confirm your substantive 
                    tenured appointment as <strong>{designation.toUpperCase()}</strong> in the <strong>{department}</strong> with effect from <strong>{confirmationEffectiveDate}</strong>.
                  </p>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5 font-sans text-[11.5px] text-emerald-950">
                    <div><strong>1. Appraisal Commendation:</strong> {commendation}</div>
                    <div><strong>2. Confirmed Status:</strong> You are now a fully confirmed permanent faculty member of Joy International School, entitled to all standard staff welfare and statutory pension privileges.</div>
                    <div><strong>3. Remuneration:</strong> Confirmed monthly remuneration stands at <strong>CFA / GHS {monthlySalary}</strong> plus applicable allowances.</div>
                    <div><strong>4. Annual Leave:</strong> Entitled to official school vacation leave and institutional holidays.</div>
                  </div>
                </>
              )}
              <p>
                We congratulate you and look forward to your continued dedication to academic excellence and moral leadership.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 text-center font-sans text-xs mt-6">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="font-bold block mt-1">Executive Director / CEO</span>
                <span className="text-[10px] text-slate-500">JIPAS Management</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-500 flex items-center justify-center text-[7.5px] font-black text-indigo-700 rotate-6 uppercase">
                  Official Seal
                </div>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="font-bold block mt-1">Head of School / HR</span>
                <span className="text-[10px] text-slate-500">Registry & Records</span>
              </div>
            </div>

            {/* Tear-Off Slip */}
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400 font-sans text-xs">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-2">
                <span>✂ PLEASE DETACH, SIGN AND RETURN TO HR REGISTRY</span>
                <span>JIPAS HR RECORD</span>
              </div>
              <p className="text-[11px] text-slate-700 italic">
                "I, <strong>{staff.name}</strong>, accept the terms and conditions outlined in this official letter."
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="border-b border-slate-400 h-6"></div>
                <div className="border-b border-slate-400 h-6"></div>
                <div className="border-b border-slate-400 h-6"></div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[9px] text-slate-500 mt-1">
                <span>Employee Signature</span>
                <span>Date</span>
                <span>Phone Number</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4" /> Print Official {letterType === 'employment' ? 'Employment' : 'Confirmation'} Letter
          </button>
        </div>
      </div>
    </div>
  );
}
