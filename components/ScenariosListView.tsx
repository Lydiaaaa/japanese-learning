import React from 'react';
import { ScenarioHistoryItem, Language } from '../types';
import { ChevronLeft, History, Trash2, ChevronRight } from 'lucide-react';
import { UI_TEXT } from '../constants';

interface ScenariosListViewProps {
  history: ScenarioHistoryItem[];
  onBack: () => void;
  onSelect: (item: ScenarioHistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  language: Language;
}

export const ScenariosListView: React.FC<ScenariosListViewProps> = ({ 
  history, 
  onBack, 
  onSelect, 
  onDelete,
  language 
}) => {
  const t = UI_TEXT[language];

  // Sort by lastAccessed desc
  const sortedHistory = [...history].sort((a, b) => b.lastAccessed - a.lastAccessed);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="bg-white p-4 md:p-6 rounded-b-2xl md:rounded-2xl shadow-sm border border-slate-100 mb-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 leading-tight flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-500" />
              {t.history}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 w-full">
        <div className="max-w-4xl mx-auto px-4">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <History className="w-12 h-12 mb-4 opacity-20" />
              <p>{t.noHistory}</p>
            </div>
          ) : (
            <div className="space-y-3 px-1">
              {sortedHistory.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelect(item)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{item.name}</h3>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{new Date(item.lastAccessed).toLocaleDateString()}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                         {item.versions.length} {t.versions}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                      title={t.delete}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};