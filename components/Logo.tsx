import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  // 根据 variant 动态获取 Logo 路径
  // Determine logo path based on variant
  const getLogoSrc = () => {
    switch (variant) {
      case 'jp':
        return '/media/logo-jp.png';
      // 将来扩展其他语言时，只需在这里添加 case，例如：
      // case 'en': return '/media/logo-en.png';
      default:
        // 默认使用日语 Logo
        return '/media/logo-jp.png';
    }
  };

  return (
    <img 
      src={getLogoSrc()} 
      alt={`Saynario Logo (${variant})`} 
      className={`${className} object-contain`}
      onError={(e) => {
        // 如果找不到图片（比如对应的语言 Logo 还没上传），回退显示 emoji
        // Fallback in case image is missing: render a simple text placeholder
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        // 避免重复添加 (Avoid duplicate appending)
        if (parent && !parent.querySelector('.logo-fallback')) {
           const span = document.createElement('span');
           span.innerText = '🌸';
           span.className = 'text-2xl logo-fallback select-none';
           parent.appendChild(span);
        }
      }}
    />
  );
};
