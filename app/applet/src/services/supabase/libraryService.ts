import { supabase } from '@/src/lib/supabase';

export const LibrarySupabaseService = {
  async listBooks(campusId?: string): Promise<any[]> {
    let query = supabase.from('library_books').select('*');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase LibraryService] listBooks notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      isbn: row.isbn || '',
      title: row.title,
      author: row.author,
      category: row.category || 'General',
      totalCopies: row.total_copies || 1,
      availableCopies: row.available_copies || 1,
      shelfLocation: row.shelf_location || 'Shelf A1'
    }));
  },

  async saveBook(book: any): Promise<void> {
    const { error } = await supabase.from('library_books').upsert({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category: book.category,
      total_copies: book.totalCopies,
      available_copies: book.availableCopies,
      shelf_location: book.shelfLocation
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async listLoans(campusId?: string): Promise<any[]> {
    const { data, error } = await supabase.from('library_loans').select('*, library_books(title)');
    if (error) {
      console.warn('[Supabase LibraryService] listLoans notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      bookId: row.book_id,
      bookTitle: row.library_books?.title || 'Book',
      borrowerId: row.borrower_id,
      borrowerType: row.borrower_type || 'student',
      loanDate: row.loan_date,
      dueDate: row.due_date,
      returnDate: row.return_date,
      status: row.status || 'Borrowed',
      fineAmount: row.fine_amount || 0
    }));
  }
};
