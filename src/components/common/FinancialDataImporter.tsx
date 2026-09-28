import React, { useState, FormEvent } from 'react';
import { PaymentRecord, StudentBill, SchoolExpenseRecord } from '../../types';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Download, X, 
  Database, FileSpreadsheet, RefreshCw, ShieldCheck, Plus, Layers
} from 'lucide-react';

interface FinancialDataImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPayments?: (payments: PaymentRecord[]) => void;
  onImportBills?: (bills: StudentBill[]) => void;
  onImportExpenses?: (expenses: SchoolExpenseRecord[]) => void;
}

type RecordCategory = 'payments' | 'bills' | 'expenses';

export const FinancialDataImporter: React.FC<FinancialDataImporterProps> = ({
  isOpen,
  onClose,
  onImportPayments,
  onImportBills,
  onImportExpenses
}) => {
  const [activeCategory, setActiveCategory] = useState<RecordCategory>('payments');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sample CSV Templates
  const sampleTemplates: Record<RecordCategory, string> = {
    payments: `receiptNo,date,admissionNo,studentName,className,department,paidAs,method,paid,status,collectedBy
REC-2026-001,2026-09-17,ADM/26/0001,Kofi Ansah,Class 1,Primary,Tuition Fee (Full Term),Mobile money,750,Verified,Accountant
REC-2026-002,2026-09-17,ADM/26/0002,Ama Serwaa,JHS 2,JHS,Tuition Fee (Part Payment),Cash,500,Verified,Bursar
REC-2026-003,2026-09-16,ADM/26/0003,Yaw Mensah,Form 1,SHS/Technical,Exam & ICT Fee,Bank Transfer,250,Verified,Secretary`,

    bills: `admissionNo,studentName,className,department,academicYear,term,subTotal,arrears,discount,payable,paid,balance,status
ADM/26/0001,Kofi Ansah,Class 1,Primary,2025-2026,Term 1,750,0,0,750,750,0,Fully Paid
ADM/26/0002,Ama Serwaa,JHS 2,JHS,2025-2026,Term 1,800,100,0,900,500,400,Partially Paid
ADM/26/0003,Yaw Mensah,Form 1,SHS/Technical,2025-2026,Term 1,1200,0,0,1200,0,1200,Unpaid`,

    expenses: `title,category,amount,department,approvedBy,recordedBy,date,status,paymentMethod,receiptNo
Generator Fuel,Utilities & Fuel,150,Administration,Headmaster,Bursar,2026-09-15,Approved,Cash,VOUCH-901
A4 Printing Papers,Stationery & Books,85,Primary,Accountant,Secretary,2026-09-16,Approved,Cash,VOUCH-902`
  };

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    const content = sampleTemplates[activeCategory];
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JIPAS_${activeCategory}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load sample into text area for testing
  const handleLoadSampleData = () => {
    setCsvText(sampleTemplates[activeCategory]);
    parseCSV(sampleTemplates[activeCategory]);
  };

  // Parse CSV function
  const parseCSV = (text: string) => {
    setParseError(null);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setParseError('CSV must contain a header row and at least one data row.');
        setParsedRows([]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple regex parser for comma separation taking quotes into account
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanValues = values.map(v => v.trim().replace(/^["']|["']$/g, ''));

        const rowObj: Record<string, any> = {};
        headers.forEach((header, index) => {
          let val = cleanValues[index] !== undefined ? cleanValues[index] : '';
          rowObj[header] = val;
        });

        rows.push(rowObj);
      }

      setParsedRows(rows);
    } catch (err) {
      setParseError('Failed to parse CSV file. Please check syntax formatting.');
      setParsedRows([]);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_CSV_SIZE) {
      alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed CSV size is 5MB.`);
      e.target.value = '';
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
      alert('Security Policy: Only .csv and .txt plain text files are allowed.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        parseCSV(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Import
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) {
      alert('No parsed rows to import.');
      return;
    }

    if (activeCategory === 'payments') {
      const paymentsToImport: PaymentRecord[] = parsedRows.map((r, idx) => ({
        id: `IMP-PAY-${Date.now()}-${idx}`,
        receiptNo: r.receiptNo || `REC-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
        date: r.date || new Date().toISOString().split('T')[0],
        studentId: r.studentId || r.admissionNo || `STU-${idx}`,
        studentName: r.studentName || 'Student Name',
        admissionNo: r.admissionNo || `ADM/26/000${idx + 1}`,
        className: r.className || 'Assigned Class',
        department: r.department || 'General',
        paidAs: r.paidAs || 'Tuition Fee Payment',
        paid: parseFloat(r.paid || r.amount || '0') || 0,
        method: r.method || 'Cash',
        status: r.status || 'Verified',
        collectedBy: r.collectedBy || 'Bursar / Accountant Import'
      }));

      if (onImportPayments) {
        onImportPayments(paymentsToImport);
      }
      setSuccessMessage(`Successfully imported ${paymentsToImport.length} payment collection records!`);
    } else if (activeCategory === 'bills') {
      const billsToImport: StudentBill[] = parsedRows.map((r, idx) => {
        const subTotal = parseFloat(r.subTotal || '0') || 0;
        const arrears = parseFloat(r.arrears || '0') || 0;
        const discount = parseFloat(r.discount || '0') || 0;
        const payable = parseFloat(r.payable || (subTotal + arrears - discount).toString()) || 0;
        const paid = parseFloat(r.paid || '0') || 0;
        const balance = parseFloat(r.balance || (payable - paid).toString()) || 0;

        return {
          id: `IMP-BILL-${Date.now()}-${idx}`,
          studentId: r.studentId || r.admissionNo || `STU-${idx}`,
          studentName: r.studentName || 'Student Name',
          admissionNo: r.admissionNo || `ADM/26/000${idx + 1}`,
          className: r.className || 'Class 1',
          academicYear: r.academicYear || '2025-2026',
          term: r.term || 'Term 1',
          items: [{ name: 'Tuition & Academic Term Bill', amount: subTotal }],
          subTotal,
          arrears,
          discount,
          payable,
          paid,
          balance,
          status: balance <= 0 ? 'Fully Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid')
        };
      });

      if (onImportBills) {
        onImportBills(billsToImport);
      }
      setSuccessMessage(`Successfully imported ${billsToImport.length} student bill statements!`);
    } else if (activeCategory === 'expenses') {
      const expensesToImport: SchoolExpenseRecord[] = parsedRows.map((r, idx) => ({
        id: `IMP-EXP-${Date.now()}-${idx}`,
        title: r.title || 'Institutional Expense',
        category: r.category || 'General Operations',
        amount: parseFloat(r.amount || '0') || 0,
        department: r.department || 'Administration',
        approvedBy: r.approvedBy || 'Accountant',
        recordedBy: r.recordedBy || 'Bursar',
        date: r.date || new Date().toISOString().split('T')[0],
        status: r.status || 'Approved',
        paymentMethod: r.paymentMethod || 'Cash',
        receiptNo: r.receiptNo || `VOUCH-IMP-${idx + 1}`
      }));

      if (onImportExpenses) {
        onImportExpenses(expensesToImport);
      }
      setSuccessMessage(`Successfully imported ${expensesToImport.length} expense voucher records!`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Bursary Financial Data Importer</h2>
              <p className="text-xs text-slate-500">Import CSV / Excel statements into JIPAS financial records</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold rounded-2xl flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('payments');
              setCsvText('');
              setParsedRows([]);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'payments' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Payment Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('bills');
              setCsvText('');
              setParsedRows([]);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'bills' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Student Bills</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('expenses');
              setCsvText('');
              setParsedRows([]);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeCategory === 'expenses' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Expenses</span>
          </button>
        </div>

        {/* Action Controls & Sample Download */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-2 bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-100 font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Download {activeCategory.toUpperCase()} Sample CSV</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Load Sample CSV Text</span>
            </button>
          </div>

          <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs">
            <Upload className="w-4 h-4" />
            <span>Upload CSV File</span>
            <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Text area for CSV Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Paste CSV Contents Below (Comma Delimited):
          </label>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              parseCSV(e.target.value);
            }}
            placeholder={`receiptNo,date,admissionNo,studentName,className,department,paidAs,method,paid,status...`}
            className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-300 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Errors */}
        {parseError && (
          <div className="p-3 bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Parsed Rows Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800">
                Parsed Data Preview ({parsedRows.length} Rows Ready)
              </span>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Valid Format Detected
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">#</th>
                    {Object.keys(parsedRows[0]).map((k) => (
                      <th key={k} className="p-2.5">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                      {Object.keys(row).map((k) => (
                        <td key={k} className="p-2.5 max-w-[150px] truncate">{row[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleExecuteImport}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md disabled:opacity-40 cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Confirm & Import {parsedRows.length} Records</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default FinancialDataImporter;
