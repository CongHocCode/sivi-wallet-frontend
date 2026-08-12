/**
 * SIVI WALLET - Modern SVG Brand Logo
 */

import React from 'react';

interface SiviLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const SiviLogo: React.FC<SiviLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base' },
    md: { icon: 36, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-4xl' },
  };

  const dims = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* SIVI Wallet Vector Icon */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={dims.icon}
          height={dims.icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm transition-transform duration-300 hover:scale-105"
        >
          {/* Outer Rounded Shield / Wallet Base */}
          <rect
            x="4"
            y="8"
            width="40"
            height="32"
            rx="10"
            className="fill-emerald-500 dark:fill-emerald-600"
          />
          {/* Inner Wallet Fold */}
          <path
            d="M4 18C4 13.5817 7.58172 10 12 10H36C40.4183 10 44 13.5817 44 18V30C44 34.4183 40.4183 38 36 38H12C7.58172 38 4 34.4183 4 30V18Z"
            fill="url(#sivi-wallet-grad)"
          />
          {/* Card Slot Overlay Accent */}
          <rect x="10" y="14" width="28" height="4" rx="2" fill="white" fillOpacity="0.3" />
          {/* AI Sparkle Lock Emblem */}
          <circle cx="34" cy="24" r="5" fill="white" />
          <circle cx="34" cy="24" r="2.5" className="fill-emerald-600" />
          {/* AI Magic Glow Spark Sparkle */}
          <path
            d="M18 22L19.2 24.8L22 26L19.2 27.2L18 30L16.8 27.2L14 26L16.8 24.8L18 22Z"
            fill="#F59E0B"
          />
          <defs>
            <linearGradient
              id="sivi-wallet-grad"
              x1="4"
              y1="10"
              x2="44"
              y2="38"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-wider uppercase ${dims.text} text-slate-900 dark:text-white flex items-center gap-1`}>
            <span>SIVI</span>
            <span className="text-emerald-600 dark:text-emerald-4-00 font-extrabold">WALLET</span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-widest mt-0.5">
            Smart AI Financials
          </span>
        </div>
      )}
    </div>
  );
};
