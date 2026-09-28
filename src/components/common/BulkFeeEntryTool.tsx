import React, { useState } from 'react';
import { 
  FileText, Upload, AlertCircle, CheckCircle, RefreshCw, X, ArrowRight, Info, Plus, Trash2, HelpCircle
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord, User } from '../../types';
import { saveBill, savePayment } from '../../services/dbService';

interface BulkFeeEntryToolProps {
  students: Student[];
  currentUser: User;
  onClose: () => void;
}

interface ParsedRow {
  index: number;
  raw: string;
  status: 'success' | 'error';
  student?: Student;
  admissionNo?: string;
  particulars?: string;
  amount?: number;
  type?: 'Bill' | 'Payment';
  method?: string;
  notes?: string;
  errorMessage?: string;
}

interface ManualRow {
  id: string;
  admissionNo: string;
  particulars: string;
  amount: number;
  type: 'Bill' | 'Payment';
  method: string;
  notes: string;
}

export default function BulkFeeEntryTool({ students, currentUser, onClose }: BulkFeeEntryToolProps) {
  const [entryMode, setEntryMode] = useState<'paste' | 'manual'>('paste');
  const [step, setStep] = useState<'input' | 'preview' | 'completed'>('input');
  
  // Paste Mode State
  const [pasteData, setPasteData] = useState('');
  
  // Manual Mode State
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: '1', admissionNo: '', particulars: '', amount: 0, type: 'Bill', method: 'Cash', notes: '' }
  ]);

  // Parsing result State
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [importSummary, setSyncSummary] = useState<{
    total: number;
    successCount: number;
    failedCount: number;
    billsCreated: number;
    paymentsCreated: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // Manual Grid Handlers
  // -------------------------------------------------------------
  const handleAddManualRow = () => {
    setManualRows([
      ...manualRows,
      { 
        id: Math.random().toString(36).substring(2, 9), 
        admissionNo: '', 
        particulars: '', 
        amount: 0, 
        type: 'Bill', 
        method: 'Cash', 
        notes: '' 
      }
    ]);
  };

  const handleRemoveManualRow = (id: string) => {
    if (manualRows.length === 1) {
      showToast('You must have at least one entry row.');
      return;
    }
    setManualRows(manualRows.filter(r => r.id !== id));
  };

  const handleUpdateManualRow = (id: string, field: keyof ManualRow, value: any) => {
    setManualRows(
      manualRows.map(r => r.id === id ? { ...r, [field]: value } : r)
    );
  };

  // -------------------------------------------------------------
  // Parser Logic
  // -------------------------------------------------------------
  const handleParseData = () => {
    setError(null);
    const parsed: ParsedRow[] = [];

    if (entryMode === 'paste') {
      if (!pasteData.trim()) {
        setError('Please paste spreadsheet data or type some text first.');
        return;
      }

      const lines = pasteData.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (!line.trim()) return;

        // Skip headers
        if (idx === 0 && (line.toLowerCase().includes('admission') || line.toLowerCase().includes('matricule') || line.toLowerCase().includes('particulars'))) {
          return;
        }

        const parts = line.split(/\t|,/);
        if (parts.length < 3) {
          parsed.push({
            index: idx + 1,
            raw: line,
            status: 'error',
            errorMessage: 'Incorrect column format. Row must have at least: AdmissionNo, Particulars, Amount'
          });
          return;
        }

        const rawAdmission = parts[0]?.trim() || '';
        const rawParticulars = parts[1]?.trim() || '';
        const rawAmount = parseFloat(parts[2]?.trim() || '0');
        const rawType = parts[3]?.trim() || 'Bill';
        const rawMethod = parts[4]?.trim() || 'Cash';
        const rawNotes = parts[5]?.trim() || '';

        if (!rawAdmission) {
          parsed.push({
            index: idx + 1,
            raw: line,
            status: 'error',
            errorMessage: 'Admission Number is empty.'
          });
          return;
        }

        if (isNaN(rawAmount) || rawAmount <= 0) {
          parsed.push({
            index: idx + 1,
            raw: line,
            status: 'error',
            errorMessage: `Invalid amount "${parts[2] || '0'}". Must be a positive number.`
          });
          return;
        }

        // Match student case-insensitively
        const student = students.find(
          s => s.admissionNo.trim().toUpperCase() === rawAdmission.toUpperCase()
        );

        if (!student) {
          parsed.push({
            index: idx + 1,
            raw: line,
            status: 'error',
            admissionNo: rawAdmission,
            particulars: rawParticulars,
            amount: rawAmount,
            errorMessage: `Student with Admission No "${rawAdmission}" not found in database.`
          });
          return;
        }

        const cleanType: 'Bill' | 'Payment' = (rawType.toLowerCase().includes('pay') || rawType.toLowerCase().includes('collect') || rawType.toLowerCase().includes('reçu')) ? 'Payment' : 'Bill';

        parsed.push({
          index: idx + 1,
          raw: line,
          status: 'success',
          student,
          admissionNo: student.admissionNo,
          particulars: rawParticulars || (cleanType === 'Bill' ? 'Tuition Fee' : 'Fee Collection'),
          amount: rawAmount,
          type: cleanType,
          method: rawMethod,
          notes: rawNotes
        });
      });
    } else {
      // Parse manual rows
      let hasValidationError = false;
      manualRows.forEach((row, idx) => {
        const rawAdmission = row.admissionNo.trim();
        const rawParticulars = row.particulars.trim();
        const rawAmount = row.amount;

        if (!rawAdmission) {
          parsed.push({
            index: idx + 1,
            raw: `Row ${idx + 1}`,
            status: 'error',
            errorMessage: 'Admission number is required.'
          });
          hasValidationError = true;
          return;
        }

        if (isNaN(rawAmount) || rawAmount <= 0) {
          parsed.push({
            index: idx + 1,
            raw: `Row ${idx + 1}`,
            status: 'error',
            errorMessage: 'Amount must be a positive number.'
          });
          hasValidationError = true;
          return;
        }

        const student = students.find(
          s => s.admissionNo.trim().toUpperCase() === rawAdmission.toUpperCase()
        );

        if (!student) {
          parsed.push({
            index: idx + 1,
            raw: `Row ${idx + 1}`,
            status: 'error',
            admissionNo: rawAdmission,
            particulars: rawParticulars,
            amount: rawAmount,
            errorMessage: `Student with Admission No "${rawAdmission}" not found.`
          });
          hasValidationError = true;
          return;
        }

        parsed.push({
          index: idx + 1,
          raw: `Row ${idx + 1}`,
          status: 'success',
          student,
          admissionNo: student.admissionNo,
          particulars: rawParticulars || (row.type === 'Bill' ? 'Tuition Fee' : 'Fee Collection'),
          amount: rawAmount,
          type: row.type,
          method: row.method,
          notes: row.notes
        });
      });

      if (hasValidationError) {
        setParsedRows(parsed);
        setStep('preview');
        return;
      }
    }

    if (parsed.length === 0) {
      setError('No valid entry rows were parsed. Please check the data format.');
      return;
    }

    setParsedRows(parsed);
    setStep('preview');
  };

  // -------------------------------------------------------------
  // Bulk Commit execution
  // -------------------------------------------------------------
  const handleCommitBulkEntries = async () => {
    setIsProcessing(true);
    let billsCreated = 0;
    let paymentsCreated = 0;
    let successCount = 0;
    let failedCount = 0;

    const successfulEntries = parsedRows.filter(r => r.status === 'success');

    for (const entry of successfulEntries) {
      try {
        const student = entry.student!;
        const amt = entry.amount || 0;
        const particular = entry.particulars || 'Academic Fees';

        if (entry.type === 'Bill') {
          // Generate StudentBill matching types
          const newBill: StudentBill = {
            id: `bill-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            studentId: student.id,
            studentName: student.fullName,
            admissionNo: student.admissionNo,
            className: student.className,
            academicYear: student.academicYear || '2025/2026',
            term: student.term || 'First Term',
            items: [{ name: particular, amount: amt }],
            subTotal: amt,
            arrears: 0,
            discount: 0,
            payable: amt,
            paid: 0,
            balance: amt,
            status: 'Unpaid',
            dateIssued: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days due
          };

          await saveBill(newBill);
          billsCreated++;
        } else {
          // Generate PaymentRecord matching types
          const newPayment: PaymentRecord = {
            id: `pay-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            receiptNo: `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
            date: new Date().toISOString().split('T')[0],
            studentId: student.id,
            studentName: student.fullName,
            admissionNo: student.admissionNo,
            className: student.className,
            paid: amt,
            amount: amt,
            method: (entry.method as any) || 'Cash',
            status: 'Verified',
            collectedBy: currentUser.name || 'Bursar Desk',
            notes: entry.notes || 'Bulk parsed collection',
            paidAs: particular,
            academicYear: student.academicYear || '2025/2026',
            term: student.term || 'First Term'
          };

          await savePayment(newPayment);
          paymentsCreated++;
        }
        successCount++;
      } catch (err) {
        console.error('[BulkFeeEntry] Error saving entry row:', err);
        failedCount++;
      }
    }

    setSyncSummary({
      total: parsedRows.length,
      successCount,
      failedCount: failedCount + parsedRows.filter(r => r.status === 'error').length,
      billsCreated,
      paymentsCreated
    });

    setStep('completed');
    setIsProcessing(false);
  };

  const handleReset = () => {
    setPasteData('');
    setManualRows([{ id: '1', admissionNo: '', particulars: '', amount: 0, type: 'Bill', method: 'Cash', notes: '' }]);
    setParsedRows([]);
    setSyncSummary(null);
    setStep('input');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Financial Management Tools</span>
          <h3 className="text-xl font-bold text-slate-900">Bulk Fee & Billing Entry</h3>
          <p className="text-xs text-slate-500">Fast, streamlined generation of student bills or payment cash records in bulk</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all"
        >
          Close Tool
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom">
          {toastMessage}
        </div>
      )}

      {/* STEP 1: INPUT COMPONENT */}
      {step === 'input' && (
        <div className="space-y-4">
          
          {/* Mode Selector */}
          <div className="flex border-b border-slate-200 pb-px">
            <button
              onClick={() => setEntryMode('paste')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                entryMode === 'paste' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Paste Spreadsheet Data (Excel / CSV)
            </button>
            <button
              onClick={() => setEntryMode('manual')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                entryMode === 'manual' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Interactive Entry Form
            </button>
          </div>

          {entryMode === 'paste' ? (
            /* Spreadsheet Paste input UI */
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-200/60 p-4 rounded-xl text-xs text-indigo-900 space-y-2">
                <h4 className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Spreadsheet Copy-Paste Instructions
                </h4>
                <p>
                  Copy rows directly from Microsoft Excel or Google Sheets and paste them below. The parser supports tab-separated or comma-separated columns.
                </p>
                <div className="bg-white border border-indigo-200/50 p-2.5 rounded-lg font-mono text-[10px] leading-tight space-y-1">
                  <div className="text-slate-400 font-bold border-b pb-1 mb-1 flex justify-between">
                    <span>Columns (Any order, headers optional):</span>
                    <span className="text-indigo-600">AdmissionNo, Particulars, Amount, Type (Bill/Payment), Method, Notes</span>
                  </div>
                  <div className="text-slate-700">JIPAS-2026-0030, Tuition Fee, 150000, Bill, Cash, First installment</div>
                  <div className="text-slate-700">JIPAS-2026-0042, Exam Levy, 25000, Payment, Mobile Money, Exam registration fee</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Pasted Spreadsheet Workspace:</label>
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Paste rows here..."
                  className="w-full h-44 p-4 border border-slate-300 bg-slate-50/50 rounded-xl font-mono text-[11px] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                />
              </div>
            </div>
          ) : (
            /* Interactive Entry Form Grid UI */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[10px] uppercase">
                      <th className="p-3 w-12 text-center">S/N</th>
                      <th className="p-3 w-36">Admission No *</th>
                      <th className="p-3 w-40">Particulars (Note)</th>
                      <th className="p-3 w-28">Amount (CFA) *</th>
                      <th className="p-3 w-28">Type</th>
                      <th className="p-3 w-28">Payment Mode</th>
                      <th className="p-3">Reference / Notes</th>
                      <th className="p-3 w-12 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {manualRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.admissionNo}
                            onChange={(e) => handleUpdateManualRow(row.id, 'admissionNo', e.target.value)}
                            placeholder="e.g. JIPAS-2026-0030"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900 uppercase font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.particulars}
                            onChange={(e) => handleUpdateManualRow(row.id, 'particulars', e.target.value)}
                            placeholder="e.g. Tuition Fee"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.amount || ''}
                            onChange={(e) => handleUpdateManualRow(row.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900 font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.type}
                            onChange={(e) => handleUpdateManualRow(row.id, 'type', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold"
                          >
                            <option value="Bill">Bill / Invoice</option>
                            <option value="Payment">Payment Cash</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.method}
                            onChange={(e) => handleUpdateManualRow(row.id, 'method', e.target.value)}
                            disabled={row.type !== 'Payment'}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-50"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Mobile money">Mobile money</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => handleUpdateManualRow(row.id, 'notes', e.target.value)}
                            placeholder="Optional metadata..."
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-medium text-slate-600"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveManualRow(row.id)}
                            className="w-6 h-6 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded flex items-center justify-center mx-auto cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Record Row
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={handleParseData}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <span>Parse & Verify Records</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VERIFY DATA */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Preview Results:</span>
            <span>Verify student allocations and details before writing to Supabase.</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[10px] uppercase">
                  <th className="p-3 w-12 text-center">Row</th>
                  <th className="p-3">Matched Student</th>
                  <th className="p-3 font-mono">Admission No</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Particulars</th>
                  <th className="p-3 text-right">Amount (CFA)</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Status / Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row) => (
                  <tr key={row.index} className={row.status === 'error' ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}>
                    <td className="p-3 text-center text-slate-500 font-mono">{row.index}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {row.status === 'success' ? row.student?.fullName : '-'}
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {row.admissionNo || '-'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {row.status === 'success' ? row.student?.className : '-'}
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">
                      {row.particulars || '-'}
                    </td>
                    <td className="p-3 text-right font-black font-mono text-slate-900">
                      {row.amount ? `${row.amount.toLocaleString()} CFA` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {row.status === 'success' ? (
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                          row.type === 'Bill' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.type === 'Bill' ? 'Bill / Invoice' : 'Payment'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {row.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded max-w-[200px] truncate" title={row.errorMessage}>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">{row.errorMessage}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Note: Unresolved rows flagged with error/warning badges will be skipped automatically during commit.
            </span>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Back to Input
            </button>
            <button
              onClick={handleCommitBulkEntries}
              disabled={isProcessing || parsedRows.filter(r => r.status === 'success').length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Committing Financial Entries...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Commit {parsedRows.filter(r => r.status === 'success').length} Valid Entries</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLETED REPORT SUMMARY */}
      {step === 'completed' && importSummary && (
        <div className="space-y-6 text-center py-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50 shadow-md">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900">Bulk Fee Synchronization Completed!</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bulk financial transactions have been synchronized successfully with Supabase and IndexedDB state managers.
            </p>
          </div>

          {/* Sync Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Processed</span>
              <strong className="text-lg font-black text-slate-800">{importSummary.total}</strong>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-emerald-600">Committed</span>
              <strong className="text-lg font-black text-emerald-800">{importSummary.successCount}</strong>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-amber-600">Skipped/Errors</span>
              <strong className="text-lg font-black text-amber-800">{importSummary.failedCount}</strong>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl text-center flex flex-col justify-center">
              <span className="block text-[10px] uppercase font-bold text-indigo-500">Breakdown</span>
              <span className="text-[10px] font-bold text-slate-700 mt-1">
                {importSummary.billsCreated} Bills • {importSummary.paymentsCreated} Payments
              </span>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Perform Another Bulk Entry</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Finish & Return
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
