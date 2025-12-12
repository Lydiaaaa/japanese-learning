import React, { useState } from 'react';
// 显式导入图片，让 Vite 处理路径和打包
// Explicitly import the image asset so Vite handles bundling and hashing
import logoJp from '../media/logo-jp.png';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  const [error, setError] = useState(false);

  // 如果图片加载失败，显示 SVG 备选方案
  // If image fails to load, render SVG fallback
  if (error) {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={`${className} flex-shrink-0`}
        aria-label="Saynario Logo"
      >
        <circle cx="50" cy="50" r="48" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="50" cy="50" r="20" fill="#fb7185" />
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
      src={logoJp} // 使用导入的变量作为 src (Use the imported variable)
      alt="Saynario Logo" 
      className={`${className} object-contain`}
      onError={() => {
        console.warn('Logo failed to load via import. Reverting to SVG.');
        setError(true);
      }}
    />
  );
};
