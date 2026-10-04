import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, Plus, Search, Filter, Printer, Download, CheckCircle2, 
  Clock, AlertTriangle, XCircle, FileText, School, User, Calendar, ShieldCheck, X
} from 'lucide-react';
import { Student, StudentTransferRecord } from '../../types';
import { getStoredTransfers, saveStoredTransfers } from '../../services/storageService';
import { subscribeStudentTransfers, saveStudentTransfer } from '../../services/dbService';
import { printContent } from '../../utils/printUtils';
import JIPASLogo, { getSchoolLogo } from '../common/JIPASLogo';

interface StudentTransferManagerProps {
  students: Student[];
  onUpdateStudent?: (student: Student) => void;
  currentUser?: any;
}

export default function StudentTransferManager({
  students,
  onUpdateStudent,
  currentUser
}: StudentTransferManagerProps) {
  const [transfers, setTransfers] = useState<StudentTransferRecord[]>(() => getStoredTransfers());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [transferType, setTransferType] = useState<'Inter-Campus Transfer' | 'Transfer Out' | 'Transfer In'>('Inter-Campus Transfer');
  const [fromCampus, setFromCampus] = useState('JIPAS 1');
  const [toCampus, setToCampus] = useState('JIPAS 2');
  const [fromSchool, setFromSchool] = useState('');
  const [toSchool, setToSchool] = useState('');
  const [fromClass, setFromClass] = useState('');
  const [toClass, setToClass] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Relocation of parent/guardian');
  const [clearanceStatus, setClearanceStatus] = useState<'Pending' | 'Approved' | 'Completed' | 'Rejected'>('Approved');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeStudentTransfers((items) => {
      setTransfers(items);
    });
    return () => unsub();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // When student is selected in add modal, auto-populate fromClass and fromCampus
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const stu = students.find(s => s.id === studentId);
    if (stu) {
      setFromClass(stu.className || 'Basic 1');
      setToClass(stu.className || 'Basic 1');
      setFromCampus(stu.campus || 'JIPAS 1');
      setToCampus(stu.campus === 'JIPAS 1' ? 'JIPAS 2' : 'JIPAS 1');
    }
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId && transferType !== 'Transfer In') {
      alert('Please select a student.');
      return;
    }

    const stu = students.find(s => s.id === selectedStudentId);
    const studentName = stu ? stu.fullName : 'New Transferred Student';
    const admissionNo = stu ? (stu.admissionNo || stu.id) : `TR-IN-${Date.now().toString().slice(-4)}`;

    setIsSubmitting(true);
    try {
      const newRecord: StudentTransferRecord = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: selectedStudentId || `stu-${Date.now()}`,
        studentName,
        admissionNo,
        transferType,
        fromCampus: transferType === 'Inter-Campus Transfer' ? fromCampus : undefined,
        toCampus: transferType === 'Inter-Campus Transfer' ? toCampus : undefined,
        fromSchool: transferType === 'Transfer In' ? fromSchool : 'Joy International School (JIPAS)',
        toSchool: transferType === 'Transfer Out' ? toSchool : (transferType === 'Inter-Campus Transfer' ? `JIPAS (${toCampus})` : 'Joy International School (JIPAS)'),
        fromClass: fromClass || 'Basic 1',
        toClass: toClass || 'Basic 1',
        date: transferDate,
        reason,
        clearanceStatus,
        authorizedBy: currentUser?.name || 'Administrator',
        certificateIssued: transferType === 'Transfer Out',
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await saveStudentTransfer(newRecord);

      // If student is transferring campus or transferring out, optionally update student record
      if (stu && onUpdateStudent) {
        if (transferType === 'Inter-Campus Transfer' && clearanceStatus === 'Approved') {
          onUpdateStudent({
            ...stu,
            campus: toCampus,
            className: toClass
          });
        } else if (transferType === 'Transfer Out' && clearanceStatus === 'Completed') {
          onUpdateStudent({
            ...stu,
            status: 'Inactive'
          });
        }
      }

      triggerToast(`✓ Transfer record for ${studentName} successfully registered!`);
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      alert('Failed to register transfer: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setTransferType('Inter-Campus Transfer');
    setFromCampus('JIPAS 1');
    setToCampus('JIPAS 2');
    setFromSchool('');
    setToSchool('');
    setFromClass('');
    setToClass('');
    setReason('Relocation of parent/guardian');
    setClearanceStatus('Approved');
    setNotes('');
  };

  const handlePrintTransferCertificate = (record: StudentTransferRecord) => {
    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 36px 48px; color: #1e293b; max-width: 800px; margin: 0 auto; border: 4px double #1e3a8a; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px;">
          <img src="${absoluteLogoSrc}" alt="JIPAS Crest" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 8px;" />
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; text-transform: uppercase;">
            Joy International School (JIPAS)
          </h1>
          <p style="margin: 3px 0 0 0; font-size: 11px; font-style: italic; color: #475569;">
            "Excellence in Knowledge and Character" — JOY INTERNATIONAL SCHOOL (JIPAS)
          </p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
            Accredited by the Ministry of Education • Official Campus: ${record.fromCampus || 'Main Campus'}
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="display: inline-block; margin: 0; font-size: 16px; font-weight: bold; color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 3px; letter-spacing: 1px; text-transform: uppercase;">
            Official School Leaving & Transfer Certificate (TC)
          </h2>
          <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold; color: #334155;">
            Certificate Ref No: <span style="font-family: monospace; color: #1e3a8a;">TC-${record.id.slice(-6).toUpperCase()}</span>
          </p>
        </div>

        <p style="font-size: 13px; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
          This is to officially certify that <strong>${record.studentName.toUpperCase()}</strong>, bearing Admission Number 
          <strong>${record.admissionNo}</strong>, was a bona fide student of Joy International School, enrolled in class 
          <strong>${record.fromClass}</strong>.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
          <tbody>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; width: 40%; color: #475569;">Transfer Category:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #1e293b;">${record.transferType}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Institution Transferred From:</td>
              <td style="padding: 6px 0;">${record.fromSchool || `Joy International School (${record.fromCampus || 'Campus 1'})`}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Institution Transferred To:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #1e3a8a;">${record.toSchool || `Joy International School (${record.toCampus || 'Campus 2'})`}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Class at Time of Leaving:</td>
              <td style="padding: 6px 0;">${record.fromClass}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Class Recommended for Admission:</td>
              <td style="padding: 6px 0; font-weight: bold;">${record.toClass}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Effective Date of Transfer:</td>
              <td style="padding: 6px 0;">${record.date}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Reason for Leaving:</td>
              <td style="padding: 6px 0;">${record.reason}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Financial & Library Clearance:</td>
              <td style="padding: 6px 0; color: #047857; font-weight: bold;">Cleared in Full (All Dues Settled)</td>
            </tr>
            <tr style="border-bottom: 1px dotted #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">General Character & Conduct:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #047857;">Exemplary / Very Good</td>
            </tr>
          </tbody>
        </table>

        <p style="font-size: 12px; line-height: 1.6; margin-bottom: 32px; color: #334155;">
          We extend our sincere best wishes to the student in their continuing educational endeavors.
        </p>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px;">
          <div style="text-align: center; width: 220px;">
            <div style="border-bottom: 1px solid #334155; margin-bottom: 4px; height: 35px;"></div>
            <p style="margin: 0; font-size: 11px; font-weight: bold;">Academic Registrar</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Joy International School</p>
          </div>

          <div style="text-align: center; width: 140px; border: 2px dashed #94a3b8; padding: 12px 6px; border-radius: 8px;">
            <p style="margin: 0; font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">
              Official School<br/>Seal & Stamp
            </p>
          </div>

          <div style="text-align: center; width: 220px;">
            <div style="border-bottom: 1px solid #334155; margin-bottom: 4px; height: 35px;"></div>
            <p style="margin: 0; font-size: 11px; font-weight: bold;">Headmaster / Principal</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Joy International School</p>
          </div>
        </div>
      </div>
    `;

    printContent(html, `JIPAS_Transfer_Certificate_${record.admissionNo}`);
  };

  const filteredTransfers = transfers.filter(t => {
    const matchSearch = !searchQuery || 
      t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.toSchool && t.toSchool.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.fromSchool && t.fromSchool.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchType = filterType === 'All' || t.transferType === filterType;
    const matchStatus = filterStatus === 'All' || t.clearanceStatus === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Student Mobility & Lifecycle</span>
          <h3 className="text-xl font-black text-slate-900">Student Transfers & Leaving Certificates</h3>
          <p className="text-xs text-slate-500">Manage Inter-Campus transfers, Transfer-Out leaving certificates, and Transfer-In admissions</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Record New Transfer
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-700">Total Transfers</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">{transfers.length} Records</h4>
          </div>
          <ArrowRightLeft className="w-8 h-8 text-indigo-600 opacity-70" />
        </div>
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700">Inter-Campus Moves</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {transfers.filter(t => t.transferType === 'Inter-Campus Transfer').length} Moves
            </h4>
          </div>
          <School className="w-8 h-8 text-blue-600 opacity-70" />
        </div>
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700">Transferred Out</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {transfers.filter(t => t.transferType === 'Transfer Out').length} Out
            </h4>
          </div>
          <FileText className="w-8 h-8 text-amber-600 opacity-70" />
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700">Transferred In</span>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">
              {transfers.filter(t => t.transferType === 'Transfer In').length} In
            </h4>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-70" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transfers by student name, admission no, or school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Inter-Campus Transfer">Inter-Campus</option>
            <option value="Transfer Out">Transfer Out</option>
            <option value="Transfer In">Transfer In</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No student transfer records found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Record New Transfer" to register campus moves or generate leaving certificates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3">Transfer Type</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">From &rarr; To</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Clearance</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransfers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        item.transferType === 'Inter-Campus Transfer'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : item.transferType === 'Transfer Out'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {item.transferType}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.studentName}</td>
                    <td className="p-3 font-mono text-slate-500">{item.admissionNo}</td>
                    <td className="p-3">
                      <div className="text-slate-700">
                        <span className="font-semibold text-slate-500">{item.fromCampus ? `Campus: ${item.fromCampus}` : item.fromSchool}</span>
                        {' '}&rarr;{' '}
                        <span className="font-bold text-indigo-700">{item.toCampus ? `Campus: ${item.toCampus}` : item.toSchool}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">
                      {item.fromClass} &rarr; {item.toClass}
                    </td>
                    <td className="p-3 text-slate-500">{item.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.clearanceStatus === 'Approved' || item.clearanceStatus === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.clearanceStatus === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.clearanceStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintTransferCertificate(item)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Print Official School Leaving / Transfer Certificate"
                      >
                        <Printer className="w-3.5 h-3.5" /> Certificate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transfer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Record Student Transfer</h3>
                <p className="text-xs text-slate-400">Process inter-campus moves, school transfers, and certificates</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Type *</label>
                <select
                  value={transferType}
                  onChange={(e) => setTransferType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="Inter-Campus Transfer">Inter-Campus Transfer (JIPAS 1 &harr; JIPAS 2)</option>
                  <option value="Transfer Out">Transfer Out (Leaving for another institution)</option>
                  <option value="Transfer In">Transfer In (Admitted from another school)</option>
                </select>
              </div>

              {transferType !== 'Transfer In' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  >
                    <option value="">-- Choose enrolled student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNo || s.id}) — {s.className} [{s.campus || 'JIPAS 1'}]
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previous School Name *</label>
                  <input
                    type="text"
                    required
                    value={fromSchool}
                    onChange={(e) => setFromSchool(e.target.value)}
                    placeholder="e.g. Achimota Basic / Lomé Christian Academy"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              )}

              {transferType === 'Inter-Campus Transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">From Campus</label>
                    <select
                      value={fromCampus}
                      onChange={(e) => setFromCampus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                    >
                      <option value="JIPAS 1">JIPAS 1 (Kpéhénou)</option>
                      <option value="JIPAS 2">JIPAS 2 (Hedzranawoe)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">To Campus *</label>
                    <select
                      value={toCampus}
                      onChange={(e) => setToCampus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-indigo-700"
                    >
                      <option value="JIPAS 1">JIPAS 1 (Kpéhénou)</option>
                      <option value="JIPAS 2">JIPAS 2 (Hedzranawoe)</option>
                    </select>
                  </div>
                </div>
              )}

              {transferType === 'Transfer Out' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination School Name *</label>
                  <input
                    type="text"
                    required
                    value={toSchool}
                    onChange={(e) => setToSchool(e.target.value)}
                    placeholder="e.g. St. Thomas Aquinas High School"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Class *</label>
                  <input
                    type="text"
                    required
                    value={fromClass}
                    onChange={(e) => setFromClass(e.target.value)}
                    placeholder="e.g. JHS 2"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To / Recommended Class *</label>
                  <input
                    type="text"
                    required
                    value={toClass}
                    onChange={(e) => setToClass(e.target.value)}
                    placeholder="e.g. JHS 2"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clearance Status *</label>
                  <select
                    value={clearanceStatus}
                    onChange={(e) => setClearanceStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-emerald-700"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Transfer *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Relocation of parents, change of stream"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Clearance Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bursary fees fully settled, library textbooks returned"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Record Transfer & Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
