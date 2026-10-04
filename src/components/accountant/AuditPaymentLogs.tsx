import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  X,
  Lock
} from 'lucide-react';
import { 
  getStoredPayments, 
  saveStoredPayments, 
  getStoredBills, 
  saveStoredBills 
} from '../../services/storageService';
import { formatCurrency } from '../../utils/financeUtils';
import { voidPayment, saveBill } from '../../services/dbService';
import { PaymentRecord, Student, StudentBill } from '../../types';

interface AuditPaymentLogsProps {
  payments: PaymentRecord[];
  bills: StudentBill[];
  students: Student[];
  onUpdateBills?: (bills: StudentBill[]) => void;
}

export default function AuditPaymentLogs({
  payments,
  bills,
  students,
  onUpdateBills
}: AuditPaymentLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'HARD' | 'VOID';
    payment: PaymentRecord;
  } | null>(null);

  // Batch Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchConfirmText, setBatchConfirmText] = useState('');

  // Group and find duplicate or tripled payment risks
  const duplicateRiskMap = useMemo(() => {
    const risks = new Map<string, 'DUPLICATE' | 'TRIPLED'>();
    
    // Group non-voided payments by student & amount & date
    const groups: { [key: string]: PaymentRecord[] } = {};
    payments.forEach(p => {
      const isVoid = p.status === 'Voided' || (p as any).isVoided === true;
      if (isVoid) return;
      const key = `${p.studentId || p.admissionNo}-${p.amount}-${p.date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    Object.entries(groups).forEach(([key, list]) => {
      if (list.length >= 3) {
        list.forEach(p => risks.set(p.id, 'TRIPLED'));
      } else if (list.length === 2) {
        list.forEach(p => risks.set(p.id, 'DUPLICATE'));
      }
    });

    return risks;
  }, [payments]);

  // Unique list of student classes for filter dropdown
  const classesList = useMemo(() => {
    const classes = new Set<string>();
    payments.forEach(p => {
      if (p.className) classes.add(p.className);
    });
    return ['All', ...Array.from(classes).sort()];
  }, [payments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !query ||
        (p.studentName || '').toLowerCase().includes(query) ||
        (p.admissionNo || '').toLowerCase().includes(query) ||
        (p.receiptNo || '').toLowerCase().includes(query) ||
        (p.id || '').toLowerCase().includes(query);

      const matchClass = selectedClass === 'All' || p.className === selectedClass;

      return matchSearch && matchClass;
    });
  }, [payments, searchQuery, selectedClass]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Perform permanent deletion of a payment (Hard Delete)
  const executePermanentHardDelete = async (paymentId: string) => {
    try {
      const currentPayments = getStoredPayments();
      const targetPayment = currentPayments.find(p => p.id === paymentId);
      if (!targetPayment) return;

      // Filter out the deleted payment record
      const updatedPayments = currentPayments.filter(p => p.id !== paymentId);
      saveStoredPayments(updatedPayments);

      // Cleanly recalculate matching StudentBill paid total and balances from remaining valid payments
      const studentKeyById = (targetPayment.studentId || '').trim().toLowerCase();
      const studentKeyByAdm = (targetPayment.admissionNo || '').trim().toLowerCase();
      const allBills = getStoredBills();

      const updatedBills = allBills.map(bill => {
        const bId = (bill.studentId || '').trim().toLowerCase();
        const bAdm = (bill.admissionNo || '').trim().toLowerCase();
        const match = (studentKeyById && bId === studentKeyById) ||
                      (studentKeyByAdm && bAdm === studentKeyByAdm);
        if (match) {
          // Filter payments that are still valid for this student
          const studentValidPayments = updatedPayments.filter(p => {
            const isVoid = p.status === 'Voided' || (p as any).isVoided === true;
            if (isVoid) return false;
            const pId = (p.studentId || '').trim().toLowerCase();
            const pAdm = (p.admissionNo || '').trim().toLowerCase();
            return (studentKeyById && pId === studentKeyById) ||
                   (studentKeyByAdm && pAdm === studentKeyByAdm);
          });

          const sumPaid = studentValidPayments.reduce((sum, p) => sum + (p.paid ?? p.amount ?? 0), 0);
          const payable = bill.payable ?? bill.subTotal ?? 0;
          const balance = Math.max(0, payable - sumPaid);
          const status = (balance === 0 ? 'Fully Paid' : (sumPaid > 0 ? 'Partially Paid' : 'Unpaid')) as any;

          const updatedB: StudentBill = {
            ...bill,
            paid: sumPaid,
            paidAmount: sumPaid,
            balance,
            status,
            updatedAt: new Date().toISOString() // Stamp reduction event timestamp!
          };

          // Save back updated bill to cloud
          saveBill(updatedB).catch(err => console.warn('saveBill hard delete cloud notice:', err));
          return updatedB;
        }
        return bill;
      });

      saveStoredBills(updatedBills);
      if (onUpdateBills) {
        onUpdateBills(updatedBills);
      }

      // Dispatch event to trigger App.tsx state refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
      }

      // Clear deleted ID from batch selection if present
      setSelectedIds(prev => prev.filter(id => id !== paymentId));

      showToast(`Payment receipt permanently deleted. The student's bill and paid totals have been cleanly reconciled.`);
      setShowConfirmModal(null);
    } catch (err) {
      console.error('[AuditPaymentLogs] Hard delete failed:', err);
      showToast('Error during payment record deletion.');
    }
  };

  // Perform soft deletion (Void Payment)
  const executeSoftVoid = async (paymentId: string) => {
    try {
      await voidPayment(paymentId, 'Audit Spot Deletion Overrides');
      
      // Dispatch event to trigger App.tsx state refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
      }

      showToast('Payment marked as VOIDED in bursa ledger. Arrears and balances recalculated.');
      setShowConfirmModal(null);
    } catch (err) {
      console.error('[AuditPaymentLogs] Soft void failed:', err);
      showToast('Error during soft payment void.');
    }
  };

  // Perform batch permanent deletion of selected payments (Batch Delete)
  const executeBatchDelete = async () => {
    try {
      const currentPayments = getStoredPayments();
      
      // Filter out all selected payment IDs
      const updatedPayments = currentPayments.filter(p => !selectedIds.includes(p.id));
      saveStoredPayments(updatedPayments);

      // Group selected payments by student so we can cleanly update each student's bill authoritatively
      const selectedPaymentObjects = currentPayments.filter(p => selectedIds.includes(p.id));
      const studentKeys = new Set<string>();
      selectedPaymentObjects.forEach(p => {
        if (p.studentId) studentKeys.add((p.studentId || '').trim().toLowerCase());
        if (p.admissionNo) studentKeys.add((p.admissionNo || '').trim().toLowerCase());
      });

      const allBills = getStoredBills();

      const updatedBills = allBills.map(bill => {
        const bId = (bill.studentId || '').trim().toLowerCase();
        const bAdm = (bill.admissionNo || '').trim().toLowerCase();
        
        const isMatchedStudent = 
          (bId && studentKeys.has(bId)) || 
          (bAdm && studentKeys.has(bAdm));

        if (isMatchedStudent) {
          // Filter remaining valid payments for this student
          const studentValidPayments = updatedPayments.filter(p => {
            const isVoid = p.status === 'Voided' || (p as any).isVoided === true;
            if (isVoid) return false;
            const pId = (p.studentId || '').trim().toLowerCase();
            const pAdm = (p.admissionNo || '').trim().toLowerCase();
            return (bId && pId === bId) ||
                   (bAdm && pAdm === bAdm);
          });

          const sumPaid = studentValidPayments.reduce((sum, p) => sum + (p.paid ?? p.amount ?? 0), 0);
          const payable = bill.payable ?? bill.subTotal ?? 0;
          const balance = Math.max(0, payable - sumPaid);
          const status = (balance === 0 ? 'Fully Paid' : (sumPaid > 0 ? 'Partially Paid' : 'Unpaid')) as any;

          const updatedB: StudentBill = {
            ...bill,
            paid: sumPaid,
            paidAmount: sumPaid,
            balance,
            status,
            updatedAt: new Date().toISOString()
          };

          // Save updated bill to cloud
          saveBill(updatedB).catch(err => console.warn('saveBill batch delete cloud notice:', err));
          return updatedB;
        }
        return bill;
      });

      saveStoredBills(updatedBills);
      if (onUpdateBills) {
        onUpdateBills(updatedBills);
      }

      // Dispatch event to trigger App.tsx state refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
      }

      showToast(`Batch deletion completed. ${selectedIds.length} payment records permanently removed, and corresponding student bills recalculated.`);
      setSelectedIds([]);
      setBatchConfirmText('');
      setShowBatchDeleteModal(false);
    } catch (err) {
      console.error('[AuditPaymentLogs] Batch delete failed:', err);
      showToast('Error during batch payment deletion.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700 animate-scale-in">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-rose-900/40 relative overflow-hidden shadow-md">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Bursary Forensic Tool
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">Phase 54 • Batch Core Shield</span>
          </div>
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            Audit Payment Logs
          </h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Spot, verify, and resolve duplicate or tripled payment entry mistakes. Compare ledger transactions directly with student bill reduction timestamps to keep bursa books clean.
          </p>
        </div>
        <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none">
          <ShieldCheck className="w-32 h-32 text-rose-500" />
        </div>
      </div>

      {/* Quick Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Total Payments Logged</span>
            <h4 className="text-lg font-black text-slate-800 mt-1">{payments.filter(p => p.status !== 'Voided').length} Records</h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Potential Duplicate Risks</span>
            <h4 className="text-lg font-black text-amber-700 mt-1">
              {Array.from(duplicateRiskMap.values()).filter(r => r === 'DUPLICATE').length} Spot Risks
            </h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between col-span-1">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">Tripled Entry Risks</span>
            <h4 className="text-lg font-black text-rose-700 mt-1">
              {Array.from(duplicateRiskMap.values()).filter(r => r === 'TRIPLED').length} Triplicates
            </h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-2xs">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search student, receipt, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-900"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:border-indigo-500 transition-all text-slate-700"
          >
            {classesList.map(c => (
              <option key={c} value={c}>Class: {c}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedClass('All');
              setSelectedIds([]);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        
        {/* Bulk Action Header bar */}
        <div className="p-4.5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Reconciliation & Entry History ({filteredPayments.length} transactions)
            </h4>
            {selectedIds.length > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-scale-in">
                {selectedIds.length} Selected
              </span>
            )}
          </div>
          
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 animate-scale-in">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchConfirmText('');
                  setShowBatchDeleteModal(true);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shadow-rose-950/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Batch Delete Permanent ({selectedIds.length})</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono font-medium">Sorted by date (Recent first)</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredPayments.map(p => p.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Student & Class</th>
                <th className="p-4">Payment Description</th>
                <th className="p-4">Amount & Method</th>
                <th className="p-4">Receipt Metadata / ID</th>
                <th className="p-4">Bill Reduction Stamped</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold space-y-1">
                    <CheckCircle className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs">No matching transactions found matching query.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isVoid = p.status === 'Voided' || (p as any).isVoided === true;
                  const matchedBill = bills.find(b => 
                    b.studentId === p.studentId || 
                    (p.admissionNo && b.admissionNo && b.admissionNo.toLowerCase().trim() === p.admissionNo.toLowerCase().trim())
                  );

                  // Spot duplicate or tripled risk
                  const riskLevel = duplicateRiskMap.get(p.id);

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isVoid ? 'bg-slate-50/40 text-slate-400' : ''
                      } ${selectedIds.includes(p.id) ? 'bg-indigo-50/20' : ''}`}
                    >
                      <td className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, p.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className={`font-black ${isVoid ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {p.studentName || 'Student Name'}
                            </span>
                            <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                              {p.admissionNo} • {p.className}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="max-w-[200px] truncate">
                          <span className="font-semibold text-slate-800">{p.paidAs || 'Tuition Fee'}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {p.academicYear} • {p.term}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          <span className={`font-mono font-black ${isVoid ? 'text-slate-400' : 'text-emerald-700'}`}>
                            {formatCurrency(p.paid ?? p.amount ?? 0)}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold block w-max mt-1">
                            {p.method}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <div>
                          <span className="text-slate-800 font-bold">{p.receiptNo || 'N/A'}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5" title="Unique Payment Transaction ID">
                            ID: {p.id}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        {matchedBill ? (
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10.5px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {matchedBill.updatedAt 
                                ? new Date(matchedBill.updatedAt).toLocaleString() 
                                : 'No Stamp / Auto-Synced'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10.5px] italic">No active bill</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Duplicate Indicator */}
                          {riskLevel === 'TRIPLED' && (
                            <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase animate-pulse">
                              Tripled Record
                            </span>
                          )}
                          {riskLevel === 'DUPLICATE' && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                              Duplicate Risk
                            </span>
                          )}

                          {isVoid ? (
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200 px-2 py-0.5 rounded">
                              Voided
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowConfirmModal({ type: 'VOID', payment: p })}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10.5px] font-bold border border-amber-200 transition-all cursor-pointer"
                                title="Void record to keep traces but adjust balance"
                              >
                                Void
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowConfirmModal({ type: 'HARD', payment: p })}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10.5px] font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-0.5"
                                title="Delete payment permanently from ledger"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Record Action Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 relative my-auto font-medium">
            
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                showConfirmModal.type === 'HARD' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {showConfirmModal.type === 'HARD' ? 'Confirm Permanent Deletion' : 'Confirm Soft Voiding'}
                </h4>
                <p className="text-[10.5px] text-slate-400 font-bold uppercase">
                  Reconciliation Override Control
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are overriding the financial ledger for <strong>{showConfirmModal.payment.studentName}</strong> (Adm: <code>{showConfirmModal.payment.admissionNo}</code>). 
              {showConfirmModal.type === 'HARD' 
                ? ' This will PERMANENTLY REMOVE the payment log of ' 
                : ' This will mark the payment log of '}
              <strong className="text-emerald-700">{formatCurrency(showConfirmModal.payment.paid ?? showConfirmModal.payment.amount ?? 0)}</strong>
              {showConfirmModal.type === 'HARD'
                ? ' and authoritatively recalculate the student\'s remaining arrears. This action cannot be undone.'
                : ' as VOIDED, adjusting student balance without deleting the audit trace.'}
            </p>

            <div className="flex justify-between items-center text-[10.5px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="font-bold text-slate-700">{showConfirmModal.payment.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showConfirmModal.type === 'HARD') {
                    executePermanentHardDelete(showConfirmModal.payment.id);
                  } else {
                    executeSoftVoid(showConfirmModal.payment.id);
                  }
                }}
                className={`w-full py-2.5 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md ${
                  showConfirmModal.type === 'HARD' 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/20' 
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/20'
                }`}
              >
                Confirm Override
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Batch Deletion Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 relative my-auto text-slate-750">
            
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Confirm Batch Deletion
                </h4>
                <p className="text-[10px] text-rose-700 font-black uppercase tracking-wider">
                  Irreversible Administrative Override
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to permanently delete <strong className="text-rose-700">{selectedIds.length} selected payment records</strong> from the school's central bursa books. 
              This will automatically recalculate the associated student bills and update the financial ledger across the school.
            </p>

            <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl space-y-1.5 text-[11px] text-rose-900">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[9px] text-rose-800">
                <Lock className="w-3.5 h-3.5" />
                <span>Security Double-Verification</span>
              </div>
              <p className="leading-relaxed">
                To execute this batch deletion, please type <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-950 font-black font-mono">CONFIRM</code> below:
              </p>
              <input
                type="text"
                placeholder="Type CONFIRM here..."
                value={batchConfirmText}
                onChange={(e) => setBatchConfirmText(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-rose-300 rounded-xl text-xs font-mono font-bold bg-white text-rose-950 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowBatchDeleteModal(false);
                  setBatchConfirmText('');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={batchConfirmText !== 'CONFIRM'}
                onClick={executeBatchDelete}
                className={`w-full py-2.5 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md ${
                  batchConfirmText === 'CONFIRM'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/20'
                    : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedIds.length} Records</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
