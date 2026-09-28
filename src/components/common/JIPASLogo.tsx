import React, { useState, useEffect } from 'react';

export const JIPAS_LOGO_STORAGE_KEY = 'jipas_custom_logo';
export const JIPAS_LOGO_EVENT = 'jipas_logo_changed';

export function getSchoolLogo(): string {
  try {
    return localStorage.getItem(JIPAS_LOGO_STORAGE_KEY) || '/logo.jpg';
  } catch {
    return '/logo.jpg';
  }
}

export function setSchoolLogo(logoDataUrlOrPath: string): void {
  try {
    localStorage.setItem(JIPAS_LOGO_STORAGE_KEY, logoDataUrlOrPath);
    window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { detail: logoDataUrlOrPath }));
  } catch (err) {
    console.error('Failed to save logo to localStorage', err);
  }
}

export function resetSchoolLogo(): void {
  try {
    localStorage.removeItem(JIPAS_LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { detail: '/logo.jpg' }));
  } catch (err) {
    console.error('Failed to reset logo', err);
  }
}

interface JIPASLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  showMotto?: boolean;
  variant?: 'full' | 'shield-only';
  rounded?: boolean;
  customSrc?: string;
}

export default function JIPASLogo({
  size = 'md',
  className = '',
  showMotto = false,
  variant = 'full',
  rounded = true,
  customSrc
}: JIPASLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>(() => customSrc || getSchoolLogo());

  useEffect(() => {
    if (customSrc) {
      setLogoSrc(customSrc);
      return;
    }

    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLogoSrc(customEvent.detail);
      } else {
        setLogoSrc(getSchoolLogo());
      }
    };

    window.addEventListener(JIPAS_LOGO_EVENT, handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);

    return () => {
      window.removeEventListener(JIPAS_LOGO_EVENT, handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, [customSrc]);

  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
    custom: ''
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${currentSizeClass} ${rounded ? 'rounded-xl' : ''} overflow-hidden bg-white shadow-xs`}>
        <img
          src={logoSrc}
          alt="JIPAS School Crest Logo"
          className="w-full h-full object-contain filter drop-shadow-xs"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes('data:')) return;
            if (!target.src.endsWith('/logo.jpg') && !target.src.endsWith('/logo.png')) {
              target.src = '/logo.jpg';
            }
          }}
        />
      </div>
      {showMotto && (
        <div className="flex flex-col text-left">
          <span className="font-black text-slate-900 tracking-tight leading-none text-base">JIPAS</span>
          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider mt-0.5">Education is Wealth • Est. 1990</span>
        </div>
      )}
    </div>
  );
}
