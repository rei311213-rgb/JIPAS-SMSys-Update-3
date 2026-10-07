import React, { useState, useMemo } from 'react';
import {
  Utensils,
  CreditCard,
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
  Layers,
  Coins,
  DollarSign
} from 'lucide-react';
import { Student } from '../../types';
import {
  DEFAULT_CANTEEN_MENU,
  CanteenMenuItem,
  getStudentMealBalance,
  topupStudentMealBalance,
  processCanteenPurchase,
  listCanteenTransactions,
  CanteenTransaction
} from '../../services/canteenService';

interface Props {
  students: Student[];
  currentUser?: any;
}

export default function CanteenPOSManager({ students, currentUser }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MEALS' | 'SNACKS' | 'DRINKS'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [searchStudent, setSearchStudent] = useState('');
  const [cart, setCart] = useState<{ item: CanteenMenuItem; quantity: number }[]>([]);
  const [lastTx, setLastTx] = useState<CanteenTransaction | null>(null);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [topupAmount, setTopupAmount] = useState<number>(5000);
  const [showTopupModal, setShowTopupModal] = useState(false);

  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const [studentBalance, setStudentBalance] = useState<number>(
    currentStudent ? getStudentMealBalance(currentStudent.id) : 8500
  );

  const filteredMenu = useMemo(() => {
    return DEFAULT_CANTEEN_MENU.filter(m => selectedCategory === 'ALL' || m.category === selectedCategory);
  }, [selectedCategory]);

  const cartTotal = cart.reduce((acc, c) => acc + (c.item.priceCfa * c.quantity), 0);

  const handleSelectStudent = (s: Student) => {
    setSelectedStudentId(s.id);
    setStudentBalance(getStudentMealBalance(s.id));
  };

  const handleAddToCart = (item: CanteenMenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const handleCheckout = (method: 'MEAL_CARD' | 'CASH') => {
    if (!currentStudent || cart.length === 0) return;
    const res = processCanteenPurchase(currentStudent, cart, method, currentUser?.name || 'Canteen Officer');
    if (res.success && res.transaction) {
      setLastTx(res.transaction);
      setStudentBalance(res.transaction.remainingBalanceCfa);
      setCart([]);
      setTxMessage({ type: 'success', text: res.message });
    } else {
      setTxMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setTxMessage(null), 5000);
  };

  const handleTopup = () => {
    if (!currentStudent || topupAmount <= 0) return;
    const next = topupStudentMealBalance(currentStudent.id, topupAmount);
    setStudentBalance(next);
    setShowTopupModal(false);
    setTxMessage({ type: 'success', text: `Loaded ${topupAmount.toLocaleString()} CFA onto ${currentStudent.fullName}'s Meal Card!` });
    setTimeout(() => setTxMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-rose-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold tracking-wide">
              <Utensils className="w-3.5 h-3.5 text-rose-400" />
              <span>OPTION 3 — SCHOOL CANTEEN POS & CASHLESS MEAL WALLET</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Canteen Point-of-Sale & Student Meal Cards
            </h1>
            <p className="text-sm text-rose-200/80 max-w-2xl">
              Cashless cafeteria counter with instant tap-to-pay balance deductions, meal wallet recharges, and real-time inventory tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowTopupModal(true)}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/30"
            >
              <Coins className="w-4 h-4" />
              <span>Recharge Meal Card</span>
            </button>
          </div>
        </div>
      </div>

      {txMessage && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          txMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          {txMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{txMessage.text}</span>
        </div>
      )}

      {/* POS Grid: Menu on Left, Cart & Card Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cafeteria Menu Items */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Tabs */}
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            {(['ALL', 'MEALS', 'SNACKS', 'DRINKS'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'All Items' : cat}
              </button>
            ))}
          </div>

          {/* Menu Items Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMenu.map(m => (
              <div
                key={m.id}
                onClick={() => handleAddToCart(m)}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{m.imageIcon}</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Stock: {m.availableStock}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{m.name}</h4>
                  <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">
                    {m.priceCfa.toLocaleString()} CFA
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Student Meal Wallet & Cashier Cart */}
        <div className="lg:col-span-4 space-y-4">
          {/* Student Meal Card Badge */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-indigo-800/40 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-indigo-800/50 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">STUDENT MEAL CARD</span>
              <span className="text-[10px] font-mono text-indigo-300">{currentStudent?.admissionNo}</span>
            </div>
            <div>
              <h3 className="text-sm font-black truncate">{currentStudent?.fullName}</h3>
              <div className="text-[11px] text-slate-400">{currentStudent?.className}</div>
            </div>
            <div className="pt-2 border-t border-indigo-800/40 flex items-center justify-between">
              <span className="text-xs text-slate-400">Card Balance:</span>
              <span className="text-lg font-black text-emerald-400">{studentBalance.toLocaleString()} CFA</span>
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Order Tray ({cart.length})</h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Tray
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Select menu items to build the meal tray.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(c => (
                  <div key={c.item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                    <div className="truncate flex-1 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{c.item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.quantity} × {c.item.priceCfa} CFA
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {(c.item.priceCfa * c.quantity).toLocaleString()} CFA
                      </span>
                      <button
                        onClick={() => handleRemoveFromCart(c.item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-base">
              <span className="font-black text-slate-900 dark:text-white">Order Total:</span>
              <span className="font-black text-rose-600 dark:text-rose-400">{cartTotal.toLocaleString()} CFA</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleCheckout('MEAL_CARD')}
                disabled={cart.length === 0}
                className="py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <CreditCard className="w-4 h-4" />
                <span>Tap Meal Card</span>
              </button>

              <button
                onClick={() => handleCheckout('CASH')}
                disabled={cart.length === 0}
                className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Recharge Meal Card</h3>
            <p className="text-xs text-slate-500">Add credit to {currentStudent?.fullName}'s cafeteria account.</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (CFA)</label>
              <input
                type="number"
                min="500"
                step="500"
                value={topupAmount}
                onChange={e => setTopupAmount(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTopupModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTopup}
                className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
              >
                Confirm Recharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
