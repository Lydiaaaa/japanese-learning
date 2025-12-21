
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Saynario Brand Logo
 * 
 * Design: A dialogue bubble combined with a Sakura (Cherry Blossom).
 * Color: Adapts to parent text-color (primary) via currentColor.
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
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
      >
        {/* 1. Speech Bubble Shape - Using currentColor for dynamic theming */}
        <path 
          d="M256 32C132.3 32 32 121.7 32 232c0 58.6 28.3 111.4 74.4 148.6-3.8 17-14.8 39.8-37.4 61.3-4.8 4.6-2.2 12.8 4.4 13.5 64.9 6.8 108.6-22.1 127.3-36.6 17.5 5.5 36.1 8.5 55.3 8.5 123.7 0 224-89.7 224-200S379.7 32 256 32z" 
          fill="currentColor" 
        />

        {/* 2. Sakura (Cherry Blossom) Icon - Always White */}
        <g transform="translate(256, 232) scale(0.9)">
           <circle cx="0" cy="0" r="15" fill="white" opacity="0.9" />
           {[0, 72, 144, 216, 288].map((angle, index) => (
             <path
               key={index}
               transform={`rotate(${angle}) translate(0, -35)`}
               d="M0 0 C-15 -30, -35 -50, -35 -80 C-35 -110, -10 -120, 0 -105 C10 -120, 35 -110, 35 -80 C35 -50, 15 -30, 0 0 Z"
               fill="white"
             />
           ))}
        </g>
      </svg>
    </div>
  );
};
