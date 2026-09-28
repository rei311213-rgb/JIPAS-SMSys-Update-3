import { supabase } from '@/src/lib/supabase';

export const FinanceSupabaseService = {
  async listInvoices(campusId?: string): Promise<any[]> {
    let query = supabase.from('bills').select('*, students(full_name, admission_number)');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase FinanceService] listInvoices notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.students?.full_name || 'Student',
      admissionNo: row.students?.admission_number || '',
      totalAmount: row.total_amount || row.amount || 0,
      amountPaid: row.amount_paid || 0,
      balance: row.balance || 0,
      status: row.status || 'Unpaid',
      dueDate: row.due_date || '2025-12-31'
    }));
  },

  async listPayments(campusId?: string): Promise<any[]> {
    let query = supabase.from('payments').select('*, students(full_name, admission_number)');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase FinanceService] listPayments notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.students?.full_name || 'Student',
      admissionNo: row.students?.admission_number || '',
      amountPaid: row.amount_paid || row.amount || 0,
      paymentMethod: row.payment_method || 'Bank Deposit',
      reference: row.reference || '',
      paymentDate: row.payment_date || row.created_at || '2025-09-01',
      recordedBy: row.recorded_by || 'Cashier'
    }));
  },

  async recordPayment(payment: {
    studentId: string;
    campusId?: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    paymentDate: string;
    recordedBy?: string;
  }): Promise<void> {
    const { error } = await supabase.from('payments').insert({
      student_id: payment.studentId,
      campus_id: payment.campusId || null,
      amount_paid: payment.amount,
      payment_method: payment.paymentMethod,
      reference: payment.reference,
      payment_date: payment.paymentDate,
      recorded_by: payment.recordedBy || null
    });
    if (error) throw error;
  },

  async listFinancialTransactions(campusId?: string): Promise<any[]> {
    let query = supabase.from('financial_transactions').select('*').order('transaction_date', { ascending: false });
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase FinanceService] listFinancialTransactions notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      transactionType: row.transaction_type,
      amount: row.amount || 0,
      reference: row.reference,
      transactionDate: row.transaction_date,
      recordedBy: row.recorded_by
    }));
  }
};
