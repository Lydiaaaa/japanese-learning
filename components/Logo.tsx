import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  const [error, setError] = useState(false);

  // 尝试使用相对路径，这在大多数环境中更稳健
  // Try relative path which is usually more robust
  const imgSrc = './media/logo-jp.png';

  if (error) {
    // 如果图片加载失败，渲染一个精美的 SVG 图标作为 Logo
    // Professional SVG fallback if image fails
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={`${className} flex-shrink-0`}
        aria-label="Saynario Logo"
      >
        <circle cx="50" cy="50" r="48" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="50" cy="50" r="20" fill="#fb7185" /> {/* 日系粉色圆点 (Soft Red/Pink Center) */}
        <path 
          d="M50 10 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="#fecdd3" 
          strokeWidth="8" 
          strokeLinecap="round" 
          className="opacity-50"
        />
        <path 
          d="M50 90 A 40 40 0 0 1 10 50" 
          fill="none" 
          stroke="#1996de" 
          strokeWidth="8" 
          strokeLinecap="round" 
          className="opacity-20"
        />
      </svg>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt="Saynario Logo" 
      className={`${className} object-contain`}
      onError={(e) => {
        console.warn(`Logo image failed to load at ${imgSrc}. Reverting to SVG fallback.`);
        setError(true);
      }}
    />
  );
};
