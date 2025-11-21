import React, { useState } from 'react';
import { CATEGORIES, UI_TEXT } from '../constants';
import { ArrowRight, Building, Plane, Utensils, Briefcase, Search } from 'lucide-react';
import { Language } from '../types';

interface HomeProps {
  onScenarioSelect: (scenario: string) => void;
  language: Language;
}

const iconMap: Record<string, React.ElementType> = {
  Utensils,
  Plane,
  Building,
  Briefcase
};

export const Home: React.FC<HomeProps> = ({ onScenarioSelect, language }) => {
  const [customInput, setCustomInput] = useState('');
  const t = UI_TEXT[language];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onScenarioSelect(customInput.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">{t.title}</h1>
        <p className="text-slate-500 text-lg">{t.subtitle}</p>
      </header>

      {/* Custom Input Hero */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-10">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {t.customLabel}
        </label>
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={t.customPlaceholder}
            className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {t.start}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((cat) => {
          const Icon = iconMap[cat.icon] || Search;
          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-slate-800">{cat.name[language]}</h2>
              </div>
              <div className="p-2">
                {cat.presets[language].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => onScenarioSelect(preset)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-sm transition-colors flex items-center justify-between group"
                  >
                    {preset}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
