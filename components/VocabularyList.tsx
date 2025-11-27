
import React, { useState } from 'react';
import { VocabularyItem, ExpressionItem, SavedItem, Notation } from '../types';
import { Volume2, Star } from 'lucide-react';
import { playTTS } from '../services/geminiService';

interface Props {
  items: (VocabularyItem | ExpressionItem)[];
  type: 'vocab' | 'expression';
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
}

export const VocabularyList: React.FC<Props> = ({ items, type, savedItems, onToggleSave, notation }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const handlePlay = async (text: string, index: number) => {
    if (playingIndex === index) return;
    
    setPlayingIndex(index);
    try {
      await playTTS(text);
    } catch (err) {
      console.error("TTS Error", err);
    } finally {
      setPlayingIndex(null);
    }
  };

  const isSaved = (item: VocabularyItem | ExpressionItem) => {
    const termToCheck = type === 'vocab' ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
    return savedItems.some(saved => {
      const savedTerm = saved.type === 'vocab' ? (saved.content as VocabularyItem).term : (saved.content as ExpressionItem).phrase;
      return saved.type === type && savedTerm === termToCheck;
    });
  };

  const handleToggle = (item: VocabularyItem | ExpressionItem) => {
    const term = type === 'vocab' ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
    onToggleSave({
      id: term, // Simple ID using the term itself
      type,
      content: item,
      timestamp: Date.now()
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
      {items.map((item, idx) => {
        const isVocab = type === 'vocab';
        const mainText = isVocab ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
        
        // Dynamic pronunciation display
        const kana = isVocab ? (item as VocabularyItem).kana : (item as ExpressionItem).kana;
        const romaji = isVocab ? (item as VocabularyItem).romaji : (item as ExpressionItem).romaji;
        const subText = notation === 'kana' ? kana : romaji;
        
        const meaning = item.meaning;
        const tag = isVocab ? (item as VocabularyItem).type : null;
        const saved = isSaved(item);

        return (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-indigo-100 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {tag && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1">
                    {tag}
                  </span>
                )}
                <h3 className="text-xl font-bold text-slate-800">{mainText}</h3>
                {subText && <p className="text-sm text-indigo-600 font-medium">{subText}</p>}
              </div>
              <button 
                onClick={() => handleToggle(item)}
                className={`p-2 rounded-full transition-colors ${saved ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`}
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            </div>
            
            <div className="border-t border-slate-50 pt-3 mt-1 flex justify-between items-end">
              <p className="text-slate-600 text-sm">{meaning}</p>
              <button 
                onClick={() => handlePlay(mainText, idx)}
                className={`p-2 rounded-full ${playingIndex === idx ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
