import React, { useState } from 'react';
import { 
  CreditCard, Printer, Download, Search, Filter, Sparkles, 
  QrCode, ShieldCheck, CheckCircle2, UserCheck, Phone, Mail, 
  Calendar, Award, Building2, RefreshCw, Eye, Share2, Layers
} from 'lucide-react';
import { Teacher } from '../../types';
import JIPASLogo from '../common/JIPASLogo';

interface TeacherIdCardGeneratorProps {
  teachers: Teacher[];
  onNavigate?: (module: string) => void;
}

export default function TeacherIdCardGenerator({
  teachers,
  onNavigate
}: TeacherIdCardGeneratorProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [viewSide, setViewSide] = useState<'both' | 'front' | 'back'>('both');
  const [cardTheme, setCardTheme] = useState<'navy' | 'emerald' | 'burgundy'>('navy');
  const [printSuccessToast, setPrintSuccessToast] = useState(false);

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.staffId && t.staffId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.designation && t.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.ntcLicenseNo && t.ntcLicenseNo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = departmentFilter === 'All' || t.department === departmentFilter;
    const matchesSelected = selectedTeacherId === 'all' || t.id === selectedTeacherId;

    return matchesSearch && matchesDept && matchesSelected;
  });

  const handlePrintBatch = () => {
    setPrintSuccessToast(true);
    setTimeout(() => {
      window.print();
      setPrintSuccessToast(false);
    }, 500);
  };

  const getThemeClasses = (theme: 'navy' | 'emerald' | 'burgundy') => {
    switch (theme) {
      case 'emerald':
        return {
          cardBg: 'from-emerald-950 via-teal-900 to-slate-950 border-emerald-700/60',
          accent: 'text-emerald-300',
          badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
          borderAccent: 'border-emerald-400',
          stripBg: 'bg-emerald-900/60'
        };
      case 'burgundy':
        return {
          cardBg: 'from-rose-950 via-slate-900 to-amber-950 border-rose-800/60',
          accent: 'text-amber-300',
          badge: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
          borderAccent: 'border-amber-400',
          stripBg: 'bg-rose-900/60'
        };
      default:
        return {
          cardBg: 'from-slate-950 via-indigo-950 to-slate-900 border-indigo-700/60',
          accent: 'text-amber-400',
          badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
          borderAccent: 'border-amber-400',
          stripBg: 'bg-indigo-900/60'
        };
    }
  };

  const currentTheme = getThemeClasses(cardTheme);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {printSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs animate-bounce">
          <Printer className="w-4 h-4" /> Preparing Teacher ID Cards for High-Resolution Print...
        </div>
      )}

      {/* Control Bar Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 print:hidden">
        <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Teacher & Staff Identification Card Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate, customize, and print official the regionian Basic & JHS Staff ID Cards with biometric photos, NTC License badges, and secure QR codes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintBatch}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print ID Cards ({filteredTeachers.length})
            </button>
          </div>
        </div>

        {/* Filters & Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Search */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Search Staff</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Staff ID, NTC License..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Select Specific Faculty */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Faculty Member</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Faculty ({teachers.length})</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation || 'Teacher'})
                </option>
              ))}
            </select>
          </div>

          {/* View Sides */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Display Mode</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['both', 'front', 'back'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewSide(mode)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg capitalize cursor-pointer transition-colors ${
                    viewSide === mode ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Badge Aesthetic Theme */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Color Palette</label>
            <div className="flex gap-2">
              {[
                { id: 'navy', name: 'Navy Gold', bg: 'bg-indigo-900 border-amber-400' },
                { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-900 border-emerald-400' },
                { id: 'burgundy', name: 'Burgundy', bg: 'bg-rose-950 border-amber-400' },
              ].map(th => (
                <button
                  key={th.id}
                  onClick={() => setCardTheme(th.id as any)}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    cardTheme === th.id ? 'ring-2 ring-indigo-500 bg-slate-100 font-black' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${th.bg} border`} />
                  {th.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Display Grid */}
      <div className="space-y-6">
        {filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">No Teacher Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Try adjusting your search query or selecting a different faculty member from the dropdown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
            {filteredTeachers.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none"
              >
                {/* Header Action bar per teacher */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 print:hidden text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      ({t.staffId || `JIPAS/STAFF/2026/${t.id.replace('t', '').padStart(3, '0')}`})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Teacher ID - ${t.name}</title>
                              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                              <style>
                                @media print { @page { size: auto; margin: 10mm; } }
                              </style>
                            </head>
                            <body class="p-8 flex items-center justify-center bg-white">
                              <div id="card-content"></div>
                            </body>
                          </html>
                        `);
                        window.print();
                      } else {
                        window.print();
                      }
                    }}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Single
                  </button>
                </div>

                {/* ID Card Wrapper (Front + Back) */}
                <div className="flex flex-col sm:flex-row gap-5 items-stretch justify-center">
                  {/* ======================= FRONT OF CARD ======================= */}
                  {(viewSide === 'both' || viewSide === 'front') && (
                    <div
                      className={`w-full sm:w-[320px] h-[480px] bg-gradient-to-br ${currentTheme.cardBg} text-white rounded-2xl p-5 shadow-lg border relative flex flex-col justify-between overflow-hidden shrink-0 print:break-inside-avoid`}
                    >
                      {/* Watermark Crest */}
                      <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none w-48 h-48 rounded-full border-8 border-white" />
                      
                      {/* Top Header */}
                      <div className="space-y-2 border-b border-white/20 pb-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <JIPASLogo size="xs" />
                            <div>
                              <h3 className="font-black text-sm tracking-wider leading-tight text-white">
                                JIPAS
                              </h3>
                              <p className="text-[8px] text-slate-300 uppercase tracking-widest font-semibold">
                                Basic & Junior High School
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${currentTheme.badge}`}>
                            FACULTY & STAFF
                          </span>
                        </div>
                      </div>

                      {/* Photo & Identity Core */}
                      <div className="flex flex-col items-center text-center space-y-2.5 my-auto">
                        <div className="relative">
                          <img
                            src={t.photo || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'}
                            alt={t.name}
                            className={`w-24 h-24 rounded-2xl object-cover border-2 ${currentTheme.borderAccent} shadow-md`}
                          />
                          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-sm border border-slate-900" title="Active Faculty">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div>
                          <h4 className="font-black text-base text-white tracking-tight">
                            {t.name}
                          </h4>
                          <p className={`text-xs font-bold ${currentTheme.accent} mt-0.5`}>
                            {t.designation || 'Class Teacher'}
                          </p>
                          <div className="inline-block mt-1 bg-white/10 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-200">
                            {t.staffId || `JIPAS/STAFF/2026/${t.id.replace('t', '').padStart(3, '0')}`}
                          </div>
                        </div>
                      </div>

                      {/* Key Faculty Attributes */}
                      <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-300">GES / NTC Rank:</span>
                          <span className="font-bold text-white">{t.rank || 'Senior Supt. I'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">NTC License No:</span>
                          <span className="font-mono font-bold text-amber-300">{t.ntcLicenseNo || 'NTC/TR/2022/49821'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Classes Taught:</span>
                          <span className="font-bold text-white truncate max-w-[150px]">{t.classesTaught?.join(', ') || 'Primary'}</span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] text-slate-300">
                        <div>
                          <span className="block text-[7px] uppercase font-bold text-slate-400">Valid Academic Year</span>
                          <span className="font-bold text-white font-mono">2026 — 2027</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white text-slate-900 px-1.5 py-1 rounded">
                          <QrCode className="w-5 h-5 text-slate-900" />
                          <span className="text-[7px] font-mono font-bold leading-tight uppercase">
                            SCAN TO<br />VERIFY
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================= BACK OF CARD ======================= */}
                  {(viewSide === 'both' || viewSide === 'back') && (
                    <div
                      className={`w-full sm:w-[320px] h-[480px] bg-gradient-to-br ${currentTheme.cardBg} text-white rounded-2xl p-5 shadow-lg border relative flex flex-col justify-between overflow-hidden shrink-0 print:break-inside-avoid`}
                    >
                      {/* Top Magnet Strip Simulation */}
                      <div className="w-full h-8 bg-slate-950/80 -mx-5 -mt-5 mb-3 border-b border-white/10 flex items-center px-4">
                        <span className="text-[8px] font-mono tracking-widest text-slate-500">
                          JIPAS-SECURE-MAGNETIC-ENCODE-CHIP
                        </span>
                      </div>

                      {/* Notice & Terms */}
                      <div className="space-y-2 text-[9px] text-slate-300 leading-relaxed">
                        <h5 className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-white/20 pb-1">
                          Official Staff ID Card Terms
                        </h5>
                        <p>
                          1. This identity card is the official property of <strong>JIPAS</strong> and is non-transferable.
                        </p>
                        <p>
                          2. The bearer whose name and photograph appear on the face is an authorized staff member entitled to all rights and privileges.
                        </p>
                        <p>
                          3. If found, please return to JIPAS Administration Office or report immediately via emergency contact.
                        </p>
                      </div>

                      {/* Emergency & Biometrics Box */}
                      <div className="bg-white/10 rounded-xl p-2.5 space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Emergency Phone:</span>
                          <span className="font-mono font-bold text-white">{t.emergencyContact || t.phone || '0249755593'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Staff Blood Group:</span>
                          <span className="font-mono font-bold text-amber-300">{t.bloodGroup || 'O+'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Faculty Email:</span>
                          <span className="font-medium text-white truncate max-w-[150px]">{t.email}</span>
                        </div>
                      </div>

                      {/* Headmaster Signature & Seal */}
                      <div className="pt-2 border-t border-white/20 flex justify-between items-end">
                        <div className="text-center">
                          <div className="font-serif italic text-xs text-amber-300 font-bold border-b border-white/40 pb-0.5 px-3">
                            Marcus Prosper
                          </div>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 block mt-0.5">
                            Authorized Headmaster Signatory
                          </span>
                        </div>

                        {/* Official Stamp Simulation */}
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-400/80 flex flex-col items-center justify-center text-[6px] font-black text-amber-300 uppercase leading-tight text-center p-0.5">
                          <span>JIPAS</span>
                          <span>SEAL</span>
                          <span>2026</span>
                        </div>
                      </div>

                      {/* Barcode Footer */}
                      <div className="bg-white text-slate-900 rounded p-1 text-center font-mono font-bold text-[10px] tracking-widest">
                        ||||| | |||| ||| ||||| || |||
                        <span className="block text-[7px] text-slate-600 tracking-normal">
                          *JIPAS-FACULTY-ID-{t.id.toUpperCase()}*
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
