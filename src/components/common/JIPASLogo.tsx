import React, { useState, useEffect } from 'react';

export const JIPAS_LOGO_STORAGE_KEY = 'jipas_custom_logo';
export const JIPAS_LAPTOP_LOGO_KEY = 'jipas_laptop_logo';
export const JIPAS_MOBILE_LOGO_KEY = 'jipas_mobile_logo';
export const JIPAS_THIS_DEVICE_LOGO_KEY = 'jipas_device_custom_logo';
export const JIPAS_CREST_MODE_KEY = 'jipas_crest_mode';
export const JIPAS_LOGO_EVENT = 'jipas_logo_changed';

/**
 * Checks if the current client is a mobile device or phone
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
  const isSmallScreen = typeof window.innerWidth !== 'undefined' && window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
}

/**
 * Returns the appropriate official school crest based on device type or explicit target
 */
export function getSchoolLogo(targetDevice: 'auto' | 'mobile' | 'desktop' = 'auto'): string {
  if (typeof window === 'undefined') return '/logo.jpg';
  try {
    // 1. Check for specific "this physical device" override
    const thisDeviceLogo = localStorage.getItem(JIPAS_THIS_DEVICE_LOGO_KEY);
    if (thisDeviceLogo && thisDeviceLogo.trim()) {
      return thisDeviceLogo;
    }

    const isMobile = targetDevice === 'mobile' || (targetDevice === 'auto' && isMobileDevice());
    
    // Read stored settings fallback for cross-device sync
    let storedSettings: any = null;
    try {
      const raw = localStorage.getItem('jipas_general_settings');
      if (raw) storedSettings = JSON.parse(raw);
    } catch {}

    if (isMobile) {
      // Return mobile/phone specific crest if configured
      const mobileLogo = localStorage.getItem(JIPAS_MOBILE_LOGO_KEY) || storedSettings?.mobileLogo;
      if (mobileLogo && mobileLogo.trim()) return mobileLogo;
    } else {
      // Return laptop/desktop specific crest if configured
      const laptopLogo = localStorage.getItem(JIPAS_LAPTOP_LOGO_KEY) || storedSettings?.laptopLogo;
      if (laptopLogo && laptopLogo.trim()) return laptopLogo;
    }

    // Fallback to general custom logo or standard crest
    const generalLogo = localStorage.getItem(JIPAS_LOGO_STORAGE_KEY) || storedSettings?.schoolLogo;
    if (generalLogo && generalLogo.trim()) return generalLogo;

    return '/logo.jpg';
  } catch {
    return '/logo.jpg';
  }
}

export function getLaptopLogo(): string {
  try {
    let storedSettings: any = null;
    try {
      const raw = localStorage.getItem('jipas_general_settings');
      if (raw) storedSettings = JSON.parse(raw);
    } catch {}
    return localStorage.getItem(JIPAS_LAPTOP_LOGO_KEY) || storedSettings?.laptopLogo || localStorage.getItem(JIPAS_LOGO_STORAGE_KEY) || storedSettings?.schoolLogo || '/logo.jpg';
  } catch {
    return '/logo.jpg';
  }
}

export function getMobileLogo(): string {
  try {
    let storedSettings: any = null;
    try {
      const raw = localStorage.getItem('jipas_general_settings');
      if (raw) storedSettings = JSON.parse(raw);
    } catch {}
    return localStorage.getItem(JIPAS_MOBILE_LOGO_KEY) || storedSettings?.mobileLogo || localStorage.getItem(JIPAS_LOGO_STORAGE_KEY) || storedSettings?.schoolLogo || '/logo.jpg';
  } catch {
    return '/logo.jpg';
  }
}

export function getThisDeviceLogo(): string {
  try {
    return localStorage.getItem(JIPAS_THIS_DEVICE_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

export function setSchoolLogo(
  logoDataUrlOrPath: string, 
  targetDevice: 'global' | 'laptop' | 'mobile' | 'this_device' = 'global'
): void {
  try {
    let settingsUpdate: Record<string, string> = {};

    if (targetDevice === 'laptop') {
      localStorage.setItem(JIPAS_LAPTOP_LOGO_KEY, logoDataUrlOrPath);
      settingsUpdate = { laptopLogo: logoDataUrlOrPath };
    } else if (targetDevice === 'mobile') {
      localStorage.setItem(JIPAS_MOBILE_LOGO_KEY, logoDataUrlOrPath);
      settingsUpdate = { mobileLogo: logoDataUrlOrPath };
    } else if (targetDevice === 'this_device') {
      localStorage.setItem(JIPAS_THIS_DEVICE_LOGO_KEY, logoDataUrlOrPath);
    } else {
      localStorage.setItem(JIPAS_LOGO_STORAGE_KEY, logoDataUrlOrPath);
      settingsUpdate = { schoolLogo: logoDataUrlOrPath };
    }

    if (Object.keys(settingsUpdate).length > 0) {
      try {
        const raw = localStorage.getItem('jipas_general_settings');
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem('jipas_general_settings', JSON.stringify({ ...parsed, ...settingsUpdate }));
      } catch {}
    }

    window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { 
      detail: { logo: logoDataUrlOrPath, target: targetDevice } 
    }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  } catch (err) {
    console.error('Failed to save logo to localStorage', err);
  }
}

export function setLaptopLogo(logoDataUrlOrPath: string): void {
  setSchoolLogo(logoDataUrlOrPath, 'laptop');
}

export function setMobileLogo(logoDataUrlOrPath: string): void {
  setSchoolLogo(logoDataUrlOrPath, 'mobile');
}

export function setThisDeviceLogo(logoDataUrlOrPath: string): void {
  setSchoolLogo(logoDataUrlOrPath, 'this_device');
}

export function resetSchoolLogo(targetDevice: 'all' | 'laptop' | 'mobile' | 'this_device' | 'global' = 'all'): void {
  try {
    let settingsUpdate: Record<string, string> = {};
    if (targetDevice === 'all') {
      localStorage.removeItem(JIPAS_LOGO_STORAGE_KEY);
      localStorage.removeItem(JIPAS_LAPTOP_LOGO_KEY);
      localStorage.removeItem(JIPAS_MOBILE_LOGO_KEY);
      localStorage.removeItem(JIPAS_THIS_DEVICE_LOGO_KEY);
      settingsUpdate = { laptopLogo: '/logo.jpg', mobileLogo: '/logo.jpg', schoolLogo: '/logo.jpg' };
    } else if (targetDevice === 'laptop') {
      localStorage.removeItem(JIPAS_LAPTOP_LOGO_KEY);
      settingsUpdate = { laptopLogo: '/logo.jpg' };
    } else if (targetDevice === 'mobile') {
      localStorage.removeItem(JIPAS_MOBILE_LOGO_KEY);
      settingsUpdate = { mobileLogo: '/logo.jpg' };
    } else if (targetDevice === 'this_device') {
      localStorage.removeItem(JIPAS_THIS_DEVICE_LOGO_KEY);
    } else if (targetDevice === 'global') {
      localStorage.removeItem(JIPAS_LOGO_STORAGE_KEY);
      settingsUpdate = { schoolLogo: '/logo.jpg' };
    }

    if (Object.keys(settingsUpdate).length > 0) {
      try {
        const raw = localStorage.getItem('jipas_general_settings');
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem('jipas_general_settings', JSON.stringify({ ...parsed, ...settingsUpdate }));
      } catch {}
    }

    window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { detail: { logo: '/logo.jpg', target: targetDevice } }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
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
  forceDevice?: 'auto' | 'mobile' | 'desktop';
}

export default function JIPASLogo({
  size = 'md',
  className = '',
  showMotto = false,
  variant = 'full',
  rounded = true,
  customSrc,
  forceDevice = 'auto'
}: JIPASLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>(() => customSrc || getSchoolLogo(forceDevice));

  useEffect(() => {
    if (customSrc) {
      setLogoSrc(customSrc);
      return;
    }

    const handleLogoUpdate = () => {
      setLogoSrc(getSchoolLogo(forceDevice));
    };

    window.addEventListener(JIPAS_LOGO_EVENT, handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);
    window.addEventListener('resize', handleLogoUpdate);

    return () => {
      window.removeEventListener(JIPAS_LOGO_EVENT, handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
      window.removeEventListener('resize', handleLogoUpdate);
    };
  }, [customSrc, forceDevice]);

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
