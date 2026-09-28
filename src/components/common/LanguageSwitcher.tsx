import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'pill' | 'dropdown' | 'compact';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '',
  variant = 'pill'
}) => {
  const { language, setLanguage, toggleLanguage } = useI18n();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        id="language-switcher-compact"
        title={language === 'en' ? 'Switch to French (Français)' : 'Passer en Anglais (English)'}
        aria-label="Toggle language between English and French"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
          language === 'fr'
            ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
        } ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="uppercase tracking-wider font-extrabold">{language}</span>
      </button>
    );
  }

  return (
    <div 
      id="language-switcher-group"
      role="group" 
      aria-label="Language selector" 
      className={`inline-flex items-center bg-[#0B142A] p-0.5 rounded-xl border border-blue-900/50 shadow-inner ${className}`}
    >
      <button
        type="button"
        id="lang-btn-en"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        title="English"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
          language === 'en'
            ? 'bg-[#15254D] text-white shadow-xs font-extrabold border border-blue-700/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        }`}
      >
        <span className="text-sm leading-none" role="img" aria-label="UK flag">🇬🇧</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        id="lang-btn-fr"
        onClick={() => setLanguage('fr')}
        aria-pressed={language === 'fr'}
        title="Français"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
          language === 'fr'
            ? 'bg-[#15254D] text-white shadow-xs font-extrabold border border-blue-700/50'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        }`}
      >
        <span className="text-sm leading-none" role="img" aria-label="France flag">🇫🇷</span>
        <span>FR</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
