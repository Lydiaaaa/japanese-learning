import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Saynario Brand Logo (Pop Style)
 * 
 * Design: Black speech bubble with a centered stylized electric sound wave / spark inside.
 * Fixed: Removed complex transforms to ensure perfect alignment.
 */
export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Saynario Logo"
        className="w-full h-full"
      >
        {/* 1. Speech Bubble Shape - Solid Black */}
        <path 
          d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 2.7 466 2.2 466.5c-2.2 2.3-2.8 5.7-1.5 8.7S4.8 480 8 480c66.3 0 116-31.8 140.6-51.4 32.7 12.3 69 19.4 107.4 19.4 141.4 0 256-93.1 256-208S397.4 32 256 32z" 
          fill="#000000" 
        />

        {/* 2. Stylized Sound Wave (Zigzag) - White & Centered */}
        {/* Coordinates calculated to be exactly in the visual center of the bubble mass */}
        <path 
          d="M136 240 L196 200 L236 280 L296 180 L376 240" 
          stroke="white" 
          strokeWidth="40" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};