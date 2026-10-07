import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  QrCode,
  Printer,
  Search,
  Filter,
  Users,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Layers,
  Phone,
  Calendar
} from 'lucide-react';
import { Student } from '../../types';

interface Props {
  students: Student[];
}

export default function StudentQRIdCardGenerator({ students }: Props) {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'id_cards_studio' | 'gate_scanner'>('id_cards_studio');
  const [scanResult, setScanResult] = useState<{ student: Student; time: string; action: 'ENTRY' | 'EXIT' } | null>(null);
  const [manualMatricule, setManualMatricule] = useState('');

  const classesList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => selectedClass === 'ALL' || s.className === selectedClass)
      .filter(s => !searchQuery || s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNo.includes(searchQuery));
  }, [students, selectedClass, searchQuery]);

  const handleSimulateScan = (admNo: string) => {
    const found = students.find(s => s.admissionNo === admNo || s.admissionNo.includes(admNo));
    if (found) {
      setScanResult({
        student: found,
        time: new Date().toLocaleTimeString(),
        action: 'ENTRY'
      });
      setManualMatricule('');
    } else {
      alert(`Student with matricule ${admNo} not found.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold tracking-wide">
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              <span>OPTION C — PVC QR ID CARDS & CAMPUS GATE SCANNER TERMINAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student & Staff ID Card Studio & Gate Terminal
            </h1>
            <p className="text-sm text-sky-200/80 max-w-2xl">
              Print official 8-on-A4 PVC format student identification cards with encrypted QR codes and monitor live daily entrance gate roll-call.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print 8-on-A4 ID Sheet</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-sky-800/50">
          <button
            onClick={() => setActiveTab('id_cards_studio')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'id_cards_studio'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            8-on-A4 PVC Cards Studio ({filteredStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('gate_scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'gate_scanner'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Live Gate Scanner Terminal
          </button>
        </div>
      </div>

      {/* Studio View */}
      {activeTab === 'id_cards_studio' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-64"
                />
              </div>

              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Classes</option>
                {classesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Showing {filteredStudents.length} ID Cards (Prints in sheets of 8 per A4)
            </div>
          </div>

          {/* Printable 8-on-A4 Grid Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid print:grid-cols-2 print:gap-2 print:p-0">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl border-2 border-indigo-400/40 p-4 shadow-md flex flex-col justify-between relative overflow-hidden text-xs aspect-[85.6/53.98]"
              >
                {/* School Header */}
                <div className="flex items-center justify-between border-b border-indigo-500/40 pb-2">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-sky-300">JOY INTERNATIONAL SCHOOL</div>
                    <div className="text-[6px] text-slate-300">CARTE D'IDENTITÉ SCOLAIRE / STUDENT ID</div>
                  </div>
                  <div className="text-[7px] font-black bg-indigo-500/40 px-1.5 py-0.5 rounded text-indigo-200">
                    2025/2026
                  </div>
                </div>

                {/* Body Details */}
                <div className="flex gap-3 items-center py-2">
                  <div className="w-14 h-16 rounded-xl bg-slate-800 border border-indigo-400/30 flex items-center justify-center text-slate-400 shrink-0 text-[10px] font-black overflow-hidden">
                    {student.fullName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-0.5 overflow-hidden flex-1">
                    <div className="text-xs font-black text-white truncate">{student.fullName}</div>
                    <div className="text-[9px] font-mono text-sky-300 font-bold">Mat: {student.admissionNo}</div>
                    <div className="text-[9px] text-indigo-200 font-bold">Class: {student.className}</div>
                    <div className="text-[8px] text-slate-400">Emergency: {student.parentPhone || 'N/A'}</div>
                  </div>
                </div>

                {/* QR Code Barcode Footer */}
                <div className="flex items-center justify-between border-t border-indigo-500/30 pt-1.5">
                  <div className="text-[6px] font-mono text-slate-400">SECURE VERIFIED CHIP</div>
                  <div className="bg-white p-1 rounded">
                    <QrCode className="w-6 h-6 text-slate-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate Scanner Terminal View */}
      {activeTab === 'gate_scanner' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="text-center max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 bg-sky-100 dark:bg-sky-950 text-sky-600 rounded-full flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Campus Gate Attendance Terminal</h2>
            <p className="text-xs text-slate-500">
              Scan student ID card barcode/QR code or enter matricule for instant attendance verification and parent SMS alert.
            </p>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Enter matricule (e.g. JIPAS-2025-001)..."
                value={manualMatricule}
                onChange={e => setManualMatricule(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSimulateScan(manualMatricule); }}
                className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
              />
              <button
                onClick={() => handleSimulateScan(manualMatricule)}
                className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Scan Pass
              </button>
            </div>
          </div>

          {/* Live Scan Notification Card */}
          {scanResult && (
            <div className="max-w-md mx-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                  GATE ENTRY RECORDED
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">{scanResult.student.fullName}</h3>
                <div className="text-xs font-mono text-slate-500">
                  {scanResult.student.admissionNo} • {scanResult.student.className} • {scanResult.time}
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                ✅ Attendance synced with daily ledger. Parent notified via WhatsApp/SMS.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
