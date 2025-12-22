import React, { useState } from 'react';
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
    <div className="flex flex-col h-full w-full bg-pastel-bg">
      {/* Optimized Header: Removed heavy box container */}
      <div className="flex-shrink-0 z-10 pt-6 pb-2 px-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>
          <div>
            <h1 className="text-3xl font-black font-serif text-black leading-tight flex items-center gap-3">
              <History className="w-8 h-8 text-black" />
              {t.history}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 w-full">
        <div className="max-w-4xl mx-auto px-4">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-black border-dashed rounded-xl bg-white mt-8">
              <History className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">{t.noHistory}</p>
            </div>
          ) : (
            <div className="space-y-4 px-1 pt-4">
              {sortedHistory.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelect(item)}
                  className="bg-white p-5 rounded-xl border-2 border-black hover:shadow-neo transition-all cursor-pointer group flex justify-between items-center hover:-translate-y-1"
                >
                  <div>
                    <h3 className="font-bold text-black text-xl mb-1 font-serif">{item.name}</h3>
                    <div className="flex gap-3 text-xs text-slate-500 font-medium">
                      <span>{new Date(item.lastAccessed).toLocaleDateString()}</span>
                      <span className="bg-pastel-blue text-black border border-black px-2 py-0.5 rounded-md font-bold">
                         {item.versions.length} {t.versions}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                      title={t.delete}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-neo-sm group-hover:shadow-none group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-all">
                       <ChevronRight className="w-5 h-5" />
                    </div>
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