/**
 * SIVI WALLET - Official Vector Brand Logo Component
 * Combines Financial Wallet icon with AI Sparkle (✦)
 * Designed with Sage Green (#7D8F69), Terracotta (#D98B72), and Amber Gold (#F59E0B)
 */

import React, { useId } from 'react';

export interface SiviLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  taglineText?: string;
  variant?: 'default' | 'light' | 'dark';
}

export const SiviLogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const bgGradId = `sivi-bg-${uniqueId}`;
  const sparkGradId = `sivi-spark-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7D8F69" />
          <stop offset="100%" stopColor="#5A6D47" />
        </linearGradient>
        <linearGradient id={sparkGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Main Squircle Container */}
      <rect width="64" height="64" rx="16" fill={`url(#${bgGradId})`} />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeOpacity="0.25"
        fill="none"
      />

      {/* Wallet Body */}
      <rect
        x="13"
        y="19"
        width="38"
        height="28"
        rx="6"
        fill="#2D2926"
        stroke="#F9F8F3"
        strokeWidth="1.5"
      />

      {/* Wallet Top Card / Cash Insertion Line (Terracotta #D98B72) */}
      <path
        d="M19 19H45C46.1 19 47 19.9 47 21V23C47 21.9 46.1 21 45 21H19C17.9 21 17 21.9 17 23V21C17 19.9 17.9 19 19 19Z"
        fill="#D98B72"
      />

      {/* Wallet Flap Clasp Accent */}
      <rect
        x="41"
        y="28"
        width="11"
        height="10"
        rx="3"
        fill="#3D3732"
        stroke="#F9F8F3"
        strokeWidth="1"
      />
      <circle cx="46.5" cy="33" r="2.2" fill="#F9F8F3" />
      <circle cx="46.5" cy="33" r="1.1" fill="#D98B72" />

      {/* Primary 4-Point AI Sparkle Star (✦) */}
      <path
        d="M26 23 C26 28 21 32 16 32 C21 32 26 36 26 41 C26 36 31 32 36 32 C31 32 26 28 26 23 Z"
        fill={`url(#${sparkGradId})`}
      />

      {/* Mini AI Sparkle Star Top Right */}
      <path
        d="M48 9 C48 11.5 45.8 13.5 43.5 13.5 C45.8 13.5 48 15.5 48 18 C48 15.5 50.2 13.5 52.5 13.5 C50.2 13.5 48 11.5 48 9 Z"
        fill="#FEF08A"
      />
    </svg>
  );
};

export const SiviLogo: React.FC<SiviLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  showTagline = false,
  taglineText = 'Quản lý chi tiêu & Sổ nợ',
  variant = 'default',
}) => {
  const sizeMap = {
    xs: { icon: 24, title: 'text-xs', tag: 'text-[8px]' },
    sm: { icon: 32, title: 'text-sm sm:text-base', tag: 'text-[9px]' },
    md: { icon: 40, title: 'text-base sm:text-lg', tag: 'text-[10px]' },
    lg: { icon: 48, title: 'text-xl sm:text-2xl', tag: 'text-xs' },
    xl: { icon: 56, title: 'text-2xl sm:text-3xl', tag: 'text-xs' },
  };

  const dims = sizeMap[size] || sizeMap.md;

  const titleColor =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
      ? 'text-slate-100'
      : 'text-[#2D2926]';

  const accentColor =
    variant === 'light'
      ? 'text-emerald-200'
      : 'text-[#7D8F69]';

  const tagColor =
    variant === 'light'
      ? 'text-emerald-100/80'
      : variant === 'dark'
      ? 'text-stone-400'
      : 'text-[#8C857D]';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SIVI Wallet Vector Icon */}
      <SiviLogoIcon size={dims.icon} />

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight flex items-center gap-1 ${dims.title} ${titleColor}`}>
            <span>SIVI</span>
            <span className={`${accentColor} font-black`}>WALLET</span>
          </div>

          {showTagline && taglineText && (
            <span
              className={`font-semibold tracking-normal ${dims.tag} ${tagColor} mt-1`}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SiviLogo;
