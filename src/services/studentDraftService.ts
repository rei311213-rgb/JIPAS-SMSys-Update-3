import { idbGet, idbSet, idbRemove } from './idbService';

export interface StudentFormDraftData {
  fullName: string;
  lastName?: string;
  otherNames?: string;
  gender: 'Male' | 'Female';
  dob: string;
  admissionDate?: string;
  department: string;
  className: string;
  course?: string;
  level?: '1' | '2' | '3';
  house?: string;
  campus?: 'JIPAS 1' | 'JIPAS 2' | string;
  electives?: string[];
  parentName: string;
  parentPhone: string;
  photo?: string;
  savedAt?: string;
}

const STUDENT_DRAFT_IDB_KEY = 'jipas_student_creation_draft_v1';

/**
 * Persists the current student creation form state into IndexedDB (via localforage).
 */
export async function saveStudentDraft(draft: StudentFormDraftData): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const payload: StudentFormDraftData = {
      ...draft,
      savedAt: new Date().toISOString()
    };
    await idbSet(STUDENT_DRAFT_IDB_KEY, payload);
  } catch (err) {
    console.warn('[studentDraftService] Error saving student form draft to IndexedDB:', err);
  }
}

/**
 * Loads the saved student creation form draft from IndexedDB.
 */
export async function loadStudentDraft(): Promise<StudentFormDraftData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const draft = await idbGet<StudentFormDraftData | null>(STUDENT_DRAFT_IDB_KEY, null);
    if (draft && (draft.fullName || draft.parentName || draft.parentPhone || draft.className)) {
      return draft;
    }
  } catch (err) {
    console.warn('[studentDraftService] Error loading student form draft from IndexedDB:', err);
  }
  return null;
}

/**
 * Deletes the saved student creation draft from IndexedDB (e.g. upon successful enrollment submission).
 */
export async function clearStudentDraft(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await idbRemove(STUDENT_DRAFT_IDB_KEY);
    console.log('[studentDraftService] Cleared student creation draft from IndexedDB.');
  } catch (err) {
    console.warn('[studentDraftService] Error clearing student form draft from IndexedDB:', err);
  }
}
