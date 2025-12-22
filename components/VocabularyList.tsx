import React, { useState } from 'react';
import { VocabularyItem, ExpressionItem, SavedItem, Notation, Language, VoiceEngine } from '../types';
import { Volume2, Star, Loader2, RefreshCw, PlusCircle } from 'lucide-react';
import { playTTS } from '../services/geminiService';
import { UI_TEXT } from '../constants';

interface Props {
  items: (VocabularyItem | ExpressionItem)[];
  type: 'vocab' | 'expression';
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  notation: Notation;
  language?: Language; 
  voiceEngine?: VoiceEngine;
  onRetry?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  canLoadMore?: boolean;
  targetLanguage?: string;
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
  onRetry,
  onLoadMore,
  canLoadMore = false,
  targetLanguage = 'ja'
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const t = UI_TEXT[language];

  const showSubText = (kana: string, romaji: string) => {
      if (targetLanguage === 'ja') {
          return notation === 'kana' ? kana : romaji;
      }
      if (targetLanguage === 'zh' || targetLanguage === 'ko') {
          return romaji || kana;
      }
      return romaji || kana;
  };

  if (!items || items.length === 0) {
    const handleRetryClick = async () => {
        if (!onRetry || isRetrying) return;
        setIsRetrying(true);
        try {
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    };

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8 text-slate-400 bg-white rounded-xl border-2 border-black border-dashed">
        <p className="mb-4 font-bold">No items available.</p>
        {onRetry && (
          <button 
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo-sm rounded-lg text-sm font-bold text-black hover:bg-pastel-yellow transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{isRetrying ? 'Generating...' : 'Regenerate'}</span>
          </button>
        )}
      </div>
    );
  }

  const handlePlay = async (text: string, index: number) => {
    if (playingIndex === index) return;
    
    setPlayingIndex(index);
    try {
      const customKey = localStorage.getItem('nihongo_api_key') || undefined;
      await playTTS(text, 'Puck', voiceEngine as VoiceEngine, customKey, targetLanguage as any);
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

  const handleLoadMoreClick = async () => {
     if (isLoadingMore || !onLoadMore) return;
     setIsLoadingMore(true);
     await onLoadMore();
     setIsLoadingMore(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1 mb-8">
        {items.map((item, idx) => {
          const isVocab = type === 'vocab';
          const mainText = isVocab ? (item as VocabularyItem).term : (item as ExpressionItem).phrase;
          
          const kana = isVocab ? (item as VocabularyItem).kana : (item as ExpressionItem).kana;
          const romaji = isVocab ? (item as VocabularyItem).romaji : (item as ExpressionItem).romaji;
          
          const subText = showSubText(kana, romaji);
          
          const meaning = getMeaning(item.meaning, language as Language);
          const tag = isVocab ? (item as VocabularyItem).type : null;
          const saved = isSaved(item);

          return (
            // Radius: rounded-2xl -> rounded-xl
            <div key={idx} className="bg-white p-5 rounded-xl border border-black flex flex-col justify-between hover:shadow-neo-sm transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  {tag && (
                    <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-black bg-pastel-purple text-black mb-2">
                      {tag}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-black">{mainText}</h3>
                  {subText && <p className="text-sm text-indigo-600 font-bold mt-1">{subText}</p>}
                </div>
                <button 
                  onClick={() => handleToggle(item)}
                  className={`p-2 rounded-lg transition-colors border ${
                    saved 
                    ? 'text-black bg-pastel-yellow border-black' 
                    : 'text-slate-300 border-transparent hover:border-black hover:text-black hover:bg-white'
                  }`}
                >
                  <Star className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <div className="border-t border-black/5 pt-3 mt-2 flex justify-between items-end">
                <p className="text-slate-700 text-sm font-medium">{meaning}</p>
                <button 
                  onClick={() => handlePlay(mainText, idx)}
                  className={`p-2 rounded-lg border transition-all ${
                    playingIndex === idx 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-black hover:text-black hover:bg-pastel-blue'
                  }`}
                >
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
                <button 
                    onClick={handleLoadMoreClick}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-black text-black font-bold rounded-lg shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    {isLoadingMore ? t.loadingMore : t.loadMore}
                </button>
            ) : (
                <div className="text-slate-400 text-sm font-bold bg-slate-100 px-4 py-2 rounded-lg border-2 border-slate-200">
                    {t.maxLoaded}
                </div>
            )}
        </div>
      )}
    </>
  );
};