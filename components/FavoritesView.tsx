import React from 'react';
import { SavedItem, Language, VocabularyItem, ExpressionItem, Notation } from '../types';
import { VocabularyList } from './VocabularyList';
import { ChevronLeft, Star } from 'lucide-react';
import { UI_TEXT } from '../constants';

interface FavoritesViewProps {
  savedItems: SavedItem[];
  onBack: () => void;
  language: Language;
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ savedItems, onBack, language, onToggleSave, notation }) => {
  const t = UI_TEXT[language];

  // Separate items for cleaner rendering if needed, though VocabularyList handles arrays
  // For the Favorites view, we might want to mix them or separate them.
  // Let's separate them visually.
  const vocabItems = savedItems.filter(i => i.type === 'vocab').map(i => i.content as VocabularyItem);
  const exprItems = savedItems.filter(i => i.type === 'expression').map(i => i.content as ExpressionItem);

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
              <Star className="w-6 h-6 text-amber-400 fill-current" />
              {t.favorites}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 w-full">
        <div className="max-w-4xl mx-auto px-4">
          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Star className="w-12 h-12 mb-4 opacity-20" />
              <p>{t.noFavorites}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {vocabItems.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-700 px-4 mb-4">{t.vocab}</h2>
                  <VocabularyList items={vocabItems} type="vocab" savedItems={savedItems} onToggleSave={onToggleSave} notation={notation} language={language} />
                </div>
              )}
              {exprItems.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-700 px-4 mb-4">{t.expressions}</h2>
                  <VocabularyList items={exprItems} type="expression" savedItems={savedItems} onToggleSave={onToggleSave} notation={notation} language={language} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};