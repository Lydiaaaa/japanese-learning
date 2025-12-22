import React, { useState, useRef, useEffect } from 'react';
import { ScenarioContent, Language, SavedItem, Notation, VoiceEngine } from '../types';
import { BookOpen, MessageCircle, GraduationCap, ChevronLeft, RotateCw, Clock, Download, Share2, Copy, Check, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { VocabularyList } from './VocabularyList';
import { DialoguePlayer } from './DialoguePlayer';
import { UI_TEXT } from '../constants';
import { shareScenario } from '../services/firebase';

interface StudyViewProps {
  content: ScenarioContent;
  versions: ScenarioContent[];
  currentVersionIndex: number;
  onBack: () => void;
  language: Language;
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  onRegenerate: () => void;
  onSelectVersion: (index: number) => void;
  onDeleteVersion: () => void;
  notation: Notation;
  voiceEngine: VoiceEngine;
  isGeneratingDialogues?: boolean;
  onLoadMoreItems?: (type: 'vocab' | 'expression') => Promise<void>;
  onRetrySection?: (type: 'vocab' | 'expression') => Promise<void>;
  onRetryScene?: (sceneIndex: number) => Promise<void>;
  onAddScene?: (prompt: string) => Promise<void>;
}

type Tab = 'vocab' | 'expressions' | 'dialogue';

const getLocalizedContent = (content: string | { en: string; zh: string }, lang: Language) => {
  if (typeof content === 'string') return content;
  return content[lang] || content.en;
};

export const StudyView: React.FC<StudyViewProps> = ({ 
  content, 
  versions,
  currentVersionIndex,
  onBack, 
  language, 
  savedItems, 
  onToggleSave,
  onRegenerate,
  onSelectVersion,
  onDeleteVersion,
  notation,
  voiceEngine,
  isGeneratingDialogues,
  onLoadMoreItems,
  onRetrySection,
  onRetryScene,
  onAddScene
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('vocab');
  const scrollContainerRef = useRef<HTMLDivElement>(null); 
  
  // Track load counts per version
  const [vocabLoadCount, setVocabLoadCount] = useState(0);
  const [expressionLoadCount, setExpressionLoadCount] = useState(0);
  
  // MAX LOAD TIMES INCREASED TO 4
  const MAX_LOAD_MORE = 4;

  // Reset counts when version changes
  useEffect(() => {
    setVocabLoadCount(0);
    setExpressionLoadCount(0);
  }, [currentVersionIndex, content.scenarioName]);
  
  // Share State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const t = UI_TEXT[language];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoadMore = async (type: 'vocab' | 'expression') => {
      if (!onLoadMoreItems) return;
      
      try {
          await onLoadMoreItems(type);
          if (type === 'vocab') {
              setVocabLoadCount(prev => prev + 1);
          } else {
              setExpressionLoadCount(prev => prev + 1);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleRetrySpecific = async (type: 'vocab' | 'expression') => {
      if (onRetrySection) {
          await onRetrySection(type);
      } else {
          // Fallback to global regenerate if specific handler isn't available
          onRegenerate();
      }
  };

  const handleCopyLink = async () => {
    setIsCreatingLink(true);
    try {
      const shareId = await shareScenario(content);
      if (shareId) {
        const url = `${window.location.origin}/?share=${shareId}`;
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } else {
        alert("Failed to create share link. Please check network.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDownloadPDF = () => {
    // PDF Logic kept same but simplified presentation here
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${content.scenarioName} - Study Guide</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans JP', 'Noto Sans SC', sans-serif; color: #000; padding: 40px; }
          h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 32px; }
          .item { margin-bottom: 12px; }
          .vocab-term { font-weight: 700; font-size: 16px; }
          .vocab-reading { color: #444; font-size: 14px; margin-left: 8px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>${content.scenarioName}</h1>
        <p>Use the web app for full details.</p>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
    setIsShareOpen(false);
  };

  // Determine specific font class based on target language
  const contentFontClass = content.targetLanguage === 'zh' ? 'font-cn' : (content.targetLanguage === 'ja' ? 'font-jp' : '');

  return (
    <div className="flex flex-col h-full w-full bg-pastel-bg">
      <div className="bg-white border-b-2 border-black flex-shrink-0 w-full z-10 shadow-sm">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <button 
                onClick={onBack}
                className="p-2 bg-white border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                <ChevronLeft className="w-6 h-6 stroke-[3]" />
              </button>
              <div>
                <h2 className="text-xs font-black text-indigo-600 uppercase tracking-wider bg-indigo-100 inline-block px-2 py-0.5 rounded border border-indigo-200 mb-1">{t.currentScenario}</h2>
                <h1 className="text-2xl md:text-3xl font-black font-serif text-black leading-tight">{content.scenarioName}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 ml-14 md:ml-0">
               <button
                 onClick={onDeleteVersion}
                 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                 title="Delete Scenario"
               >
                 <Trash2 className="w-5 h-5" />
               </button>

               {/* Share Dropdown */}
               <div className="relative" ref={shareMenuRef}>
                 <button
                   onClick={() => setIsShareOpen(!isShareOpen)}
                   className="flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-black rounded-lg text-sm font-bold shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all active:scale-95"
                 >
                   <Share2 className="w-4 h-4" />
                   <span className="hidden sm:inline">{t.share}</span>
                   <ChevronDown className={`w-3 h-3 transition-transform ${isShareOpen ? 'rotate-180' : ''}`} />
                 </button>

                 {isShareOpen && (
                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-neo border-2 border-black py-1 z-50">
                      <button 
                        onClick={handleCopyLink}
                        disabled={isCreatingLink}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-800 hover:bg-pastel-yellow flex items-center gap-3 transition-colors disabled:opacity-50"
                      >
                         {linkCopied ? (
                           <Check className="w-4 h-4 text-green-600" />
                         ) : isCreatingLink ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                         ) : (
                           <Copy className="w-4 h-4" />
                         )}
                         {linkCopied ? t.linkCopied : isCreatingLink ? t.creatingLink : t.copyLink}
                      </button>
                      <div className="h-0.5 bg-black my-0 opacity-10"></div>
                      <button 
                        onClick={handleDownloadPDF}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-800 hover:bg-pastel-blue flex items-center gap-3 transition-colors"
                      >
                         <Download className="w-4 h-4" />
                         {t.download}
                      </button>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1 w-full">
            {[
              { id: 'vocab', label: t.vocab, icon: BookOpen, color: 'bg-pastel-yellow' },
              { id: 'expressions', label: t.expressions, icon: GraduationCap, color: 'bg-pastel-green' },
              { id: 'dialogue', label: t.dialogue, icon: MessageCircle, color: 'bg-pastel-pink' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border-2 ${
                  activeTab === tab.id 
                    ? `border-black ${tab.color} text-black shadow-neo-sm -translate-y-1` 
                    : 'border-transparent text-slate-500 hover:bg-white hover:border-black/10'
                }`}
              >
                {tab.id === 'dialogue' && isGeneratingDialogues ? <Loader2 className="w-4 h-4 animate-spin" /> : <tab.icon className="w-4 h-4" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar w-full"
      >
        {/* Applied contentFontClass here to encompass all learning content */}
        <div className={`mx-auto pb-10 pt-6 transition-all duration-300 ease-in-out max-w-6xl px-4 ${contentFontClass}`}>
          {activeTab === 'vocab' && (
            <VocabularyList 
              items={content.vocabulary} 
              type="vocab" 
              savedItems={savedItems}
              onToggleSave={onToggleSave}
              notation={notation}
              language={language}
              voiceEngine={voiceEngine}
              onRetry={() => handleRetrySpecific('vocab')}
              onLoadMore={() => handleLoadMore('vocab')}
              canLoadMore={vocabLoadCount < MAX_LOAD_MORE}
              targetLanguage={content.targetLanguage}
            />
          )}
          
          {activeTab === 'expressions' && (
            <VocabularyList 
              items={content.expressions} 
              type="expression" 
              savedItems={savedItems}
              onToggleSave={onToggleSave}
              notation={notation}
              language={language}
              voiceEngine={voiceEngine}
              onRetry={() => handleRetrySpecific('expression')}
              onLoadMore={() => handleLoadMore('expression')}
              canLoadMore={expressionLoadCount < MAX_LOAD_MORE}
              targetLanguage={content.targetLanguage}
            />
          )}

          {activeTab === 'dialogue' && (
            <DialoguePlayer 
              sections={content.dialogues} 
              language={language} 
              notation={notation} 
              voiceEngine={voiceEngine}
              onRetry={onRegenerate}
              onRetryScene={onRetryScene}
              onAddScene={onAddScene}
              isGenerating={isGeneratingDialogues}
              targetLanguage={content.targetLanguage}
            />
          )}
        </div>
      </div>
    </div>
  );
};