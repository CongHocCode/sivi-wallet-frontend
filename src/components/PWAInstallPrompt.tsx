/**
 * SIVI WALLET - PWA Install Prompt Banner
 * Provides a mobile-native banner guiding users to install the app onto home screen.
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Check } from 'lucide-react';
import { SiviLogoIcon } from './SiviLogo';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for PWA install prompt (Android / Chrome / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show banner after brief delay
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Mobile PWA Install Banner */}
      <div className="fixed top-3 left-3 right-3 z-50 md:hidden animate-in slide-in-from-top duration-300">
        <div className="bg-[#2D2926] text-white p-3.5 rounded-2xl shadow-xl border border-[#4A443F] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SiviLogoIcon size={38} className="shadow-xs" />
            <div>
              <h4 className="text-xs font-extrabold text-white">Cài đặt Sivi Wallet</h4>
              <p className="text-[10px] text-stone-300">Dùng mượt như App Native, mở 1-chạm & offline</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Cài Đặt
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 text-stone-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-w-sm w-full space-y-4 border border-[#EAE7DC] animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-[#EAE7DC] pb-3">
              <h3 className="text-sm font-bold text-[#2D2926]">Cài ứng dụng trên iOS (iPhone/iPad)</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-[#8C857D] hover:text-[#2D2926]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#4A443F]">
              <div className="flex items-center gap-3 p-2.5 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC]">
                <span className="w-6 h-6 rounded-full bg-[#7D8F69] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <p>
                  Nhấp vào biểu tượng <Share className="w-4 h-4 inline text-blue-600 mx-1" /> <strong>Chia sẻ</strong> ở thanh công cụ trình duyệt Safari.
                </p>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC]">
                <span className="w-6 h-6 rounded-full bg-[#7D8F69] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <p>
                  Cuộn xuống và chọn <PlusSquare className="w-4 h-4 inline text-gray-700 mx-1" /> <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC]">
                <span className="w-6 h-6 rounded-full bg-[#7D8F69] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <p>
                  Nhấn <strong>Thêm</strong> ở góc trên bên phải để hoàn tất.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 bg-[#7D8F69] text-white text-xs font-bold rounded-xl"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
