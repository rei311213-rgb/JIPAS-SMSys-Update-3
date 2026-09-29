import { supabase } from '../lib/supabase';
import { 
  StaffSalaryStructure, 
  PayrollRun, 
  StaffPayslipItem, 
  StaffLoanAdvance, 
  PayrollSettingsConfig,
  Teacher
} from '../types';
import { 
  INITIAL_PAYROLL_SETTINGS, 
  INITIAL_STAFF_SALARY_STRUCTURES, 
  INITIAL_PAYROLL_RUNS, 
  INITIAL_STAFF_LOANS 
} from '../data/mockPayrollData';
import { executeCloudWrite, executeCloudDelete } from './syncService';
import { addMoney, subtractMoney } from '../utils/financeUtils';

const STORAGE_KEY_PAYROLL_RUNS = 'jipas_payroll_runs';
const STORAGE_KEY_SALARY_STRUCTURES = 'jipas_staff_salaries';
const STORAGE_KEY_STAFF_LOANS = 'jipas_staff_loans';
const STORAGE_KEY_PAYROLL_SETTINGS = 'jipas_payroll_settings';

// -------------------------------------------------------------
// Local Storage Cache Helpers
// -------------------------------------------------------------

export function getStoredPayrollSettings(): PayrollSettingsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYROLL_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading payroll settings:', e);
  }
  return INITIAL_PAYROLL_SETTINGS;
}

export function saveStoredPayrollSettings(settings: PayrollSettingsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_PAYROLL_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error writing payroll settings:', e);
  }
}

export function getStoredSalaryStructures(): StaffSalaryStructure[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALARY_STRUCTURES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading salary structures:', e);
  }
  return INITIAL_STAFF_SALARY_STRUCTURES;
}

export function saveStoredSalaryStructures(structures: StaffSalaryStructure[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SALARY_STRUCTURES, JSON.stringify(structures));
  } catch (e) {
    console.warn('Error saving salary structures:', e);
  }
}

export function getStoredPayrollRuns(): PayrollRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYROLL_RUNS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading payroll runs:', e);
  }
  return INITIAL_PAYROLL_RUNS;
}

export function saveStoredPayrollRuns(runs: PayrollRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PAYROLL_RUNS, JSON.stringify(runs));
  } catch (e) {
    console.warn('Error saving payroll runs:', e);
  }
}

export function getStoredStaffLoans(): StaffLoanAdvance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF_LOANS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading staff loans:', e);
  }
  return INITIAL_STAFF_LOANS;
}

export function saveStoredStaffLoans(loans: StaffLoanAdvance[]) {
  try {
    localStorage.setItem(STORAGE_KEY_STAFF_LOANS, JSON.stringify(loans));
  } catch (e) {
    console.warn('Error saving staff loans:', e);
  }
}

// -------------------------------------------------------------
// Payroll Calculation Utilities
// -------------------------------------------------------------

export function calculatePAYETax(taxableIncome: number): number {
  if (taxableIncome <= 400) return 0;
  
  let tax = 0;
  let remaining = taxableIncome;

  remaining -= 400;

  if (remaining > 0) {
    const band = Math.min(remaining, 110);
    tax += band * 0.05;
    remaining -= band;
  }

  if (remaining > 0) {
    const band = Math.min(remaining, 130);
    tax += band * 0.10;
    remaining -= band;
  }

  if (remaining > 0) {
    const band = Math.min(remaining, 3000);
    tax += band * 0.175;
    remaining -= band;
  }

  if (remaining > 0) {
    const band = Math.min(remaining, 16395);
    tax += band * 0.25;
    remaining -= band;
  }

  if (remaining > 0) {
    tax += remaining * 0.30;
  }

  return Math.round(tax * 100) / 100;
}

export function computeStaffPayslip(
  structure: StaffSalaryStructure,
  activeLoan: StaffLoanAdvance | undefined,
  settings: PayrollSettingsConfig,
  payrollRunId: string,
  voucherIndex: number,
  month: string,
  payPeriodStart: string,
  payPeriodEnd: string,
  paymentDate: string
): StaffPayslipItem {
  const allow = structure.allowances;
  const totalAllowances = addMoney(
    allow.responsibility || 0,
    allow.transport || 0,
    allow.housing || 0,
    allow.utilityHardship || 0,
    allow.overtime || 0,
    allow.bonus || 0,
    allow.other || 0
  );

  const grossEarnings = addMoney(structure.basicSalary, totalAllowances);
  
  const pensionEmployee = Math.round((structure.basicSalary * (settings.pensionEmployeeRate / 100)) * 100) / 100;
  const taxableIncome = Math.max(0, subtractMoney(grossEarnings, pensionEmployee));
  const payeTax = calculatePAYETax(taxableIncome);

  const welfareFund = settings.defaultWelfareDeduction || 25;
  const loanRepayment = activeLoan && activeLoan.status === 'Active' ? Math.min(activeLoan.monthlyDeduction, activeLoan.remainingBalance) : 0;
  const absenteeismPenalty = 0;

  const totalDeductions = addMoney(pensionEmployee, payeTax, welfareFund, loanRepayment, absenteeismPenalty);
  const netSalary = subtractMoney(grossEarnings, totalDeductions);

  const voucherNumber = `VOU-${month.replace(' ', '-').toUpperCase()}-${String(voucherIndex + 1).padStart(3, '0')}`;

  return {
    id: `slip-${payrollRunId}-${structure.staffId}`,
    payrollRunId,
    voucherNumber,
    staffId: structure.staffId,
    staffName: structure.staffName,
    staffType: structure.staffType,
    designation: structure.designation,
    department: structure.department,
    bankName: structure.bankName,
    accountNumber: structure.accountNumber,
    accountName: structure.accountName,
    paymentMethod: structure.paymentMethod,
    basicSalary: structure.basicSalary,
    allowances: { ...structure.allowances },
    totalAllowances,
    grossEarnings,
    deductions: {
      pensionEmployee,
      payeTax,
      welfareFund,
      loanRepayment,
      absenteeismPenalty,
      other: 0
    },
    totalDeductions,
    netSalary,
    status: 'Draft',
    payPeriodStart,
    payPeriodEnd,
    paymentDate,
    pensionNumber: structure.pensionNumber,
    tinNumber: structure.tinNumber
  };
}

export function generateBatchPayrollRun(
  month: string,
  academicYear: string,
  term: string,
  staffType: 'All' | 'Teaching' | 'Non-Teaching',
  preparedBy: string,
  structures: StaffSalaryStructure[],
  loans: StaffLoanAdvance[],
  settings: PayrollSettingsConfig
): PayrollRun {
  const runId = `PRUN-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().split('T')[0];

  const filteredStructures = structures.filter(s => {
    if (!s.isActive) return false;
    if (staffType === 'All') return true;
    return s.staffType === staffType;
  });

  const payslips = filteredStructures.map((struct, idx) => {
    const activeLoan = loans.find(l => l.staffId === struct.staffId && l.status === 'Active');
    return computeStaffPayslip(
      struct,
      activeLoan,
      settings,
      runId,
      idx,
      month,
      `${dateStr.slice(0, 8)}01`,
      `${dateStr.slice(0, 8)}28`,
      dateStr
    );
  });

  const totalBasicSalary = addMoney(...payslips.map(p => p.basicSalary || 0));
  const totalAllowances = addMoney(...payslips.map(p => p.totalAllowances || 0));
  const totalGrossEarnings = addMoney(...payslips.map(p => p.grossEarnings || 0));
  const totalPAYETax = addMoney(...payslips.map(p => p.deductions?.payeTax || 0));
  const totalPensionEmployee = addMoney(...payslips.map(p => p.deductions?.pensionEmployee || 0));
  const totalPensionEmployer = Math.round((totalBasicSalary * (settings.pensionEmployerRate / 100)) * 100) / 100;
  const totalWelfare = addMoney(...payslips.map(p => p.deductions?.welfareFund || 0));
  const totalLoanDeductions = addMoney(...payslips.map(p => p.deductions?.loanRepayment || 0));
  const totalDeductions = addMoney(...payslips.map(p => p.totalDeductions || 0));
  const totalNetPay = addMoney(...payslips.map(p => p.netSalary || 0));

  return {
    id: runId,
    month,
    academicYear,
    term,
    staffType,
    status: 'Draft',
    totalStaff: payslips.length,
    totalBasicSalary,
    totalAllowances,
    totalGrossEarnings,
    totalPAYETax,
    totalPensionEmployee,
    totalPensionEmployer,
    totalWelfare,
    totalLoanDeductions,
    totalDeductions,
    totalNetPay,
    preparedBy,
    preparedDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
    payslips
  };
}

export function generateMonthlyPayrollRun(
  month: string,
  academicYear: string,
  term: string,
  preparedBy: string,
  structures: StaffSalaryStructure[],
  loans: StaffLoanAdvance[],
  settings: PayrollSettingsConfig
): PayrollRun {
  return generateBatchPayrollRun(
    month,
    academicYear,
    term,
    'All',
    preparedBy,
    structures,
    loans,
    settings
  );
}

export function subscribePayrollRuns(callback: (runs: PayrollRun[]) => void) {
  callback(getStoredPayrollRuns());
  const channel = supabase
    .channel('public:payrollRuns')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payrollRuns' }, async () => {
      try {
        const { data } = await supabase.from('payrollRuns').select('*');
        if (data) {
          saveStoredPayrollRuns(data as any);
          callback(data as any);
        }
      } catch (e) {
        console.warn('[payrollService] Supabase realtime notice:', e);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function savePayrollRun(run: PayrollRun): Promise<void> {
  await executeCloudWrite(
    'payrollRuns',
    run.id,
    run,
    () => {
      const current = getStoredPayrollRuns();
      const updated = current.some(r => r.id === run.id)
        ? current.map(r => r.id === run.id ? run : r)
        : [run, ...current];
      saveStoredPayrollRuns(updated);
    },
    undefined,
    `Payroll Run: ${run.month} (${run.staffType})`
  );
}

export async function approvePayrollRun(runId: string, approvedBy: string): Promise<void> {
  const current = getStoredPayrollRuns();
  const run = current.find(r => r.id === runId);
  if (!run) throw new Error('Payroll run not found.');

  const approvedRun: PayrollRun = {
    ...run,
    status: 'Approved',
    approvedBy,
    approvedDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
    payslips: run.payslips.map(p => ({ ...p, status: 'Approved' }))
  };

  await savePayrollRun(approvedRun);
}

export async function deletePayrollRun(runId: string): Promise<void> {
  await executeCloudDelete(
    'payrollRuns',
    runId,
    () => {
      const current = getStoredPayrollRuns();
      const updated = current.filter(r => r.id !== runId);
      saveStoredPayrollRuns(updated);
    },
    `Payroll Run #${runId}`
  );
}

export function subscribeSalaryStructures(callback: (structures: StaffSalaryStructure[]) => void) {
  callback(getStoredSalaryStructures());
  const channel = supabase
    .channel('public:staffSalaries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'staffSalaries' }, async () => {
      try {
        const { data } = await supabase.from('staffSalaries').select('*');
        if (data) {
          saveStoredSalaryStructures(data as any);
          callback(data as any);
        }
      } catch (e) {
        console.warn('[payrollService] Supabase realtime notice:', e);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveSalaryStructure(structure: StaffSalaryStructure): Promise<void> {
  await executeCloudWrite(
    'staffSalaries',
    structure.id,
    structure,
    () => {
      const current = getStoredSalaryStructures();
      const updated = current.some(s => s.id === structure.id)
        ? current.map(s => s.id === structure.id ? structure : s)
        : [...current, structure];
      saveStoredSalaryStructures(updated);
    },
    undefined,
    `Salary Structure: ${structure.staffName}`
  );
}

export async function deleteSalaryStructure(id: string): Promise<void> {
  await executeCloudDelete(
    'staffSalaries',
    id,
    () => {
      const current = getStoredSalaryStructures();
      const updated = current.filter(s => s.id !== id);
      saveStoredSalaryStructures(updated);
    },
    `Salary Structure #${id}`
  );
}

export function subscribeStaffLoans(callback: (loans: StaffLoanAdvance[]) => void) {
  callback(getStoredStaffLoans());
  const channel = supabase
    .channel('public:staffLoans')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'staffLoans' }, async () => {
      try {
        const { data } = await supabase.from('staffLoans').select('*');
        if (data) {
          saveStoredStaffLoans(data as any);
          callback(data as any);
        }
      } catch (e) {
        console.warn('[payrollService] Supabase realtime notice:', e);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveStaffLoan(loan: StaffLoanAdvance): Promise<void> {
  await executeCloudWrite(
    'staffLoans',
    loan.id,
    loan,
    () => {
      const current = getStoredStaffLoans();
      const updated = current.some(l => l.id === loan.id)
        ? current.map(l => l.id === loan.id ? loan : l)
        : [...current, loan];
      saveStoredStaffLoans(updated);
    },
    undefined,
    `Staff Loan: ${loan.staffName}`
  );
}

export async function savePayrollSettings(settings: PayrollSettingsConfig): Promise<void> {
  saveStoredPayrollSettings(settings);
  await executeCloudWrite(
    'systemSettings',
    'payrollSettings',
    settings as any,
    () => {},
    undefined,
    'Payroll Settings'
  );
}

export function syncTeachersToSalaryStructures(
  teachers: Teacher[], 
  existingStructures: StaffSalaryStructure[]
): StaffSalaryStructure[] {
  const existingStaffIds = new Set(existingStructures.map(s => s.staffId));
  const newStructures: StaffSalaryStructure[] = [];

  teachers.forEach(t => {
    if (!existingStaffIds.has(t.id)) {
      newStructures.push({
        id: `sal-t-${t.id}`,
        staffId: t.id,
        staffName: t.name,
        staffType: 'Teaching',
        designation: t.designation || 'Teacher',
        department: t.department || 'Academic Faculty',
        bankName: 'GCB Bank PLC',
        accountNumber: '104' + Math.floor(1000000000 + Math.random() * 9000000000),
        accountName: t.name,
        pensionNumber: 'C10' + Math.floor(100000000 + Math.random() * 900000000),
        tinNumber: 'P00' + Math.floor(1000000 + Math.random() * 9000000) + 'X',
        basicSalary: 2500,
        allowances: {
          responsibility: 200,
          transport: 180,
          housing: 200,
          utilityHardship: 80,
          overtime: 100,
          bonus: 50,
          other: 0
        },
        paymentMethod: 'Bank Transfer',
        isActive: true,
        phone: t.phone,
        email: t.email
      });
    }
  });

  if (newStructures.length > 0) {
    const combined = [...existingStructures, ...newStructures];
    saveStoredSalaryStructures(combined);
    return combined;
  }
  return existingStructures;
}
