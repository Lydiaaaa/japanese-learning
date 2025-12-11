
import React, { useState, useEffect } from 'react';
import { CATEGORIES, UI_TEXT } from '../constants';
import { ArrowRight, Building, Plane, Utensils, Briefcase, Search, History, RefreshCw } from 'lucide-react';
import { Language } from '../types';

interface HomeProps {
  onScenarioSelect: (scenario: string) => void;
  onViewHistory: () => void;
  language: Language;
}

const iconMap: Record<string, React.ElementType> = {
  Utensils,
  Plane,
  Building,
  Briefcase
};

export const Home: React.FC<HomeProps> = ({ onScenarioSelect, onViewHistory, language }) => {
  const [customInput, setCustomInput] = useState('');
  // State to track which presets are currently visible for each category
  const [visiblePresets, setVisiblePresets] = useState<Record<string, string[]>>({});
  
  const t = UI_TEXT[language];

  // Initialize or Reset presets when language changes.
  useEffect(() => {
    const defaults: Record<string, string[]> = {};
    CATEGORIES.forEach(cat => {
      defaults[cat.id] = cat.presets[language].slice(0, 4);
    });
    setVisiblePresets(defaults);
  }, [language]);

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

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <header className="mb-8 md:mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">{t.title}</h1>
          <p className="text-slate-500 text-base md:text-lg">{t.subtitle}</p>
        </header>

        {/* Custom Input Hero - UPDATED UI: Stacked on mobile, row on desktop */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 md:mb-10">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t.customLabel}
          </label>
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={t.customPlaceholder}
              className="flex-1 p-3 md:p-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-700"
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

        <div className="flex justify-end mb-4 md:mb-6">
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
                        className="w-full text-left px-3 py-2.5 md:px-4 md:py-3 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-sm transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate mr-2">{preset}</span>
                        <ArrowRight className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
