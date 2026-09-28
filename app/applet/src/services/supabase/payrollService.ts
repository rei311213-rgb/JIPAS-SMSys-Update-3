import { supabase } from '@/src/lib/supabase';
import { PayrollRun, StaffPayslipItem, StaffSalaryStructure, StaffLoanAdvance } from '@/src/types';

export const PayrollSupabaseService = {
  async listPayrollRuns(campusId?: string): Promise<PayrollRun[]> {
    let query = supabase.from('payroll_runs').select('*').order('created_at', { ascending: false });
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase PayrollService] listPayrollRuns notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      month: row.pay_period || 'September 2025',
      academicYear: '2025-2026',
      term: 'Term 1',
      totalStaff: 10,
      totalBasicSalary: row.total_gross ? row.total_gross * 0.7 : 0,
      totalAllowances: row.total_gross ? row.total_gross * 0.3 : 0,
      totalGrossPay: row.total_gross || 0,
      totalGrossEarnings: row.total_gross || 0,
      totalPensionEmployee: 0,
      totalPensionEmployer: 0,
      totalPAYETax: 0,
      totalWelfare: 0,
      totalLoanDeductions: 0,
      totalDeductions: 0,
      totalNetPayout: row.total_net || 0,
      totalNetPay: row.total_net || 0,
      status: (row.status === 'Approved' ? 'Approved' : row.status === 'Draft' ? 'Draft' : 'Disbursed') as PayrollRun['status'],
      batchNumber: row.pay_period
    })) as unknown as PayrollRun[];
  },

  async createPayrollRun(run: PayrollRun): Promise<void> {
    const { error } = await supabase.from('payroll_runs').upsert({
      id: run.id,
      pay_period: run.month || run.batchNumber || 'September 2025',
      period_start: '2025-09-01',
      period_end: '2025-09-30',
      status: run.status,
      total_gross: run.totalGrossPay || run.totalGrossEarnings || 0,
      total_net: run.totalNetPay || run.totalNetPayout || 0,
      prepared_by: 'System',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async updatePayrollRunStatus(id: string, status: string, approverId?: string): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (approverId) {
      updateData.approved_by = approverId;
      updateData.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('payroll_runs').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async listPayslips(payrollRunId: string): Promise<StaffPayslipItem[]> {
    const { data, error } = await supabase.from('staff_payslips').select('*, profiles(full_name, staff_id)').eq('payroll_run_id', payrollRunId);
    if (error) {
      console.warn('[Supabase PayrollService] listPayslips notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      payrollRunId: row.payroll_run_id,
      staffId: row.staff_id,
      staffName: row.profiles?.full_name || 'Staff Member',
      staffType: 'Teaching',
      designation: 'Teacher',
      department: 'Academic',
      payPeriodStart: '2025-09-01',
      payPeriodEnd: '2025-09-30',
      paymentDate: '2025-09-28',
      bankName: 'GCB Bank',
      accountNumber: '1234567890',
      basicSalary: row.basic_salary || 0,
      allowancesTotal: row.allowances || 0,
      grossEarnings: row.gross_salary || 0,
      pensionEmployee: row.ssnit_deduction || 0,
      pensionEmployer: 0,
      payeTax: row.paye || 0,
      welfareDeduction: 0,
      loanRepayment: row.loan_repayment || 0,
      otherDeductions: row.other_deductions || 0,
      totalDeductions: (row.ssnit_deduction || 0) + (row.paye || 0) + (row.loan_repayment || 0) + (row.other_deductions || 0),
      netPayout: row.net_salary || 0
    })) as unknown as StaffPayslipItem[];
  },

  async listSalaryStructures(): Promise<StaffSalaryStructure[]> {
    const { data, error } = await supabase.from('staff_salary_structures').select('*');
    if (error) {
      console.warn('[Supabase PayrollService] listSalaryStructures notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      staffId: row.staff_id,
      staffName: 'Staff Member',
      staffType: 'Teaching',
      designation: 'Teacher',
      department: 'Academic',
      bankName: 'GCB Bank',
      accountNumber: '1234567890',
      accountName: 'Staff',
      pensionNumber: 'SS12345',
      tinNumber: 'TIN12345',
      basicSalary: row.basic_salary || 0,
      allowances: { transport: 100, housing: 200, utility: 50, responsibility: 0, domestic: 0, risk: 0, other: 0 },
      paymentMethod: 'Bank Transfer',
      isActive: true
    })) as unknown as StaffSalaryStructure[];
  },

  async saveSalaryStructure(struct: StaffSalaryStructure): Promise<void> {
    const { error } = await supabase.from('staff_salary_structures').upsert({
      id: struct.id,
      staff_id: struct.staffId,
      basic_salary: struct.basicSalary,
      allowances: struct.allowances || {},
      deductions: {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'staff_id' });
    if (error) throw error;
  },

  async listStaffLoans(): Promise<StaffLoanAdvance[]> {
    const { data, error } = await supabase.from('staff_loans').select('*');
    if (error) {
      console.warn('[Supabase PayrollService] listStaffLoans notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      staffId: row.staff_id,
      staffName: 'Staff Member',
      staffType: 'Teaching',
      loanType: 'Emergency Staff Loan',
      principalAmount: row.principal_amount || 0,
      monthlyDeduction: row.repayment_amount || 0,
      amountRepaid: (row.principal_amount || 0) - (row.outstanding_balance || 0),
      remainingBalance: row.outstanding_balance || 0,
      durationMonths: 12,
      monthsRemaining: 10,
      startDate: row.start_date || '2025-01-01',
      expectedEndDate: '2025-12-31',
      status: row.status || 'Active'
    })) as unknown as StaffLoanAdvance[];
  },

  async saveStaffLoan(loan: StaffLoanAdvance): Promise<void> {
    const { error } = await supabase.from('staff_loans').upsert({
      id: loan.id,
      staff_id: loan.staffId,
      principal_amount: loan.principalAmount,
      outstanding_balance: loan.remainingBalance || loan.principalAmount,
      repayment_amount: loan.monthlyDeduction,
      start_date: loan.startDate,
      status: loan.status,
      notes: loan.loanType,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  }
};
