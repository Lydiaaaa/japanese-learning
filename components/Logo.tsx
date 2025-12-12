import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'jp' }) => {
  // 初始路径使用相对路径 (Relative path is safer for sub-directory deployments)
  const initialPath = variant === 'jp' ? 'media/logo-jp.png' : 'media/logo-jp.png';
  
  const [imgSrc, setImgSrc] = useState(initialPath);
  const [hasError, setHasError] = useState(false);

  // 当 variant 变化时重置状态
  useEffect(() => {
    setImgSrc(variant === 'jp' ? 'media/logo-jp.png' : 'media/logo-jp.png');
    setHasError(false);
  }, [variant]);

  const handleError = () => {
    // 第一次失败：尝试从根目录加载 (First fail: try loading from root)
    if (imgSrc.startsWith('media/')) {
      setImgSrc('logo-jp.png');
    } else {
      // 第二次失败：显示 Emoji (Second fail: show fallback)
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center bg-pink-50 rounded-lg text-xl select-none`} title="Logo missing">
        🌸
      </div>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={`Saynario Logo (${variant})`} 
      className={`${className} object-contain`}
      onError={handleError}
    />
  );
};
