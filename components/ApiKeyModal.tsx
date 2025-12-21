
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Section - Explicit styling for better contrast */}
        <div className={`relative px-6 py-8 flex items-start gap-5 ${isQuotaExceeded ? 'bg-red-600' : 'bg-indigo-600'}`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-inner flex-shrink-0">
             {isQuotaExceeded ? <ShieldAlert className="w-8 h-8 text-white" /> : <Key className="w-8 h-8 text-white" />}
          </div>
          <div className="text-white">
            <h2 className="text-xl font-bold mb-2 leading-tight">
              {isQuotaExceeded 
                ? (isZh ? '今日免费额度已用完' : 'Quota Exceeded') 
                : (isZh ? 'API 设置' : 'API Configuration')}
            </h2>
            <p className="text-sm opacity-90 leading-relaxed font-medium">
              {isQuotaExceeded
                ? (isZh ? '请使用您自己的 API Key 继续生成。' : 'Please use your own API Key to continue.')
                : (isZh ? '请选择您希望如何使用生成功能。' : 'Choose how you want to generate content.')}
            </p>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-6 bg-white text-slate-900">
          <div className="space-y-4 mb-6">
            {/* Free Option */}
            <button
              type="button"
              onClick={() => setMode('free')}
              disabled={isQuotaExceeded}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative flex items-start gap-3 ${
                mode === 'free' 
                  ? 'border-indigo-600 bg-indigo-50' 
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              } ${isQuotaExceeded ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${mode === 'free' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{isZh ? '使用免费额度' : 'Use Free Quota'}</span>
                  {mode === 'free' && <Check className="w-5 h-5 text-indigo-600 bg-indigo-100 rounded-full p-0.5" />}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {isZh ? '无需配置。每天限制生成 5 次。' : 'Limited to 5 generations per day.'}
                </p>
              </div>
            </button>

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative flex items-start gap-3 ${
                mode === 'custom' 
                  ? 'border-indigo-600 bg-indigo-50' 
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${mode === 'custom' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1 w-full">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                   <span>{isZh ? '使用自定义 Key' : 'Use Custom Key'}</span>
                   {mode === 'custom' && <Check className="w-5 h-5 text-indigo-600 bg-indigo-100 rounded-full p-0.5" />}
                </div>
                <p className="text-sm text-slate-500 mt-1 mb-3">
                  {isZh ? '使用您自己的 Google Gemini API Key。' : 'Use your own Google Gemini API Key.'}
                </p>
                
                {mode === 'custom' && (
                  <div className="animate-in slide-in-from-top-2 duration-200 w-full mt-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full p-3 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-mono text-slate-900"
                      autoFocus
                    />
                    <div className="flex justify-end mt-2">
                        <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-medium"
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
                className="flex-1 px-4 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                {isZh ? '取消' : 'Cancel'}
                </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={mode === 'custom' && apiKey.length < 10}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 ${
                  isQuotaExceeded ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
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
