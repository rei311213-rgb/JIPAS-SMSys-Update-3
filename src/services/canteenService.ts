/**
 * SCHOOL CANTEEN POINT-OF-SALE (POS) & MEAL CARD SERVICE (OPTION 3)
 * Manages student meal card balances, cafeteria menu items, contactless tap-to-pay
 * transactions, and daily canteen revenue reconciliation with central accounting.
 */

import { Student } from '../types';

export interface CanteenMenuItem {
  id: string;
  name: string;
  category: 'MEALS' | 'SNACKS' | 'DRINKS' | 'SPECIALS';
  priceCfa: number;
  availableStock: number;
  imageIcon: string;
}

export interface CanteenTransaction {
  id: string;
  timestamp: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmountCfa: number;
  previousBalanceCfa: number;
  remainingBalanceCfa: number;
  paymentMethod: 'MEAL_CARD' | 'CASH';
  cashierName: string;
}

const STORAGE_KEY_CANTEEN_WALLET = 'jipas_canteen_wallets_v1';
const STORAGE_KEY_CANTEEN_LOGS = 'jipas_canteen_transactions_v1';

export const DEFAULT_CANTEEN_MENU: CanteenMenuItem[] = [
  { id: 'm1', name: 'Riz Sauté au Poulet (Fried Rice & Chicken)', category: 'MEALS', priceCfa: 1000, availableStock: 85, imageIcon: '🍗' },
  { id: 'm2', name: 'Ndolè avec Plantains Mûrs (Traditional Ndole)', category: 'MEALS', priceCfa: 1200, availableStock: 60, imageIcon: '🍲' },
  { id: 'm3', name: 'Spaghetti Bolognaise & Viande Hachée', category: 'MEALS', priceCfa: 800, availableStock: 70, imageIcon: '🍝' },
  { id: 's1', name: 'Beignets Haricots & Bouillie (Classic Combo)', category: 'SNACKS', priceCfa: 300, availableStock: 120, imageIcon: '🥯' },
  { id: 's2', name: 'Sandwich Omelette / Fromage', category: 'SNACKS', priceCfa: 500, availableStock: 50, imageIcon: '🥪' },
  { id: 's3', name: 'Croissant Chaud & Pain au Chocolat', category: 'SNACKS', priceCfa: 400, availableStock: 40, imageIcon: '🥐' },
  { id: 'd1', name: 'Jus Naturel de Bissap (Folléré Frais)', category: 'DRINKS', priceCfa: 250, availableStock: 90, imageIcon: '🧃' },
  { id: 'd2', name: 'Jus d\'Ananas / Gingembre Frais', category: 'DRINKS', priceCfa: 300, availableStock: 80, imageIcon: '🍍' },
  { id: 'd3', name: 'Bouteille d\'Eau Minérale Supermont 50cl', category: 'DRINKS', priceCfa: 200, availableStock: 150, imageIcon: '💧' }
];

export function getStudentMealBalance(studentId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_WALLET);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[studentId] !== undefined) return map[studentId];
    }
  } catch (e) {}
  return 8500; // Default demo starting balance
}

export function topupStudentMealBalance(studentId: string, amount: number): number {
  let map: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_WALLET);
    if (raw) map = JSON.parse(raw);
  } catch (e) {}
  
  const current = map[studentId] || 8500;
  const next = current + amount;
  map[studentId] = next;
  localStorage.setItem(STORAGE_KEY_CANTEEN_WALLET, JSON.stringify(map));
  return next;
}

export function listCanteenTransactions(): CanteenTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function processCanteenPurchase(
  student: Student,
  items: { item: CanteenMenuItem; quantity: number }[],
  paymentMethod: 'MEAL_CARD' | 'CASH' = 'MEAL_CARD',
  cashierName: string = 'Canteen Officer'
): { success: boolean; transaction?: CanteenTransaction; message: string } {
  const total = items.reduce((acc, i) => acc + (i.item.priceCfa * i.quantity), 0);
  const currentBalance = getStudentMealBalance(student.id);

  if (paymentMethod === 'MEAL_CARD' && currentBalance < total) {
    return {
      success: false,
      message: `Insufficient meal card balance! Available: ${currentBalance.toLocaleString()} CFA, Required: ${total.toLocaleString()} CFA.`
    };
  }

  const remaining = paymentMethod === 'MEAL_CARD' ? currentBalance - total : currentBalance;

  // Deduct balance
  if (paymentMethod === 'MEAL_CARD') {
    let map: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_WALLET);
      if (raw) map = JSON.parse(raw);
    } catch (e) {}
    map[student.id] = remaining;
    localStorage.setItem(STORAGE_KEY_CANTEEN_WALLET, JSON.stringify(map));
  }

  const transaction: CanteenTransaction = {
    id: `CT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    studentId: student.id,
    studentName: student.fullName,
    admissionNo: student.admissionNo,
    className: student.className,
    items: items.map(i => ({ name: i.item.name, quantity: i.quantity, price: i.item.priceCfa })),
    totalAmountCfa: total,
    previousBalanceCfa: currentBalance,
    remainingBalanceCfa: remaining,
    paymentMethod,
    cashierName
  };

  const logs = listCanteenTransactions();
  logs.unshift(transaction);
  localStorage.setItem(STORAGE_KEY_CANTEEN_LOGS, JSON.stringify(logs.slice(0, 100)));

  return {
    success: true,
    transaction,
    message: `Payment of ${total.toLocaleString()} CFA successful! Remaining card balance: ${remaining.toLocaleString()} CFA.`
  };
}
