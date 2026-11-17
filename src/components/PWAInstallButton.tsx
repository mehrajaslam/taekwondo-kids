import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-full bg-yellow-300 px-3 py-2 text-xs sm:text-sm font-black text-slate-900 border-2 border-slate-900 shadow-sm hover:bg-yellow-200 transition whitespace-nowrap shrink-0 min-h-[44px]"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-full bg-yellow-300 px-3 py-2 text-xs sm:text-sm font-black text-slate-900 border-2 border-slate-900 hover:bg-yellow-200 transition whitespace-nowrap shrink-0 min-h-[44px]"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-label="Install on iOS">
            <div className="card w-full max-w-sm p-6 text-center">
              <div className="text-4xl mb-2">📲</div>
              <h3 className="text-xl font-black">Install for Offline Training</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="big-btn mt-4 w-full"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
