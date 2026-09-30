/**
 * Authoritative financial utility for JIPAS Students Hub.
 * Handles currency formatting, precision arithmetic, and authoritative formulas.
 * Global Financial Currency: West African CFA franc (XOF)
 */

export const CURRENCY = {
  code: 'XOF',
  symbol: 'CFA',
  displayName: 'West African CFA franc',
  locale: 'fr-FR',
  decimalPlaces: 0,
  currencyCode: 'XOF',
  currencySymbol: 'CFA',
  currencyDisplayName: 'West African CFA franc',
  currencyLocale: 'fr-FR',
  currencyDecimals: 0
};

export const CURRENCY_CODE = 'XOF';
export const CURRENCY_SYMBOL = 'CFA';
export const CURRENCY_DISPLAY_NAME = 'West African CFA franc';
export const CURRENCY_LOCALE = 'fr-FR';
export const CURRENCY_DECIMALS = 0;

/**
 * Formats a numeric or string value as CFA Franc (CFA) with zero decimals.
 * Displays formatted number followed by "CFA" (e.g. "150,000 CFA").
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const valid = isNaN(numeric) ? 0 : numeric;
  const numStr = Math.round(valid).toLocaleString('en-US');
  return `${numStr} ${CURRENCY.symbol}`;
};

/**
 * Compact currency formatting (e.g. 150K CFA, 1.5M CFA)
 */
export const formatCurrencyCompact = (amount: number | string | null | undefined): string => {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const valid = isNaN(numeric) ? 0 : numeric;
  if (Math.abs(valid) >= 1_000_000) {
    return `${(valid / 1_000_000).toFixed(1)}M ${CURRENCY.symbol}`;
  }
  if (Math.abs(valid) >= 100_000) {
    return `${Math.round(valid / 1_000)}K ${CURRENCY.symbol}`;
  }
  return formatCurrency(valid);
};

/**
 * Parses numeric currency value from string or number, stripping non-numeric chars
 */
export const parseCurrency = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats money specifically for A4 print media, receipts, and invoices
 */
export const formatMoneyForPrint = (amount: number | string | null | undefined): string => {
  return formatCurrency(amount);
};

/**
 * Formats money for CSV/JSON exports or report downloads
 */
export const formatMoneyForExport = (amount: number | string | null | undefined): string => {
  return formatCurrency(amount);
};

/**
 * Robust precision addition to avoid floating point errors
 */
export const addMoney = (...amounts: (number | string | null | undefined)[]): number => {
  const factor = Math.pow(10, CURRENCY.decimalPlaces);
  const total = amounts.reduce<number>((sum, val) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
    const valid = isNaN(num) ? 0 : num;
    return sum + Math.round(valid * factor);
  }, 0);
  return total / factor;
};

/**
 * Robust precision subtraction
 */
export const subtractMoney = (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  const factor = Math.pow(10, CURRENCY.decimalPlaces);
  const numA = typeof a === 'number' ? a : parseFloat(String(a || 0));
  const numB = typeof b === 'number' ? b : parseFloat(String(b || 0));
  const validA = isNaN(numA) ? 0 : numA;
  const validB = isNaN(numB) ? 0 : numB;
  return (Math.round(validA * factor) - Math.round(validB * factor)) / factor;
};

/**
 * Authoritative Bill Balance Formula:
 * Balance = (Total Billed + Arrears) - (Paid + Discount)
 */
export const calculateBillBalance = (
  payable: number | string | null | undefined,
  paid: number | string | null | undefined,
  discount: number | string | null | undefined = 0,
  arrears: number | string | null | undefined = 0
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
