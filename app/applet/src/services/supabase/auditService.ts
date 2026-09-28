import { supabase } from '@/src/lib/supabase';

export const AuditSupabaseService = {
  async createAuditLog(log: {
    action: string;
    module: string;
    entityType?: string;
    entityId?: string;
    description?: string;
    metadata?: any;
    campusId?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      campus_id: log.campusId || null,
      action: log.action,
      module: log.module,
      entity_type: log.entityType || null,
      entity_id: log.entityId || null,
      description: log.description || '',
      metadata: log.metadata || {}
    });
    if (error) {
      console.warn('[Supabase AuditService] createAuditLog error:', error.message);
    }
  },

  async getAuditLogs(campusId?: string, limit = 50): Promise<any[]> {
    let query = supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(limit);
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase AuditService] getAuditLogs notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.profiles?.full_name || 'System User',
      action: row.action,
      module: row.module,
      entityType: row.entity_type,
      entityId: row.entity_id,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at
    }));
  }
};
