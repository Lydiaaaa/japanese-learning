
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  // Logic reserved for future multi-language support.
  // Currently defaulting all variants to the existing logo-jp.png
  // Future implementation:
  // const src = variant === 'en' ? '/media/logo-en.png' : '/media/logo-jp.png';
  
  const src = '/media/logo-jp.png';

  return (
    <img 
      src={src} 
      alt="Saynario Logo" 
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback in case image is missing
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
           const span = document.createElement('span');
           span.innerText = '🌸';
           span.className = 'text-2xl';
           parent.appendChild(span);
        }
      }}
    />
  );
};
