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

const categoryColors: Record<string, string> = {
  dining: 'bg-pastel-yellow',
  travel: 'bg-pastel-blue',
  lifestyle: 'bg-pastel-green',
  work_school: 'bg-pastel-pink'
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
    const availablePool = allPresets.filter(p => !currentShown.includes(p));
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
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* HEADER SECTION */}
        <header className="mb-10 md:mb-14 text-center mt-8 md:mt-16">
          <h1 className="text-4xl md:text-6xl font-black text-black tracking-tight flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5 leading-tight font-serif">
             <span className="whitespace-nowrap">{t.homeTitlePrefix}</span>
             
             {/* Styled Dropdown Trigger */}
             <div className="relative inline-block" ref={langMenuRef}>
               <button
                 onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                 className="flex items-center gap-2 border-b-4 border-black pb-0 md:pb-1 hover:text-indigo-600 hover:border-indigo-600 transition-all cursor-pointer group bg-pastel-green px-4 -rotate-1 hover:rotate-0"
               >
                 <span>{currentLangObj.name}</span>
                 <ChevronDown className="w-8 h-8 md:w-10 md:h-10 stroke-[3] text-black group-hover:text-indigo-600 transition-colors" />
               </button>

               {isLangMenuOpen && (
                 <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-72 bg-white rounded-xl shadow-neo border-2 border-black py-2 z-50 max-h-80 overflow-y-auto text-base text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black [&::-webkit-scrollbar-thumb]:rounded-full">
                    {TARGET_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onTargetLanguageChange(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-pastel-blue flex items-center justify-between group transition-colors font-bold"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{lang.flag}</span>
                          <span className={`text-base ${targetLanguage === lang.code ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {lang.name}
                          </span>
                        </div>
                        {targetLanguage === lang.code && <Check className="w-4 h-4 text-indigo-600 stroke-[4]" />}
                      </button>
                    ))}
                 </div>
               )}
             </div>
          </h1>

          {/* Slogan with Micro-interaction: Hover tilts opposite way and scales slightly */}
          <p className="text-slate-600 text-base md:text-xl mt-8 max-w-lg mx-auto leading-relaxed font-medium bg-white border-2 border-black p-4 rounded-lg -rotate-1 transition-all duration-300 hover:rotate-1 hover:scale-105 hover:shadow-sm cursor-default origin-center">
            {t.subtitle}
          </p>
        </header>

        {/* Custom Input Hero - Adjusted Radius (rounded-2xl -> rounded-xl) */}
        <div className="bg-pastel-purple/20 p-6 md:p-8 rounded-xl border-2 border-black mb-12">
          <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
            {t.customLabel}
          </label>
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={t.customPlaceholder}
              className="flex-1 p-3 md:p-4 rounded-lg bg-white border-2 border-black/10 focus:border-black focus:outline-none transition-all placeholder:text-slate-400 text-black font-medium text-lg w-full"
            />
            {/* Start Button - Adjusted Radius */}
            <button
              type="submit"
              className="bg-black text-white border-2 border-black px-8 py-3 md:py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
            >
              {t.start}
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </form>
        </div>

        <div className="flex justify-between items-end mb-6">
           <div className="text-2xl font-black font-serif ml-1 relative">
             <span className="relative z-10">Scenarios</span>
             <span className="absolute bottom-1 left-0 w-full h-3 bg-pastel-green -z-0 -rotate-1"></span>
           </div>
           <button 
            onClick={onViewHistory}
            className="text-black hover:text-indigo-600 font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-transparent hover:border-black hover:bg-white transition-all"
          >
            <History className="w-4 h-4" />
            {t.history}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-10">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon] || Search;
            const currentItems = visiblePresets[cat.id] || [];
            const bgColor = categoryColors[cat.id] || 'bg-white';

            return (
              // Card radius reduced to rounded-xl
              <div key={cat.id} className="bg-white rounded-xl border-2 border-black overflow-hidden hover:shadow-neo transition-all hover:-translate-y-1">
                <div className={`p-4 md:p-5 border-b-2 border-black flex items-center justify-between ${bgColor}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black text-white rounded-md border-2 border-black shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="font-serif font-black text-xl text-black">{cat.name[language]}</h2>
                  </div>
                  
                  {/* Shuffle Button */}
                  <button 
                    onClick={() => handleShuffle(cat.id)}
                    className="flex items-center gap-1 text-xs font-bold text-black hover:bg-black hover:text-white px-3 py-1.5 rounded-md border-2 border-black bg-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                    title={t.shuffle}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t.shuffle}
                  </button>
                </div>
                
                <div className="p-3">
                  {currentItems.length > 0 ? (
                    currentItems.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => onScenarioSelect(preset)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-800 font-medium text-sm transition-colors flex items-center justify-between group border-2 border-transparent hover:border-black mb-1 last:mb-0"
                      >
                        <span className="truncate mr-2">{preset}</span>
                        <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                           <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm font-bold">Loading...</div>
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