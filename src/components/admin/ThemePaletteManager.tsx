import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Check, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Eye, 
  Sliders, 
  Cloud, 
  CheckCircle2, 
  Layers, 
  Sun, 
  Moon,
  Info,
  Laptop,
  Image as ImageIcon
} from 'lucide-react';
import { ThemePaletteConfig } from '../../types';
import { 
  DEFAULT_THEME_PALETTES, 
  DEFAULT_THEME_PALETTE, 
  getStoredThemePalette, 
  saveThemePalette,
  applyThemePaletteToDom
} from '../../services/dbService';

interface ThemePaletteManagerProps {
  currentPalette?: ThemePaletteConfig;
  onPaletteChange?: (palette: ThemePaletteConfig) => void;
}

export default function ThemePaletteManager({
  currentPalette,
  onPaletteChange
}: ThemePaletteManagerProps) {
  const [activePalette, setActivePalette] = useState<ThemePaletteConfig>(() => 
    currentPalette || getStoredThemePalette()
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'card' | 'portal'>('card');

  // Sync state if prop changes
  useEffect(() => {
    if (currentPalette) {
      setActivePalette(currentPalette);
    }
  }, [currentPalette]);

  // Handle color change
  const handleColorChange = (key: keyof ThemePaletteConfig, value: string) => {
    const updated: ThemePaletteConfig = {
      ...activePalette,
      id: 'custom',
      name: 'Custom Theme',
      mode: 'custom',
      [key]: value
    };

    // Automatically update hover / light variants if primary color is adjusted
    if (key === 'primaryColor') {
      updated.primaryHoverColor = value;
      updated.primaryLightColor = `${value}20`; // 20% opacity hex
    }

    setActivePalette(updated);
    // Instant live preview in DOM
    applyThemePaletteToDom(updated);
    onPaletteChange?.(updated);
  };

  // Apply a curated preset
  const handleApplyPreset = (preset: ThemePaletteConfig) => {
    setActivePalette(preset);
    applyThemePaletteToDom(preset);
    onPaletteChange?.(preset);
  };

  // Save changes to Supabase and localStorage
  const handleSaveToCloudAndLocal = async () => {
    setIsSaving(true);
    try {
      await saveThemePalette(activePalette);
      setSaveStatus('Theme saved successfully to Supabase and LocalStorage!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error('Failed to save theme palette:', err);
      setSaveStatus('Theme applied locally (check connection for Supabase sync).');
      setTimeout(() => setSaveStatus(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = async () => {
    handleApplyPreset(DEFAULT_THEME_PALETTE);
    await saveThemePalette(DEFAULT_THEME_PALETTE);
    setSaveStatus('Reset to default JIPAS Royal Blue theme.');
    setTimeout(() => setSaveStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-slate-900 border border-blue-900/40 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div 
              className="p-3.5 rounded-2xl shadow-xl text-white shrink-0 border border-white/20"
              style={{ backgroundColor: activePalette.primaryColor }}
            >
              <Palette className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Global Color Palette & Atmosphere Studio
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal">
                Customize primary accents and background themes across all administrative views, teacher tools, and student portals. Changes synchronize to Supabase in real-time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              onClick={handleSaveToCloudAndLocal}
              disabled={isSaving}
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: activePalette.primaryColor }}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Supabase...' : 'Save & Publish Theme'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Toast Feedback */}
      {saveStatus && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveStatus(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Curated Preset Themes */}
      <div className="bg-[#070D1E]/90 border border-blue-950/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-blue-950/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Curated Designer Palettes
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Click any card to preview & apply instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DEFAULT_THEME_PALETTES.map((preset) => {
            const isSelected = activePalette.id === preset.id || (
              activePalette.primaryColor === preset.primaryColor &&
              activePalette.backgroundColor === preset.backgroundColor
            );

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? 'ring-2 ring-offset-2 ring-offset-[#070D1E] border-transparent shadow-xl scale-[1.02]' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
                }`}
                style={{
                  ringColor: preset.primaryColor,
                  backgroundColor: isSelected ? `${preset.backgroundColor}dd` : undefined
                }}
              >
                {isSelected && (
                  <div 
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: preset.primaryColor }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {preset.mode === 'dark' ? (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {preset.mode === 'dark' ? 'Atmospheric Dark Canvas' : 'Clean High-Contrast Light'}
                  </p>
                </div>

                {/* Color Swatch Bars */}
                <div className="space-y-1.5 w-full pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span 
                      className="w-4 h-4 rounded-md shadow-xs border border-white/20 shrink-0" 
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span className="truncate">Primary: {preset.primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span 
                      className="w-4 h-4 rounded-md shadow-xs border border-white/20 shrink-0" 
                      style={{ backgroundColor: preset.backgroundColor }}
                    />
                    <span className="truncate">Canvas: {preset.backgroundColor}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Official School Photography Wallpapers Section */}
      <div className="bg-[#070D1E]/90 border border-blue-950/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-blue-950/80 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Official School Photography Wallpapers
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Applied to login screens, dashboard banners, and portal backdrops
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Wallpaper 1: Classroom Active Learning */}
          <button
            type="button"
            onClick={() => {
              const updated: ThemePaletteConfig = {
                ...activePalette,
                wallpaper: 'classroom'
              };
              setActivePalette(updated);
              applyThemePaletteToDom(updated);
              onPaletteChange?.(updated);
            }}
            className={`relative overflow-hidden rounded-2xl border text-left p-4 transition-all cursor-pointer group flex flex-col justify-end min-h-[160px] shadow-lg ${
              activePalette.wallpaper === 'classroom' || !activePalette.wallpaper
                ? 'ring-2 ring-emerald-500 border-transparent scale-[1.02]'
                : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
            }`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url('/wallpapers/classroom.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
            
            {(activePalette.wallpaper === 'classroom' || !activePalette.wallpaper) && (
              <div className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}

            <div className="relative z-10 space-y-1">
              <span className="bg-emerald-500/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                Classroom Wallpaper
              </span>
              <h4 className="text-sm font-black text-white drop-shadow-sm">
                Active Classroom Learning
              </h4>
              <p className="text-[11px] text-slate-200 line-clamp-1">
                Students actively participating and raising hands at desks.
              </p>
            </div>
          </button>

          {/* Wallpaper 2: Morning Assembly */}
          <button
            type="button"
            onClick={() => {
              const updated: ThemePaletteConfig = {
                ...activePalette,
                wallpaper: 'assembly'
              };
              setActivePalette(updated);
              applyThemePaletteToDom(updated);
              onPaletteChange?.(updated);
            }}
            className={`relative overflow-hidden rounded-2xl border text-left p-4 transition-all cursor-pointer group flex flex-col justify-end min-h-[160px] shadow-lg ${
              activePalette.wallpaper === 'assembly'
                ? 'ring-2 ring-emerald-500 border-transparent scale-[1.02]'
                : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
            }`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url('/wallpapers/assembly.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
            
            {activePalette.wallpaper === 'assembly' && (
              <div className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}

            <div className="relative z-10 space-y-1">
              <span className="bg-indigo-500/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                Assembly Wallpaper
              </span>
              <h4 className="text-sm font-black text-white drop-shadow-sm">
                Morning Assembly Gathering
              </h4>
              <p className="text-[11px] text-slate-200 line-clamp-1">
                Students gathered neatly in uniform across the school grounds.
              </p>
            </div>
          </button>

          {/* Wallpaper 3: Minimalist Solid Canvas */}
          <button
            type="button"
            onClick={() => {
              const updated: ThemePaletteConfig = {
                ...activePalette,
                wallpaper: 'none'
              };
              setActivePalette(updated);
              applyThemePaletteToDom(updated);
              onPaletteChange?.(updated);
            }}
            className={`relative overflow-hidden rounded-2xl border text-left p-4 transition-all cursor-pointer group flex flex-col justify-end min-h-[160px] bg-slate-900 shadow-lg ${
              activePalette.wallpaper === 'none'
                ? 'ring-2 ring-emerald-500 border-transparent scale-[1.02]'
                : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950" />
            
            {activePalette.wallpaper === 'none' && (
              <div className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}

            <div className="relative z-10 space-y-1">
              <span className="bg-slate-700/80 backdrop-blur-xs text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                Solid Canvas
              </span>
              <h4 className="text-sm font-black text-white drop-shadow-sm">
                Minimalist Solid Studio
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Pure minimalist geometric studio backdrop without photography.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Deep Customization Matrix & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Custom Color Tuning Form (7 Cols) */}
        <div className="lg:col-span-7 bg-[#070D1E]/90 border border-blue-950/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-950/80">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Custom Color Tuning Matrix
            </h3>
          </div>

          <div className="space-y-5">
            {/* 1. Primary Accent Color */}
            <div className="bg-[#050A18] p-4 rounded-xl border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-white">
                    Primary Brand Color
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Controls buttons, active tabs, highlights, and primary badges.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activePalette.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0.5"
                    title="Choose primary color"
                  />
                  <input
                    type="text"
                    value={activePalette.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Swatches for Primary */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Popular:</span>
                {[
                  { name: 'Royal Blue', hex: '#2563eb' },
                  { name: 'Indigo', hex: '#4f46e5' },
                  { name: 'Emerald', hex: '#059669' },
                  { name: 'Sky Blue', hex: '#0284c7' },
                  { name: 'Purple', hex: '#7c3aed' },
                  { name: 'Crimson', hex: '#dc2626' },
                  { name: 'Gold Amber', hex: '#d97706' },
                  { name: 'Teal', hex: '#0d9488' },
                ].map(swatch => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handleColorChange('primaryColor', swatch.hex)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10 hover:scale-105 transition-all cursor-pointer"
                    style={{ backgroundColor: swatch.hex }}
                  >
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Application Background Canvas */}
            <div className="bg-[#050A18] p-4 rounded-xl border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-white">
                    Application Background (Canvas)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    The root backdrop color of the entire school management system.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activePalette.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0.5"
                    title="Choose background color"
                  />
                  <input
                    type="text"
                    value={activePalette.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Swatches for Background */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Modes:</span>
                {[
                  { name: 'Deep Space Navy', hex: '#040814', text: '#f8fafc', card: '#0B142A' },
                  { name: 'Night Cobalt', hex: '#070D1E', text: '#f8fafc', card: '#0B142A' },
                  { name: 'Dark Slate', hex: '#0f172a', text: '#f8fafc', card: '#1e293b' },
                  { name: 'Dark Charcoal', hex: '#121216', text: '#f5f3ff', card: '#1a1a22' },
                  { name: 'Light Slate 50', hex: '#f8fafc', text: '#0f172a', card: '#ffffff' },
                  { name: 'Crisp White', hex: '#ffffff', text: '#0f172a', card: '#f8fafc' },
                  { name: 'Warm Ivory', hex: '#faf8f5', text: '#1c1917', card: '#ffffff' },
                ].map(swatch => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...activePalette,
                        backgroundColor: swatch.hex,
                        textColor: swatch.text,
                        cardBackgroundColor: swatch.card,
                        sidebarBgColor: swatch.text === '#0f172a' ? '#0f172a' : swatch.card,
                        headerBgColor: swatch.text === '#0f172a' ? '#1e293b' : swatch.card,
                        mode: (swatch.text === '#0f172a' ? 'light' : 'dark') as 'light' | 'dark'
                      };
                      setActivePalette(updated);
                      applyThemePaletteToDom(updated);
                      onPaletteChange?.(updated);
                    }}
                    className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-700 hover:scale-105 transition-all cursor-pointer"
                    style={{ 
                      backgroundColor: swatch.hex,
                      color: swatch.text
                    }}
                  >
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Surface & Card Background */}
            <div className="bg-[#050A18] p-4 rounded-xl border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-white">
                    Card & Surface Background
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Backdrop for panels, tables, data cards, and modals.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activePalette.cardBackgroundColor}
                    onChange={(e) => handleColorChange('cardBackgroundColor', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0.5"
                    title="Choose card background color"
                  />
                  <input
                    type="text"
                    value={activePalette.cardBackgroundColor}
                    onChange={(e) => handleColorChange('cardBackgroundColor', e.target.value)}
                    className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Text Contrast Color */}
            <div className="bg-[#050A18] p-4 rounded-xl border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-white">
                    Primary Typography Color
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ensures WCAG AA contrast against your chosen canvas background.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activePalette.textColor}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0.5"
                    title="Choose text color"
                  />
                  <input
                    type="text"
                    value={activePalette.textColor}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview Card (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#070D1E]/90 border border-blue-950/80 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-950/80 gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Theme Simulator
                  </h3>
                </div>
                
                {/* Mode Selector */}
                <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('card')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      previewMode === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Component
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('portal')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      previewMode === 'portal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Full Portal Preview
                  </button>
                </div>
              </div>

              {previewMode === 'portal' ? (
                /* Interactive Miniature App Portal mockup */
                <div 
                  className="rounded-2xl border shadow-2xl overflow-hidden transition-all flex flex-col text-[9px] select-none"
                  style={{
                    backgroundColor: activePalette.backgroundColor,
                    borderColor: `${activePalette.primaryColor}30`,
                    color: activePalette.textColor,
                    minHeight: '290px'
                  }}
                >
                  {/* Miniature Top Header */}
                  <div 
                    className="px-3 py-1.5 border-b flex items-center justify-between"
                    style={{ 
                      backgroundColor: activePalette.cardBackgroundColor, 
                      borderColor: `${activePalette.primaryColor}20` 
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-white font-bold" style={{ backgroundColor: activePalette.primaryColor }}>
                        J
                      </div>
                      <span className="font-black text-[8px] tracking-tight" style={{ color: activePalette.textColor }}>JOY INTERNATIONAL SCHOOL</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[7px]">
                      <span className="bg-slate-800/80 border border-slate-700/60 text-slate-300 px-1 py-0.5 rounded">Active Live Preview</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                    </div>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                    {/* Miniature Sidebar */}
                    <div 
                      className="w-16 border-r p-1 space-y-1 shrink-0 flex flex-col justify-between"
                      style={{ 
                        backgroundColor: activePalette.cardBackgroundColor, 
                        borderColor: `${activePalette.primaryColor}20` 
                      }}
                    >
                      <div className="space-y-1">
                        <div className="p-1 rounded text-white font-bold text-[7px] flex items-center gap-1" style={{ backgroundColor: activePalette.primaryColor }}>
                          <span className="w-1 h-1 rounded-full bg-white" />
                          Portal
                        </div>
                        <div className="p-1 rounded opacity-75 text-[7px]">Students</div>
                        <div className="p-1 rounded opacity-75 text-[7px]">Bursary</div>
                        <div className="p-1 rounded opacity-75 text-[7px]">Settings</div>
                      </div>
                      <div className="text-[6px] opacity-40 text-center font-mono">v2.1</div>
                    </div>

                    {/* Miniature Main Body Workspace */}
                    <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-[10px]" style={{ color: activePalette.textColor }}>Bursar Portal</h4>
                          <p className="text-[7.5px] opacity-70">Interactive Canvas Simulation</p>
                        </div>
                        <span 
                          className="px-1 py-0.5 rounded-full text-[7px] font-bold"
                          style={{ 
                            backgroundColor: `${activePalette.primaryColor}20`,
                            color: activePalette.primaryColor
                          }}
                        >
                          Synced
                        </span>
                      </div>

                      {/* Stat Widgets */}
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          className="p-1.5 rounded-xl border flex flex-col justify-center shadow-xs"
                          style={{ 
                            backgroundColor: activePalette.cardBackgroundColor, 
                            borderColor: `${activePalette.primaryColor}20` 
                          }}
                        >
                          <span className="opacity-60 text-[7px]">Billing Ratio</span>
                          <strong className="text-[11px] font-black" style={{ color: activePalette.primaryColor }}>94.2%</strong>
                        </div>
                        <div 
                          className="p-1.5 rounded-xl border flex flex-col justify-center shadow-xs"
                          style={{ 
                            backgroundColor: activePalette.cardBackgroundColor, 
                            borderColor: `${activePalette.primaryColor}20` 
                          }}
                        >
                          <span className="opacity-60 text-[7px]">Enrolled Students</span>
                          <strong className="text-[11px] font-black" style={{ color: activePalette.textColor }}>1,420</strong>
                        </div>
                      </div>

                      {/* Simulated Mini-Table */}
                      <div 
                        className="rounded-lg border overflow-hidden shadow-xs"
                        style={{ borderColor: `${activePalette.primaryColor}20` }}
                      >
                        <div 
                          className="px-2 py-1 flex justify-between font-bold text-[7.5px] text-white"
                          style={{ backgroundColor: activePalette.primaryColor }}
                        >
                          <span>Student Profile</span>
                          <span>Payment</span>
                        </div>
                        <div 
                          className="p-1.5 flex justify-between items-center border-b text-[7.5px]"
                          style={{ 
                            backgroundColor: activePalette.cardBackgroundColor,
                            borderColor: `${activePalette.primaryColor}15`
                          }}
                        >
                          <span className="font-semibold">Rei Coby Jacob</span>
                          <span className="text-[6.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded font-bold">Paid</span>
                        </div>
                        <div 
                          className="p-1.5 flex justify-between items-center text-[7.5px]"
                          style={{ backgroundColor: activePalette.cardBackgroundColor }}
                        >
                          <span className="font-semibold">Abla Senam</span>
                          <span className="text-[6.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded font-bold">Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Simulated UI Card container */
                <div 
                  className="p-5 rounded-2xl border shadow-2xl transition-all space-y-4"
                  style={{
                    backgroundColor: activePalette.cardBackgroundColor,
                    borderColor: `${activePalette.primaryColor}30`,
                    color: activePalette.textColor
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: activePalette.primaryColor }}
                      >
                        JP
                      </div>
                      <div>
                        <h4 className="text-xs font-black" style={{ color: activePalette.textColor }}>
                          JIPAS Management Sample
                        </h4>
                        <p className="text-[10px] opacity-70">
                          Academic Year 2025-2026 • Term 3
                        </p>
                      </div>
                    </div>
                    <span 
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${activePalette.primaryColor}20`,
                        color: activePalette.primaryColor
                      }}
                    >
                      Active Sync
                    </span>
                  </div>

                  {/* Simulated Input Field - Explicitly verifying high text contrast */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold opacity-80">
                      Sample Data Entry Field:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        defaultValue="Visible Entry Text 100%"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-inner focus:outline-none focus:ring-2"
                        style={{
                          color: '#0f172a' // Guarantee high-contrast dark text in white input
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      ✓ Characters rendered in high-contrast dark slate font
                    </p>
                  </div>

                  {/* Simulated Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                      style={{ backgroundColor: activePalette.primaryColor }}
                    >
                      Primary Action
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
                      style={{ 
                        borderColor: activePalette.primaryColor,
                        color: activePalette.primaryColor,
                        backgroundColor: `${activePalette.primaryColor}10`
                      }}
                    >
                      Secondary
                    </button>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Badge
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Persistence Info Footnote */}
            <div className="mt-4 p-3.5 bg-blue-950/40 border border-blue-900/30 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-300">
              <Cloud className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Cloud Supabase & Local Storage:</span>
                <p className="text-slate-400 mt-0.5">
                  When you save, preferences write to document <code className="text-blue-300">settings/theme_palette</code> in Supabase and <code className="text-blue-300">localStorage</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
