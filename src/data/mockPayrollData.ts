import { 
  StaffSalaryStructure, 
  PayrollRun, 
  StaffLoanAdvance, 
  PayrollSettingsConfig 
} from '../types';

export const INITIAL_PAYROLL_SETTINGS: PayrollSettingsConfig = {
  currencySymbol: 'GHS',
  pensionEmployeeRate: 5.5,
  pensionEmployerRate: 13.0,
  tier2EmployeeRate: 5.0,
  defaultWelfareDeduction: 25,
  enableAutoAbsenteeismDeduction: true,
  dailyAbsenteeismRate: 35,
  defaultPayDay: 25,
  schoolSignatoryTitle: 'Bursar / Financial Controller',
  headmasterSignatoryTitle: 'Headmaster / Managing Director',
  payslipHeaderNote: 'JIPAS Academy - Monthly Staff Compensation & Tax Deduction Advice',
  payslipFooterNote: 'This is a computer-generated official payslip certified by JIPAS Bursary & Finance Division. No physical signature required for electronic validation.'
};

export const INITIAL_STAFF_SALARY_STRUCTURES: StaffSalaryStructure[] = [];

export const INITIAL_PAYROLL_RUNS: PayrollRun[] = [];

export const INITIAL_STAFF_LOANS: StaffLoanAdvance[] = [];
