/**
 * Authoritative financial utility for JIPAS Students Hub.
 * Handles currency formatting, precision arithmetic, and authoritative formulas.
 */

export const CURRENCY = {
  code: 'CFA',
  symbol: 'CFA',
  name: 'CFA Franc',
  decimalPlaces: 0
};

/**
 * Formats a numeric value as CFA Franc (CFA)
 */
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: CURRENCY.decimalPlaces,
    maximumFractionDigits: CURRENCY.decimalPlaces
  })} CFA`;
};

/**
 * Robust precision addition to avoid floating point errors
 */
export const addMoney = (...amounts: number[]): number => {
  const factor = Math.pow(10, CURRENCY.decimalPlaces);
  const total = amounts.reduce((sum, val) => sum + Math.round((val || 0) * factor), 0);
  return total / factor;
};

/**
 * Robust precision subtraction
 */
export const subtractMoney = (a: number, b: number): number => {
  const factor = Math.pow(10, CURRENCY.decimalPlaces);
  return (Math.round((a || 0) * factor) - Math.round((b || 0) * factor)) / factor;
};

/**
 * Authoritative Bill Balance Formula:
 * Balance = (Total Billed + Arrears) - (Paid + Discount)
 */
export const calculateBillBalance = (
  payable: number,
  paid: number,
  discount: number = 0,
  arrears: number = 0
): number => {
  const totalDue = addMoney(payable, arrears);
  const totalApplied = addMoney(paid, discount);
  return Math.max(0, subtractMoney(totalDue, totalApplied));
};

/**
 * Determines payment status based on balance
 */
export const getPaymentStatus = (balance: number, paid: number): 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Overpaid' => {
  if (balance <= 0 && paid > 0) return 'Fully Paid';
  if (paid > 0 && balance > 0) return 'Partially Paid';
  if (paid === 0) return 'Unpaid';
  return 'Unpaid';
};
