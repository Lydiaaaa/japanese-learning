
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, UI_TEXT, TARGET_LANGUAGES } from '../constants';
import { ArrowRight, Building, Plane, Utensils, Briefcase, Search, History, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { Language, TargetLanguage } from '../types';

interface HomeProps {
  onScenarioSelect: (scenario: string) => void;
  onViewHistory: () => void;
  language: Language;
  targetLanguage: TargetLanguage;
  onTargetLanguageChange: (lang: TargetLanguage) => void;
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
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  
  const t = UI_TEXT[language];

  // Initialize or Reset presets when language changes.
  useEffect(() => {
    const defaults: Record<string, string[]> = {};
    CATEGORIES.forEach(cat => {
      defaults[cat.id] = cat.presets[language].slice(0, 4);
    });
    setVisiblePresets(defaults);
  }, [language]);

  // Click outside to close language menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onScenarioSelect(customInput.trim());
    }
  };

  const handleShuffle = (catId: string) => {
    const category = CATEGORIES.find(c => c.id === catId);
    if (!category) return;

    const allPresets = category.presets[language];
    const currentShown = visiblePresets[catId] || [];
    
    // Algorithm: Try to pick items that are NOT currently shown to ensure variety
    // Filter out items that are currently visible
    const availablePool = allPresets.filter(p => !currentShown.includes(p));
    
    // If pool is too small (shouldn't happen with 12 items), fallback to full list
    const sourcePool = availablePool.length >= 4 ? availablePool : allPresets;
    
    // Shuffle the source pool
    const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
    
    // Take the top 4
    const newSelection = shuffled.slice(0, 4);
    
    setVisiblePresets(prev => ({
      ...prev,
      [catId]: newSelection
    }));
  };

  const currentLangObj = TARGET_LANGUAGES.find(l => l.code === targetLanguage) || TARGET_LANGUAGES[0];

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* HEADER SECTION - REFACTORED TO "MAD LIBS" STYLE */}
        <header className="mb-6 md:mb-8 text-center mt-12 md:mt-24 mb-10">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5 leading-tight">
             <span className="whitespace-nowrap">{t.homeTitlePrefix}</span>
             
             {/* Styled Dropdown Trigger */}
             <div className="relative inline-block" ref={langMenuRef}>
               <button
                 onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                 className="flex items-center gap-2 border-b-4 border-slate-900 pb-1 md:pb-2 hover:text-indigo-600 hover:border-indigo-600 transition-all cursor-pointer group"
               >
                 <span>{currentLangObj.name}</span>
                 <ChevronDown className="w-8 h-8 md:w-10 md:h-10 stroke-[3] text-slate-400 group-hover:text-indigo-600 transition-colors" />
               </button>

               {isLangMenuOpen && (
                 <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 max-h-80 overflow-y-auto text-base text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    {TARGET_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onTargetLanguageChange(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{lang.flag}</span>
                          <span className={`font-medium text-base ${targetLanguage === lang.code ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
                            {lang.name}
                          </span>
                        </div>
                        {targetLanguage === lang.code && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                      </button>
                    ))}
                 </div>
               )}
             </div>
          </h1>

          <p className="text-slate-400 text-sm md:text-lg mt-6 max-w-lg mx-auto leading-relaxed font-medium">
            {t.subtitle}
          </p>
        </header>

        {/* Custom Input Hero */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 md:mb-10 mt-6 md:mt-10">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t.customLabel}
          </label>
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={t.customPlaceholder}
              className="flex-1 p-3 md:p-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-700 w-full"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-3 md:py-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-indigo-200 w-full sm:w-auto"
            >
              {t.start}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex justify-end mb-6">
          <button 
            onClick={onViewHistory}
            className="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white transition-all"
          >
            <History className="w-4 h-4" />
            {t.history}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-10">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon] || Search;
            const currentItems = visiblePresets[cat.id] || [];

            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 md:p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-slate-800">{cat.name[language]}</h2>
                  </div>
                  
                  {/* Shuffle Button */}
                  <button 
                    onClick={() => handleShuffle(cat.id)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-white transition-all"
                    title={t.shuffle}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t.shuffle}
                  </button>
                </div>
                
                <div className="p-2">
                  {currentItems.length > 0 ? (
                    currentItems.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => onScenarioSelect(preset)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-sm transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate mr-2">{preset}</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    ))
                  ) : (
                    // Fallback loader
                    <div className="p-4 text-center text-slate-300 text-sm">Loading...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
