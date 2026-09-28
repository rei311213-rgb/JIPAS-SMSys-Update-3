import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition-all active:scale-95 group border border-indigo-400/30"
      >
        <Download className="w-4 h-4 group-hover:bounce" />
        <span>Install JIPAS App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur-sm px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
        >
          <Share className="w-4 h-4 text-indigo-600" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner">
                   <img 
                    src="https://images.unsplash.com/photo-1546410531-bb4caa1b424d?w=100&h=100&fit=crop" 
                    alt="JIPAS Logo" 
                    className="w-14 h-14 rounded-xl shadow-md"
                  />
                </div>
                
                <h3 className="text-xl font-black text-slate-900">Install JIPAS</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Add JIPAS to your home screen for a full-screen, native experience.
                </p>

                <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-4 text-left border border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 shadow-sm">1</div>
                    <p className="text-xs text-slate-700 pt-1.5">
                      Tap the <span className="font-black text-indigo-600 inline-flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded-md">Share <Share className="w-3 h-3" /></span> button in the Safari toolbar.
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 shadow-sm">2</div>
                    <p className="text-xs text-slate-700 pt-1.5">
                      Scroll down and tap <span className="font-black text-indigo-600">Add to Home Screen</span>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
