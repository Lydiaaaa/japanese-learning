import React, { useState } from 'react';
import { Key, Zap, Check, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { Language } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (apiKey: string | null) => void; // null means use free quota
  language: Language;
  isQuotaExceeded: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  language,
  isQuotaExceeded
}) => {
  const [mode, setMode] = useState<'free' | 'custom'>(isQuotaExceeded ? 'custom' : 'free');
  const [apiKey, setApiKey] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'free') {
      onConfirm(null);
    } else {
      if (apiKey.trim().length > 0) {
        onConfirm(apiKey.trim());
      }
    }
  };

  const isZh = language === 'zh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-xl shadow-neo-lg w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border-2 border-black">
        
        {/* Header Section */}
        <div className={`relative px-6 py-8 ${isQuotaExceeded ? 'bg-red-500' : 'bg-black'} text-white border-b-2 border-black`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors text-white/70 hover:text-white"
          >
            <X className="w-6 h-6 stroke-[3]" />
          </button>

          <div className="flex items-start gap-5">
            <div className="p-3 rounded-lg bg-white border-2 border-black shadow-neo-sm flex-shrink-0 text-black">
              {isQuotaExceeded ? <ShieldAlert className="w-8 h-8" /> : <Key className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2 leading-tight">
                {isQuotaExceeded 
                  ? (isZh ? '今日免费额度已用完' : 'Daily Free Quota Exceeded') 
                  : (isZh ? 'API 设置' : 'API Configuration')}
              </h2>
              <p className={`text-sm ${isQuotaExceeded ? 'text-red-100' : 'text-slate-300'} leading-relaxed font-medium`}>
                {isQuotaExceeded
                  ? (isZh ? '请使用您自己的 API Key 继续生成。' : 'Please use your own API Key to continue.')
                  : (isZh ? '请选择您希望如何使用生成功能。' : 'Choose how you want to generate content.')}
              </p>
            </div>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-6 bg-white">
          <div className="space-y-4 mb-6">
            {/* Free Option */}
            <button
              type="button"
              onClick={() => setMode('free')}
              disabled={isQuotaExceeded}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all relative flex items-start gap-3 ${
                mode === 'free' 
                  ? 'border-black bg-pastel-green shadow-neo-sm' 
                  : 'border-slate-200 hover:border-black hover:bg-slate-50'
              } ${isQuotaExceeded ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
            >
              <div className={`mt-0.5 p-1.5 rounded-md border-2 border-black ${mode === 'free' ? 'bg-white text-black' : 'bg-slate-100 text-slate-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-black flex items-center justify-between">
                  <span>{isZh ? '使用免费额度' : 'Use Free Quota'}</span>
                  {mode === 'free' && <Check className="w-5 h-5 text-black" />}
                </div>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  {isZh ? '无需配置。每天限制生成 5 次。' : 'No setup required. Limited to 5 generations per day.'}
                </p>
              </div>
            </button>

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all relative flex items-start gap-3 ${
                mode === 'custom' 
                  ? 'border-black bg-pastel-yellow shadow-neo-sm' 
                  : 'border-slate-200 hover:border-black hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-md border-2 border-black ${mode === 'custom' ? 'bg-white text-black' : 'bg-slate-100 text-slate-400'}`}>
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1 w-full">
                <div className="font-bold text-black flex items-center justify-between">
                   <span>{isZh ? '使用自定义 Key' : 'Use Custom Key'}</span>
                   {mode === 'custom' && <Check className="w-5 h-5 text-black" />}
                </div>
                <p className="text-sm text-slate-600 mt-1 mb-3 font-medium">
                  {isZh ? '使用您自己的 Google Gemini API Key。无限制。' : 'Use your own Google Gemini API Key. Unlimited.'}
                </p>
                
                {mode === 'custom' && (
                  <div className="animate-in slide-in-from-top-2 duration-200 w-full mt-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full p-3 text-sm border-2 border-black rounded-lg focus:shadow-neo-sm outline-none bg-white font-mono placeholder:text-slate-400"
                      autoFocus
                    />
                    <div className="flex justify-end mt-2">
                        <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-black hover:text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                        >
                        {isZh ? '获取免费 API Key' : 'Get free API Key'}
                        <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            {!isQuotaExceeded && (
                <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg text-black font-bold hover:bg-slate-100 transition-colors border-2 border-transparent hover:border-black"
                >
                {isZh ? '取消' : 'Cancel'}
                </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={mode === 'custom' && apiKey.length < 10}
              className={`flex-1 px-4 py-3 rounded-lg text-white font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 border-2 border-black ${
                  isQuotaExceeded ? 'bg-red-500 hover:bg-red-600' : 'bg-black hover:bg-slate-800'
              }`}
            >
              {isZh ? '确认' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};