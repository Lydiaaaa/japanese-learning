
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, UI_TEXT, LEARNING_LANGUAGES } from '../constants';
import { ArrowRight, Building, Plane, Utensils, Briefcase, Search, History, RefreshCw, ChevronDown } from 'lucide-react';
import { Language, LearningLanguage } from '../types';

interface HomeProps {
  onScenarioSelect: (scenario: string) => void;
  onViewHistory: () => void;
  language: Language;
  targetLanguage: LearningLanguage;
  onTargetLanguageChange: (id: LearningLanguage) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Utensils,
  Plane,
  Building,
  Briefcase
};

export const Home: React.FC<HomeProps> = ({ 
  onScenarioSelect, 
  onViewHistory, 
  language, 
  targetLanguage,
  onTargetLanguageChange
}) => {
  const [customInput, setCustomInput] = useState('');
  const [visiblePresets, setVisiblePresets] = useState<Record<string, string[]>>({});
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  
  const t = UI_TEXT[language];
  const activeTargetLang = LEARNING_LANGUAGES.find(l => l.id === targetLanguage)!;

  useEffect(() => {
    const defaults: Record<string, string[]> = {};
    CATEGORIES.forEach(cat => {
      defaults[cat.id] = cat.presets[language].slice(0, 4);
    });
    setVisiblePresets(defaults);
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) onScenarioSelect(customInput.trim());
  };

  const handleShuffle = (catId: string) => {
    const category = CATEGORIES.find(c => c.id === catId);
    if (!category) return;
    const allPresets = category.presets[language];
    const currentShown = visiblePresets[catId] || [];
    const availablePool = allPresets.filter(p => !currentShown.includes(p));
    const sourcePool = availablePool.length >= 4 ? availablePool : allPresets;
    const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
    setVisiblePresets(prev => ({ ...prev, [catId]: shuffled.slice(0, 4) }));
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <header className="mb-8 md:mb-12 text-center mt-12 md:mt-20">
          <div className="inline-block mb-6 relative" ref={selectorRef}>
            <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2 text-3xl md:text-5xl font-extrabold text-slate-800 leading-tight">
               <span>{t.titlePrefix}</span>
               <button 
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="inline-flex items-baseline gap-2 px-3 py-1 -mx-2 rounded-2xl hover:bg-indigo-50/80 transition-all text-indigo-600 group relative active:scale-95 whitespace-nowrap"
               >
                 <span className="relative z-10 border-b-4 border-indigo-200 group-hover:border-indigo-500 transition-colors pb-1">
                    {activeTargetLang.name[language]}
                 </span>
                 <ChevronDown className={`w-5 h-5 md:w-7 md:h-7 transition-transform relative top-0.5 md:top-1 ${isSelectorOpen ? 'rotate-180' : ''}`} />
               </button>
               <span>{t.titleSuffix}</span>
            </div>

            {/* Language Selection Popover */}
            {isSelectorOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-b border-slate-50 mb-1">{t.learning}</div>
                {LEARNING_LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      onTargetLanguageChange(lang.id);
                      setIsSelectorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors ${
                      targetLanguage === lang.id ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-lg">{lang.name[language]}</span>
                    </div>
                    {targetLanguage === lang.id && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto px-4 md:px-0 mt-4 font-medium opacity-80">{t.subtitle}</p>
        </header>

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 md:mb-10">
          <label className="block text-sm font-bold text-slate-500 mb-3 px-1 uppercase tracking-wider">
            {t.customLabel}
          </label>
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={t.customPlaceholder}
              className="flex-1 p-3 md:p-5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 text-slate-700 w-full border border-slate-100 text-lg"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-8 py-3 md:py-5 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-100 w-full sm:w-auto active:scale-95"
            >
              {t.start}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="flex justify-between items-center mb-6 px-2">
          <div className="h-px bg-slate-100 flex-1 mr-4"></div>
          <button onClick={onViewHistory} className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white transition-all">
            <History className="w-4 h-4" />
            {t.history}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pb-20">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon] || Search;
            const currentItems = visiblePresets[cat.id] || [];
            return (
              <div key={cat.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:border-indigo-100/50 transition-all duration-300 group">
                <div className="p-5 md:p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="font-extrabold text-slate-800 text-lg">{cat.name[language]}</h2>
                  </div>
                  <button onClick={() => handleShuffle(cat.id)} className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-indigo-500 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t.shuffle}
                  </button>
                </div>
                <div className="p-3 grid grid-cols-1 gap-1">
                  {currentItems.map((preset, idx) => (
                    <button key={idx} onClick={() => onScenarioSelect(preset)} className="w-full text-left px-4 py-4 rounded-xl hover:bg-indigo-50/50 text-slate-500 hover:text-indigo-700 font-medium text-sm transition-all flex items-center justify-between group/item">
                      <span className="truncate mr-2">{preset}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
