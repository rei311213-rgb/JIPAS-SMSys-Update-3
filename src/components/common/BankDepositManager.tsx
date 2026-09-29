import React, { useState, useEffect, useMemo } from 'react';
import { BankDepositRecord } from '../../types';
import { getStoredBankDeposits, saveStoredBankDeposits } from '../../services/storageService';
import { addMoney } from '../../utils/financeUtils';
import { 
  Building, Receipt, Plus, Search, CheckCircle2, Calendar, User, 
  FileText, Printer, Wallet, Clock, ArrowUpRight, ShieldCheck, X, RefreshCw,
  Building2, CreditCard
} from 'lucide-react';

interface BankDepositManagerProps {
  userRole: 'accountant' | 'sub_accountant' | 'secretary' | 'bursal' | 'admin';
  userName: string;
  className?: string;
}

export const BankDepositManager: React.FC<BankDepositManagerProps> = ({
  userRole,
  userName,
  className = ''
}) => {
  const [deposits, setDeposits] = useState<BankDepositRecord[]>(() => getStoredBankDeposits());
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState('All');
  const [selectedReceipt, setSelectedReceipt] = useState<BankDepositRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [bankName, setBankName] = useState('Ecobank the region');
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('1441002981201');
  const [amount, setAmount] = useState('');
  const [bankReceiptNo, setBankReceiptNo] = useState('');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('School Fees & Revenue Bank Deposit');
  const [notes, setNotes] = useState('');

  // Reload deposits
  const reloadDeposits = () => {
    setDeposits(getStoredBankDeposits());
  };

  useEffect(() => {
    reloadDeposits();
  }, []);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => {
      const matchesQuery = 
        d.bankReceiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.depositedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.referenceNo && d.referenceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.purpose.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBank = selectedBankFilter === 'All' || d.bankName === selectedBankFilter;

      return matchesQuery && matchesBank;
    }).sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [deposits, searchQuery, selectedBankFilter]);

  // Financial Stats
  const totalBankedAmount = useMemo(() => {
    return addMoney(...deposits.map(d => d.amount || 0));
  }, [deposits]);

  const uniqueBanks = useMemo(() => {
    const set = new Set(deposits.map(d => d.bankName));
    return Array.from(set);
  }, [deposits]);

  // Submit Bank Deposit
  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid deposit amount greater than 0 CFA.');
      return;
    }

    if (!bankReceiptNo.trim()) {
      alert('Please enter the Bank Receipt or Teller Slip Number.');
      return;
    }

    const finalBankName = bankName === 'Other' ? customBankName.trim() || 'Commercial Bank' : bankName;

    const newRecord: BankDepositRecord = {
      id: `DEP-${Date.now()}`,
      bankName: finalBankName,
      accountNumber: accountNumber.trim(),
      amount: parsedAmount,
      bankReceiptNo: bankReceiptNo.trim(),
      date: depositDate,
      depositedBy: `${userName} (${userRole.toUpperCase()})`,
      depositedByRole: userRole,
      purpose: purpose.trim() || 'School Operational Funds Banking',
      referenceNo: `SLIP-${Date.now().toString().slice(-6)}`,
      notes: notes.trim(),
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    const updatedList = [newRecord, ...deposits];
    setDeposits(updatedList);
    saveStoredBankDeposits(updatedList);

    setToastMessage(`Bank Deposit of ${parsedAmount.toFixed(2)} CFA successfully logged with Receipt #${bankReceiptNo}!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Reset Form
    setShowAddModal(false);
    setAmount('');
    setBankReceiptNo('');
    setNotes('');
  };

  // Print Bank Voucher / Receipt
  const handlePrintVoucher = (rec: BankDepositRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bank Deposit Slip Voucher - ${rec.bankReceiptNo}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; max-width: 650px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .school { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
            .badge { display: inline-block; background: #0284c7; color: white; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 4px; margin-top: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
            .field { background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
            .value { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .amount-box { background: #f0fdf4; border: 2px border #16a34a; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
            .amount-title { font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; }
            .amount-num { font-size: 28px; font-weight: 900; color: #166534; margin-top: 4px; }
            .sig-section { display: flex; justify-content: space-between; margin-top: 50px; font-size: 11px; }
            .sig-line { border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 4px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="school">JIPAS Educational Complex</h1>
            <p class="sub">GES Accredited Institution • Bank Deposit Verification Voucher</p>
            <div class="badge">OFFICIAL BANK DEPOSIT RECEIPT LOG</div>
          </div>

          <div class="amount-box">
            <div class="amount-title">Total Amount Deposited</div>
            <div class="amount-num">${rec.amount.toFixed(2)} CFA</div>
          </div>

          <div class="grid">
            <div class="field">
              <span class="label">Bank Name</span>
              <span class="value">${rec.bankName}</span>
            </div>
            <div class="field">
              <span class="label">Account Number</span>
              <span class="value">${rec.accountNumber}</span>
            </div>
            <div class="field">
              <span class="label">Bank Teller Slip / Receipt #</span>
              <span class="value">${rec.bankReceiptNo}</span>
            </div>
            <div class="field">
              <span class="label">Deposit Date</span>
              <span class="value">${rec.date}</span>
            </div>
            <div class="field">
              <span class="label">Deposited By (Officer)</span>
              <span class="value">${rec.depositedBy}</span>
            </div>
            <div class="field">
              <span class="label">Reference Code</span>
              <span class="value">${rec.referenceNo || 'N/A'}</span>
            </div>
          </div>

          <div class="field" style="margin-bottom: 20px;">
            <span class="label">Purpose / Notes</span>
            <span class="value">${rec.purpose} ${rec.notes ? `(${rec.notes})` : ''}</span>
          </div>

          <div class="sig-section">
            <div class="sig-line">Depositor Officer Signature</div>
            <div class="sig-line">Bursar / Accountant Verification</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-950 text-emerald-100 border border-emerald-700 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Summary Stats */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                  Bank Deposits Registry
                </span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {userRole.toUpperCase()} ACCESS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Bank Deposit Entry & Slips
              </h2>
            </div>
          </div>

          <button
            id="btn-open-bank-deposit-modal"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Money Sent to Bank</span>
          </button>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Total Banked Monies
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
              {totalBankedAmount.toFixed(2)} CFA
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Across {deposits.length} recorded bank teller slips
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Active Partner Banks
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-300 font-mono mt-1">
              {uniqueBanks.length || 1} Banks
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
              {uniqueBanks.join(', ') || 'Ecobank, GCB Bank'}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Recent Activity
            </span>
            <div className="text-sm font-black text-amber-300 font-mono mt-1 truncate">
              {deposits[0] ? `${deposits[0].bankReceiptNo} (${deposits[0].amount.toFixed(2)} CFA)` : 'No deposits logged'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {deposits[0] ? `By ${deposits[0].depositedBy}` : 'Awaiting entry'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Table Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Bank Receipt #, Bank Name, Officer, or Purpose..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Filter by Bank */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Banks</option>
              {uniqueBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <button
              onClick={reloadDeposits}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bank Deposits Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Bank Name & Acc No.</th>
                <th className="p-3">Bank Receipt / Teller Slip #</th>
                <th className="p-3 text-right">Amount (CFA)</th>
                <th className="p-3">Deposited By</th>
                <th className="p-3">Purpose</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No bank deposit records found matching your filters. Click "Record Money Sent to Bank" above to enter a slip.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                      {d.date}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{d.bankName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Acc: {d.accountNumber}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        {d.bankReceiptNo}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                      {d.amount.toFixed(2)} CFA
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{d.depositedBy}</div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">{d.depositedByRole}</span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-[180px] truncate">
                      {d.purpose}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Completed
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handlePrintVoucher(d)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer"
                        title="Print Bank Voucher Slip"
                      >
                        <Printer className="w-3 h-3 text-emerald-400" /> Print Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record Money Sent To Bank */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Money Sent to Bank</h3>
                  <p className="text-[11px] text-slate-500">Enter bank teller receipt details for cash/cheques deposited</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bank Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name *</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Ecobank the region">Ecobank the region</option>
                    <option value="GCB Bank">GCB Bank</option>
                    <option value="Stanbic Bank">Stanbic Bank</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Societe Generale">Societe Generale</option>
                    <option value="CalBank">CalBank</option>
                    <option value="Absa Bank">Absa Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="Other">Other Bank</option>
                  </select>
                </div>

                {bankName === 'Other' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Specify Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="e.g. UBA the region"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Account Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Account Number *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1441002981201"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount Deposited */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Sent to Bank (CFA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-emerald-800 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Bank Receipt / Teller Slip No */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Receipt / Teller Slip # *</label>
                  <input
                    type="text"
                    required
                    value={bankReceiptNo}
                    onChange={(e) => setBankReceiptNo(e.target.value)}
                    placeholder="e.g. ECO-TEL-98214"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-extrabold text-blue-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit Date *</label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Daily Fee Collection Banking"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Notes / Teller Name</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cash handed over to branch counter teller..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Save Bank Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDepositManager;
