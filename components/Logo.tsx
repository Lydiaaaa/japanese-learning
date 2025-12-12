import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'jp' | 'en' | 'general';
}

/**
 * Saynario Brand Logo
 * 
 * 智能 Logo 组件逻辑：
 * 1. 优先尝试加载 "/logo.png" (需要用户将图片放入 public 文件夹)。
 * 2. 如果加载失败 (文件不存在)，自动降级显示内置的 SVG 矢量 Logo。
 * 
 * Future usage for other images:
 * 同样的方法，将图片放入 public 文件夹，然后直接使用 <img src="/filename.jpg" /> 即可。
 */
export const SaynarioLogo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  // 状态：标记是否应该显示图片文件
  const [imageError, setImageError] = useState(false);

  // 1. 尝试渲染图片文件
  if (!imageError) {
    return (
      <img 
        src="/logo-jp.png" 
        alt="Saynario Logo" 
        className={`${className} object-contain`}
        onError={() => setImageError(true)} // 如果加载失败（404），切换到 SVG 模式
      />
    );
  }

  // 2. 如果图片不存在，显示默认的 SVG 品牌标识 (Fallback)
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Saynario Logo"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1996de" />
          </linearGradient>
        </defs>

        <path 
          d="M448 224C448 328.6 364.6 416.4 256 416.4C236.6 416.4 217.9 413.6 200.2 408.4L108.6 444.6C99.8 448.1 90.2 441.4 90.6 431.9L92.7 348.4C57.4 316.3 32 272.7 32 224C32 117.9 132.3 32 256 32C379.7 32 448 117.9 448 224Z" 
          fill="url(#brandGradient)" 
        />

        <path 
          d="M256 128C256 128 296 168 296 216C296 248 276 272 256 288C236 272 216 248 216 216C216 168 256 128 256 128Z" 
          fill="white" 
        />
        
        <circle cx="256" cy="336" r="16" fill="#fecdd3" />
      </svg>
    </div>
  );
};
