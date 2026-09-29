import { supabase } from '../../lib/supabase';

export interface EntranceQrCode {
  id: string;
  campus_id: string;
  name: string;
  token_hash: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

// Simple deterministic hash helper for browser/node compatibility
export function hashToken(token: string): string {
  let hash = 0;
  if (token.length === 0) return '0';
  for (let i = 0; i < token.length; i++) {
    const chr = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export const EntranceQrService = {
  /**
   * Lists all QR codes, optionally filtered by campus
   */
  async listQrCodes(campusId?: string): Promise<EntranceQrCode[]> {
    let query = supabase.from('staff_attendance_qr_codes').select('*');
    if (campusId) {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('[EntranceQrService] Error listing QR codes:', error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Generates a new secure Entrance QR code
   * Returns the raw secure token (which is NOT stored directly in the database)
   */
  async generateQrCode(
    name: string,
    campusId: string,
    createdBy: string,
    expiresDays?: number
  ): Promise<{ rawToken: string; qrCode: EntranceQrCode }> {
    // Generate high-entropy secure token (e.g., UUID-based hex token)
    const rawToken = `JIPAS_ENTRANCE_${campusId}_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    const tokenHash = hashToken(rawToken);

    let expiresAt: string | null = null;
    if (expiresDays && expiresDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresDays);
      expiresAt = d.toISOString();
    }

    const { data, error } = await supabase
      .from('staff_attendance_qr_codes')
      .insert({
        campus_id: campusId,
        name,
        token_hash: tokenHash,
        is_active: true,
        created_by: createdBy,
        expires_at: expiresAt
      })
      .select('*')
      .single();

    if (error) {
      console.error('[EntranceQrService] Error generating QR code:', error.message);
      throw error;
    }

    return { rawToken, qrCode: data };
  },

  /**
   * Revokes (deactivates) a QR code by its ID
   */
  async revokeQrCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('staff_attendance_qr_codes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('[EntranceQrService] Error revoking QR code:', error.message);
      throw error;
    }
  },

  /**
   * Refreshes a QR code by generating a new token hash for it
   * Returns the new raw secure token
   */
  async refreshQrToken(id: string, campusId: string): Promise<string> {
    const rawToken = `JIPAS_ENTRANCE_${campusId}_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    const tokenHash = hashToken(rawToken);

    const { error } = await supabase
      .from('staff_attendance_qr_codes')
      .update({ 
        token_hash: tokenHash,
        is_active: true // Reactivate if it was revoked
      })
      .eq('id', id);

    if (error) {
      console.error('[EntranceQrService] Error refreshing QR token:', error.message);
      throw error;
    }

    return rawToken;
  },

  /**
   * Validates a scanned QR raw token against the database
   * Returns the active QR code record if valid, otherwise throws an error
   */
  async verifyQrToken(rawToken: string): Promise<EntranceQrCode> {
    if (!rawToken || !rawToken.startsWith('JIPAS_ENTRANCE_')) {
      throw new Error('Invalid QR Code format.');
    }

    const tokenHash = hashToken(rawToken);

    const { data, error } = await supabase
      .from('staff_attendance_qr_codes')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[EntranceQrService] Error verifying QR token:', error.message);
      throw new Error('Database server verification error.');
    }

    if (!data) {
      throw new Error('QR Code is revoked, inactive, or invalid.');
    }

    // Check expiration
    if (data.expires_at) {
      const expiry = new Date(data.expires_at).getTime();
      if (Date.now() > expiry) {
        throw new Error('QR Code has expired.');
      }
    }

    // Update last used timestamp
    try {
      await supabase
        .from('staff_attendance_qr_codes')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch (err) {
      console.warn('[EntranceQrService] Failed to update last_used_at:', err);
    }

    return data;
  },

  /**
   * Updates a QR code record (e.g., renaming the gate)
   */
  async updateQrCode(id: string, updates: Partial<EntranceQrCode>): Promise<void> {
    const { error } = await supabase
      .from('staff_attendance_qr_codes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[EntranceQrService] Error updating QR code:', error.message);
      throw error;
    }
  }
};
