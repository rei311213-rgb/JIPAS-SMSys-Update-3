import { useState, useEffect } from 'react';
import { Campus, CAMPUSES, getActiveCampus, setActiveCampus } from '../../lib/campusUtils';
import { Building2 } from 'lucide-react';

interface CampusSelectorProps {
  selectedCampus?: Campus;
  onCampusChange?: (campus: Campus) => void;
  theme?: 'dark' | 'light';
}

export default function CampusSelector({ selectedCampus, onCampusChange, theme = 'dark' }: CampusSelectorProps) {
  const [internalCampus, setInternalCampus] = useState<Campus>(() => selectedCampus || getActiveCampus());

  useEffect(() => {
    if (selectedCampus && selectedCampus !== internalCampus) {
      setInternalCampus(selectedCampus);
    }
  }, [selectedCampus]);

  useEffect(() => {
    const handleEvent = () => {
      setInternalCampus(getActiveCampus());
    };
    window.addEventListener('jipas_campus_changed', handleEvent);
    return () => window.removeEventListener('jipas_campus_changed', handleEvent);
  }, []);

  const handleChange = (newCampus: Campus) => {
    setActiveCampus(newCampus);
    localStorage.setItem('jipas_selected_campus', newCampus);
    setInternalCampus(newCampus);
    if (onCampusChange) {
      onCampusChange(newCampus);
    }
  };

  const isLight = theme === 'light';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 transition-colors ${
      isLight 
        ? 'bg-white/90 border-slate-200/80 text-slate-800 shadow-sm' 
        : 'bg-[#0B142A] border-blue-900/50 text-slate-200'
    }`}>
      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-blue-600' : 'text-indigo-400'}`} />
      <select
        value={internalCampus}
        onChange={(e) => handleChange(e.target.value as Campus)}
        className={`bg-transparent text-xs font-bold outline-none cursor-pointer truncate max-w-[120px] ${
          isLight ? 'text-slate-800' : 'text-slate-200'
        }`}
      >
        {CAMPUSES.map((campus) => (
          <option key={campus} value={campus} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0B142A] text-slate-200'}>
            {campus === 'General' ? 'All Campuses' : campus}
          </option>
        ))}
      </select>
    </div>
  );
}
