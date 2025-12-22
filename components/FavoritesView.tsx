import React, { useState } from 'react';
import { SavedItem, Language, VocabularyItem, ExpressionItem, Notation, VoiceEngine } from '../types';
import { VocabularyList } from './VocabularyList';
import { ChevronLeft, Star } from 'lucide-react';
import { UI_TEXT } from '../constants';

interface FavoritesViewProps {
  savedItems: SavedItem[];
  onBack: () => void;
  language: Language;
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
  voiceEngine?: VoiceEngine;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ 
  savedItems, 
  onBack, 
  language, 
  onToggleSave, 
  notation,
  voiceEngine = 'system'
}) => {
  const t = UI_TEXT[language];

  const vocabItems = savedItems.filter(i => i.type === 'vocab').map(i => i.content as VocabularyItem);
  const exprItems = savedItems.filter(i => i.type === 'expression').map(i => i.content as ExpressionItem);

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
            <h1 className="text-3xl font-black font-serif text-black leading-tight flex items-center gap-2">
              <Star className="w-8 h-8 text-amber-400 fill-current stroke-black stroke-2" />
              {t.favorites}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 w-full">
        <div className="max-w-4xl mx-auto px-4">
          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-black border-dashed rounded-xl bg-white mt-8">
              <Star className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">{t.noFavorites}</p>
            </div>
          ) : (
            <div className="space-y-10 pt-4">
              {vocabItems.length > 0 && (
                <div>
                  <h2 className="text-xl font-black font-serif text-black px-1 mb-6 border-b-2 border-black/10 pb-2 inline-block">{t.vocab}</h2>
                  <VocabularyList 
                    items={vocabItems} 
                    type="vocab" 
                    savedItems={savedItems} 
                    onToggleSave={onToggleSave} 
                    notation={notation} 
                    language={language}
                    voiceEngine={voiceEngine}
                  />
                </div>
              )}
              {exprItems.length > 0 && (
                <div>
                  <h2 className="text-xl font-black font-serif text-black px-1 mb-6 border-b-2 border-black/10 pb-2 inline-block">{t.expressions}</h2>
                  <VocabularyList 
                    items={exprItems} 
                    type="expression" 
                    savedItems={savedItems} 
                    onToggleSave={onToggleSave} 
                    notation={notation} 
                    language={language}
                    voiceEngine={voiceEngine}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};