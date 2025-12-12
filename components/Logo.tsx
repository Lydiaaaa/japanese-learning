import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

// Using a pure SVG component instead of an image file to ensure
// it loads correctly in all environments (Preview, Production, Local)
// without 404 errors due to path resolution issues.
export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  return (
    <div className={`${className} flex-shrink-0 relative`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        aria-label="Saynario Logo"
      >
        {/* Main Background Circle - White */}
        <circle cx="50" cy="50" r="48" fill="#fff" stroke="#e0f2fe" strokeWidth="2" />
        
        {/* Central Element - Cherry Blossom Theme */}
        <circle cx="50" cy="50" r="22" fill="#fb7185" />
        
        {/* Decorative Arcs mimicking the Japanese Flag/Sun motif mixed with bubbles */}
        <path 
          d="M50 12 A 38 38 0 0 1 88 50" 
          fill="none" 
          stroke="#fda4af" 
          strokeWidth="6" 
          strokeLinecap="round" 
          className="opacity-60"
        />
        <path 
          d="M50 88 A 38 38 0 0 1 12 50" 
          fill="none" 
          stroke="#1996de" 
          strokeWidth="6" 
          strokeLinecap="round" 
          className="opacity-40"
        />
        
        {/* Inner detail */}
        <circle cx="65" cy="35" r="4" fill="#fff" fillOpacity="0.6" />
      </svg>
    </div>
  );
};
