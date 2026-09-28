import { useState, useEffect, useRef } from 'react';
import {
  saveStudentDraft,
  loadStudentDraft,
  clearStudentDraft,
  StudentFormDraftData
} from '../services/studentDraftService';

interface UseStudentFormDraftParams {
  values: StudentFormDraftData;
  setValues: (draft: StudentFormDraftData) => void;
  enabled?: boolean;
}

export function useStudentFormDraft({
  values,
  setValues,
  enabled = true
}: UseStudentFormDraftParams) {
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  // Load draft on mount
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    loadStudentDraft().then((savedDraft) => {
      if (isMounted && savedDraft && (savedDraft.fullName || savedDraft.parentName || savedDraft.parentPhone)) {
        setValues(savedDraft);
        setIsDraftRestored(true);
        if (savedDraft.savedAt) {
          setLastSavedAt(savedDraft.savedAt);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  // Auto-save draft on values change whenever user types
  useEffect(() => {
    if (!enabled) return;

    // Skip the very first render cycle to avoid overwriting IndexedDB before draft load completes
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasData = Boolean(
      (values.fullName && values.fullName.trim()) ||
      (values.parentName && values.parentName.trim()) ||
      (values.parentPhone && values.parentPhone.trim())
    );

    if (!hasData) return;

    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveStudentDraft(values);
      const now = new Date().toISOString();
      setLastSavedAt(now);
      setIsSaving(false);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [values, enabled]);

  const discardDraft = async (resetFieldsFn?: () => void) => {
    await clearStudentDraft();
    setIsDraftRestored(false);
    setLastSavedAt(null);
    if (resetFieldsFn) resetFieldsFn();
  };

  const onSuccessfulSubmission = async (resetFieldsFn?: () => void) => {
    await clearStudentDraft();
    setIsDraftRestored(false);
    setLastSavedAt(null);
    if (resetFieldsFn) resetFieldsFn();
  };

  return {
    isDraftRestored,
    lastSavedAt,
    isSaving,
    discardDraft,
    onSuccessfulSubmission
  };
}
