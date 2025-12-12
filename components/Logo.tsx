
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general'; // Future proofing for other languages
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Brand Blue Circle Background - Optional, acts as icon container */}
      {/* <circle cx="50" cy="50" r="50" fill="#1996de" /> */}
      
      {/* The "S" Shape (Saynario) */}
      <path 
        d="M72.5 32.5C70.5 24.5 62.5 18 50 18C35 18 24 26 24 39C24 51 32 55 46 60C58 64 64 67 64 74C64 81 57 85 48 85C36 85 28 78 26 70" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Variant: Japanese (Sakura) */}
      {variant === 'jp' && (
        <g transform="translate(18, 15) scale(0.35)">
          <path 
            d="M50 20C50 20 60 5 75 15C90 25 80 40 50 50C20 40 10 25 25 15C40 5 50 20 50 20Z" 
            fill="#FFB7C5" 
            stroke="white" 
            strokeWidth="3"
          />
          <path 
            d="M50 50C50 50 65 55 70 75C75 95 55 90 50 65C45 90 25 95 30 75C35 55 50 50 50 50Z" 
            fill="#FFB7C5" 
             stroke="white" 
            strokeWidth="3"
          />
        </g>
      )}

      {/* Future Variant: English (Example placeholder) */}
      {variant === 'en' && (
        <circle cx="75" cy="25" r="10" fill="#EF4444" />
      )}
    </svg>
  );
};
