/**
 * PRINT PROFILE & PRINTER CALIBRATION SERVICE (OPTION 4)
 * Manages institutional printer hardware presets, paper calibration, cutting guides,
 * bilingual stamps, and custom high-density layout configurations.
 */

export interface PrintProfile {
  id: string;
  name: string;
  description: string;
  paperSize: 'A4' | 'A6' | 'LETTER' | 'THERMAL_80MM';
  layoutMode: 'A4_QUADRUPLICATE' | 'A4_BATCH_MULTI' | 'A6_SINGLE_SLIP' | 'COMPACT_MATRIX_VOUCHER';
  marginsMm: number; // 0, 2, 4, 6
  gapMm: number; // 1, 2, 3
  cuttingGuides: 'DASHED_SCISSORS' | 'SOLID_LINE' | 'NONE';
  stampStyle: 'OFFICIAL_BLUE' | 'GOLDEN_CIRCULAR' | 'RED_EMBOSSED' | 'MINIMAL_STAMP';
  bilingualHeader: boolean;
  qrCodeSizePx: number; // 48, 64, 80
  showArrearsSummary: boolean;
  showPaymentMethodBadge: boolean;
  fontScale: 'COMPACT' | 'NORMAL' | 'LARGE';
  customHeaderFr: string;
  customHeaderEn: string;
  isDefault: boolean;
}

const STORAGE_KEY_PROFILES = 'jipas_print_profiles_v1';
const STORAGE_KEY_ACTIVE_PROFILE = 'jipas_active_print_profile_id_v1';

export const DEFAULT_PRINT_PROFILES: PrintProfile[] = [
  {
    id: 'profile-a4-quad',
    name: '4-on-A4 Quadruplicate (Office Standard)',
    description: '4 official copies (Student, Finance, Admin, Audit) on 1 single A4 paper with dashed cutting lines and bilingual seal.',
    paperSize: 'A4',
    layoutMode: 'A4_QUADRUPLICATE',
    marginsMm: 4,
    gapMm: 2,
    cuttingGuides: 'DASHED_SCISSORS',
    stampStyle: 'OFFICIAL_BLUE',
    bilingualHeader: true,
    qrCodeSizePx: 64,
    showArrearsSummary: true,
    showPaymentMethodBadge: true,
    fontScale: 'NORMAL',
    customHeaderFr: 'RÉPUBLIQUE DU CAMEROUN — MINESEC / DÉLÉGATION RÉGIONALE',
    customHeaderEn: 'REPUBLIC OF CAMEROON — MINESEC / REGIONAL DELEGATION',
    isDefault: true
  },
  {
    id: 'profile-a4-batch-multi',
    name: '4-on-A4 Multi-Student Roster (Class Billing)',
    description: '4 separate student fee payment vouchers per A4 sheet arranged in a 2x2 grid for rapid class-wide fee distribution.',
    paperSize: 'A4',
    layoutMode: 'A4_BATCH_MULTI',
    marginsMm: 4,
    gapMm: 2,
    cuttingGuides: 'DASHED_SCISSORS',
    stampStyle: 'OFFICIAL_BLUE',
    bilingualHeader: true,
    qrCodeSizePx: 56,
    showArrearsSummary: true,
    showPaymentMethodBadge: true,
    fontScale: 'NORMAL',
    customHeaderFr: 'RÉPUBLIQUE DU CAMEROUN — BORDEREAU DE PAIEMENT',
    customHeaderEn: 'REPUBLIC OF CAMEROON — FEE PAYMENT VOUCHER',
    isDefault: false
  },
  {
    id: 'profile-a6-single',
    name: 'A6 Single Slip (Thermal & Mini-Printer)',
    description: 'Compact 105mm x 148mm single receipt optimized for desktop slip printers, thermal rolls, and counter collection.',
    paperSize: 'A6',
    layoutMode: 'A6_SINGLE_SLIP',
    marginsMm: 2,
    gapMm: 0,
    cuttingGuides: 'NONE',
    stampStyle: 'GOLDEN_CIRCULAR',
    bilingualHeader: true,
    qrCodeSizePx: 64,
    showArrearsSummary: true,
    showPaymentMethodBadge: true,
    fontScale: 'NORMAL',
    customHeaderFr: 'REÇU OFFICIEL DE SCOLARITÉ',
    customHeaderEn: 'OFFICIAL TUITION FEE RECEIPT',
    isDefault: false
  },
  {
    id: 'profile-compact-matrix',
    name: 'High-Density Dot-Matrix Voucher (Audit Archive)',
    description: 'Ultra-condensed layout with monochrome stamp and optimized micro-typography for ledger archiving and high-volume printing.',
    paperSize: 'A4',
    layoutMode: 'COMPACT_MATRIX_VOUCHER',
    marginsMm: 0,
    gapMm: 1,
    cuttingGuides: 'SOLID_LINE',
    stampStyle: 'MINIMAL_STAMP',
    bilingualHeader: false,
    qrCodeSizePx: 48,
    showArrearsSummary: false,
    showPaymentMethodBadge: false,
    fontScale: 'COMPACT',
    customHeaderFr: 'ARCHIVE COMPTABLE — JOURNAL DES ENCAISSEMENTS',
    customHeaderEn: 'ACCOUNTING ARCHIVE — CASH RECEIPT LEDGER',
    isDefault: false
  }
];

export function listPrintProfiles(): PrintProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load print profiles:', e);
  }
  savePrintProfiles(DEFAULT_PRINT_PROFILES);
  return DEFAULT_PRINT_PROFILES;
}

export function savePrintProfiles(profiles: PrintProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save print profiles:', e);
  }
}

export function getActivePrintProfile(): PrintProfile {
  const profiles = listPrintProfiles();
  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE);
  const found = profiles.find(p => p.id === activeId);
  return found || profiles.find(p => p.isDefault) || profiles[0] || DEFAULT_PRINT_PROFILES[0];
}

export function setActivePrintProfile(profileId: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, profileId);
  window.dispatchEvent(new CustomEvent('jipas_print_profile_changed', { detail: { profileId } }));
}

export function updatePrintProfile(updated: PrintProfile): void {
  const profiles = listPrintProfiles();
  const index = profiles.findIndex(p => p.id === updated.id);
  if (index >= 0) {
    profiles[index] = updated;
  } else {
    profiles.push(updated);
  }
  savePrintProfiles(profiles);
  window.dispatchEvent(new CustomEvent('jipas_print_profile_changed', { detail: { profileId: updated.id } }));
}
