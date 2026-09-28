import { useState } from 'react';
import { PAID_AS_CATEGORIES, QUICK_PAID_AS_SUGGESTIONS, FeeDescriptionCategory } from '../../data/feeDescriptions';
import { Tag, Edit3, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';

interface PaidAsSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  categories?: FeeDescriptionCategory[];
}

export default function PaidAsSelector({
  value,
  onChange,
  label = 'Paid As (Description / Purpose of Payment)',
  required = true,
  className = '',
  categories = PAID_AS_CATEGORIES
}: PaidAsSelectorProps) {
  const [isCustom, setIsCustom] = useState(() => {
    // Check if initial value is in predefined categories
    const allPredefined = (categories || PAID_AS_CATEGORIES).flatMap(c => c.options);
    return Boolean(value) && !allPredefined.includes(value);
  });

  const handleSelectChange = (selectedVal: string) => {
    if (selectedVal === '__CUSTOM__') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(selectedVal);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setIsCustom(false);
    onChange(suggestion);
  };

  const activeCategories = categories && categories.length > 0 ? categories : PAID_AS_CATEGORIES;

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
            if (!isCustom && !value) onChange('');
          }}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
        >
          <Edit3 className="w-2.5 h-2.5" />
          {isCustom ? 'Pick from standard list' : 'Type custom note'}
        </button>
      </div>

      {!isCustom ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => handleSelectChange(e.target.value)}
            required={required}
            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-9 cursor-pointer transition-all shadow-2xs"
          >
            <option value="" disabled>-- Select Payment Description (Paid As) --</option>
            {activeCategories.map(categoryGroup => (
              <optgroup key={categoryGroup.category} label={`📂 ${categoryGroup.category}`}>
                {categoryGroup.options.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="✏️ Other">
              <option value="__CUSTOM__">✍️ Custom Description / Other Reason...</option>
            </optgroup>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <input
            type="text"
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type specific payment description (e.g. 1st Term Tuition + French Books)..."
            className="w-full px-3.5 py-2.5 bg-white border border-indigo-400 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            autoFocus
          />
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Custom description mode active. This narrative will appear on the official student receipt.
          </p>
        </div>
      )}

      {/* Quick Suggestion Chips */}
      <div className="pt-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" /> Quick Select:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PAID_AS_SUGGESTIONS.map(s => {
            const isSelected = value === s && !isCustom;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleQuickSuggestion(s)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
