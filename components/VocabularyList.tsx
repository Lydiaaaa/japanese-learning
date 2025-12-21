
import React, { useState } from 'react';
import { VocabularyItem, ExpressionItem, SavedItem, Notation, Language, LearningLanguage, VoiceEngine } from '../types';
import { Volume2, Star, Loader2, PlusCircle } from 'lucide-react';
import { playTTS } from '../services/geminiService';
import { UI_TEXT, LEARNING_LANGUAGES } from '../constants';

interface Props {
  items: (VocabularyItem | ExpressionItem)[];
  type: 'vocab' | 'expression';
  targetLanguage: LearningLanguage;
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
  language?: Language; 
  voiceEngine?: VoiceEngine;
  onRetry?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  canLoadMore?: boolean;
}

const getMeaning = (meaning: string | { en: string; zh: string } | undefined, lang: Language) => {
  if (!meaning) return '';
  if (typeof meaning === 'string') return meaning;
  return meaning[lang] || meaning.en || '';
};

export const VocabularyList: React.FC<Props> = ({ 
  items, 
  type, 
  targetLanguage,
  savedItems, 
  onToggleSave, 
  notation, 
  language = 'zh',
  voiceEngine = 'system',
  onRetry,
  onLoadMore,
  canLoadMore = false
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const t = UI_TEXT[language];
  const langConfig = LEARNING_LANGUAGES.find(l => l.id === targetLanguage)!;

  const handlePlay = async (text: string, index: number) => {
    if (playingIndex === index) return;
    setPlayingIndex(index);
    try {
      // API Key is handled internally by process.env.API_KEY in the service
      await playTTS(text, 'Puck', voiceEngine as VoiceEngine, langConfig.code);
    } catch (err) { console.error(err); } finally { setPlayingIndex(null); }
  };

  const isSaved = (item: VocabularyItem | ExpressionItem) => {
    const termToCheck = type === 'vocab' ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
    return savedItems.some(saved => {
      const savedTerm = saved.type === 'vocab' ? (saved.content as VocabularyItem).term : (saved.content as ExpressionItem).phrase;
      return saved.type === type && savedTerm === termToCheck && saved.targetLanguage === targetLanguage;
    });
  };

  const handleToggle = (item: VocabularyItem | ExpressionItem) => {
    const term = type === 'vocab' ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
    onToggleSave({ id: term, type, targetLanguage, content: item, timestamp: Date.now() });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1 mb-8">
        {items.map((item, idx) => {
          const isVocab = type === 'vocab';
          const mainText = isVocab ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
          const kana = isVocab ? (item as VocabularyItem).kana : (item as ExpressionItem).kana;
          const romaji = isVocab ? (item as VocabularyItem).romaji : (item as ExpressionItem).romaji;
          const subText = notation === 'kana' ? (kana || romaji) : (romaji || kana);
          const meaning = getMeaning(item.meaning, language as Language);
          const tag = isVocab ? (item as VocabularyItem).type : null;
          const saved = isSaved(item);

          return (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-primary/20 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  {tag && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1">{tag}</span>}
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{mainText}</h3>
                  {subText && <p className="text-sm text-primary font-medium mt-0.5">{subText}</p>}
                </div>
                <button onClick={() => handleToggle(item)} className={`p-2 rounded-full transition-colors ${saved ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                  <Star className="w-5 h-5 fill-current" />
                </button>
              </div>
              <div className="border-t border-slate-50 pt-3 mt-1 flex justify-between items-end">
                <p className="text-slate-600 text-sm italic">{meaning}</p>
                <button onClick={() => handlePlay(mainText, idx)} className={`p-2 rounded-full transition-all ${playingIndex === idx ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500 hover:bg-primary/10 hover:text-primary'}`}>
                  {playingIndex === idx ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {onLoadMore && (
        <div className="flex justify-center pb-8">
            {canLoadMore ? (
                <button onClick={async () => {setIsLoadingMore(true); await onLoadMore(); setIsLoadingMore(false);}} disabled={isLoadingMore} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-full shadow-sm hover:border-primary/30 hover:text-primary transition-all disabled:opacity-70">
                    {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    {isLoadingMore ? t.loadingMore : t.loadMore}
                </button>
            ) : <div className="text-slate-400 text-sm font-medium bg-slate-100 px-4 py-2 rounded-full">{t.maxLoaded}</div>}
        </div>
      )}
    </>
  );
};
