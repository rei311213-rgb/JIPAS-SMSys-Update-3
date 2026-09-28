import React from 'react';
import { Save, Trash2, CheckCircle, Clock } from 'lucide-react';

interface DraftStatusBannerProps {
  isDraftRestored: boolean;
  lastSavedAt: string | null;
  isSaving?: boolean;
  onDiscardDraft: () => void;
}

export default function DraftStatusBanner({
  isDraftRestored,
  lastSavedAt,
  isSaving = false,
  onDiscardDraft
}: DraftStatusBannerProps) {
  const formattedTime = lastSavedAt 
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
    : null;

  return (
    <div className="space-y-2 mb-4">
      {/* Restored Draft Alert Banner */}
      {isDraftRestored && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-black text-xs text-amber-950">
                Unsaved Student Creation Draft Restored
              </span>
              <span className="block text-[11px] text-amber-800 font-medium">
                Auto-saved in local IndexedDB {formattedTime ? `at ${formattedTime}` : ''}. Progress preserved across session navigation.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onDiscardDraft}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Discard saved draft and reset form"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Discard Draft</span>
          </button>
        </div>
      )}

      {/* Auto-saving Status Indicator */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <Save className={`w-3.5 h-3.5 ${isSaving ? 'text-indigo-600 animate-spin' : 'text-emerald-600'}`} />
          <span className="font-bold text-slate-700">
            {isSaving ? 'Saving draft to IndexedDB...' : 'IndexedDB Local Draft Auto-Save:'}
          </span>
          <span className="text-slate-500 font-medium">
            {isSaving ? 'Typing detected...' : formattedTime ? `Last saved at ${formattedTime}` : 'Active on edit'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Offline Preserved</span>
        </div>
      </div>
    </div>
  );
}
