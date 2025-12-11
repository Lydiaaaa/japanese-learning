
import React, { useState } from 'react';
import { ApiConfig, Language } from '../types';
import { UI_TEXT } from '../constants';
import { Settings, Shield, Globe, Lock, ExternalLink, Key } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSave: (config: ApiConfig) => void;
  onClose: () => void;
  language: Language;
  initialConfig?: ApiConfig | null;
}

export const ApiSetupModal: React.FC<Props> = ({ isOpen, onSave, onClose, language, initialConfig }) => {
  const [mode, setMode] = useState<'community' | 'custom'>(initialConfig?.mode || 'community');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  
  if (!isOpen) return null;
  
  const t = UI_TEXT[language].apiSetup;

  const handleSave = () => {
    if (mode === 'custom' && !apiKey.trim()) {
      alert("Please enter a valid API Key");
      return;
    }
    onSave({ mode, apiKey: apiKey.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Settings className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">{t.title}</h2>
          </div>
          <p className="text-indigo-100 text-sm">{t.description}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Option 1: Community */}
          <div 
            onClick={() => setMode('community')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
              mode === 'community' 
                ? 'border-indigo-600 bg-indigo-50' 
                : 'border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2 rounded-full flex-shrink-0 ${mode === 'community' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold ${mode === 'community' ? 'text-indigo-900' : 'text-slate-700'}`}>
                {t.communityOption}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{t.communityDesc}</p>
            </div>
          </div>

          {/* Option 2: Custom */}
          <div 
            onClick={() => setMode('custom')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
              mode === 'custom' 
                ? 'border-indigo-600 bg-indigo-50' 
                : 'border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2 rounded-full flex-shrink-0 ${mode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${mode === 'custom' ? 'text-indigo-900' : 'text-slate-700'}`}>
                {t.customOption}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{t.customDesc}</p>

              {mode === 'custom' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    {t.inputLabel}
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="AIza..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 mt-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.getKeyLink}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
            <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{t.privacyNote}</span>
          </div>

          <div className="flex gap-3">
            {initialConfig && (
              <button 
                onClick={onClose}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 flex-1"
              >
                {UI_TEXT[language].back}
              </button>
            )}
            <button 
              onClick={handleSave}
              className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex-1 shadow-lg shadow-indigo-200"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};