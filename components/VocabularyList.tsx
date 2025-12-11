
import React, { useState } from 'react';
import { VocabularyItem, ExpressionItem, SavedItem, Notation, Language, VoiceEngine } from '../types';
import { Volume2, Star, Loader2, RefreshCw } from 'lucide-react';
import { playTTS } from '../services/geminiService';

interface Props {
  items: (VocabularyItem | ExpressionItem)[];
  type: 'vocab' | 'expression';
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
  language?: Language; 
  voiceEngine?: VoiceEngine;
  onRetry?: () => void;
}

const getMeaning = (meaning: string | { en: string; zh: string } | undefined, lang: Language) => {
  if (!meaning) return '';
  if (typeof meaning === 'string') return meaning;
  return meaning[lang] || meaning.en || '';
};

export const VocabularyList: React.FC<Props> = ({ 
  items, 
  type, 
  savedItems, 
  onToggleSave, 
  notation, 
  language = 'zh',
  voiceEngine = 'system',
  onRetry
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  // Safety guard for empty items
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
        <p className="mb-4">No items available.</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        )}
      </div>
    );
  }

  const handlePlay = async (text: string, index: number) => {
    if (playingIndex === index) return;
    
    setPlayingIndex(index);
    try {
      // Get API Key from localStorage for TTS if available
      const customKey = localStorage.getItem('nihongo_api_key') || undefined;
      await playTTS(text, 'Puck', voiceEngine as VoiceEngine, customKey);
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
      id: term, 
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
        
        const kana = isVocab ? (item as VocabularyItem).kana : (item as ExpressionItem).kana;
        const romaji = isVocab ? (item as VocabularyItem).romaji : (item as ExpressionItem).romaji;
        const subText = notation === 'kana' ? kana : romaji;
        
        const meaning = getMeaning(item.meaning, language as Language);
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
                className={`p-2 rounded-full transition-all ${playingIndex === idx ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                {playingIndex === idx ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
