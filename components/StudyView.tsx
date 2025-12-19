
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
  onLoadMoreItems
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('vocab');
  const scrollContainerRef = useRef<HTMLDivElement>(null); 
  
  // Track load counts per version
  const [vocabLoadCount, setVocabLoadCount] = useState(0);
  const [expressionLoadCount, setExpressionLoadCount] = useState(0);
  
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

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

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
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${content.scenarioName} - Study Guide</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Noto Sans JP', sans-serif; 
            color: #1a202c; 
            line-height: 1.6;
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto; 
          }
          h1 { 
            font-size: 24px; 
            border-bottom: 2px solid #1a202c; 
            padding-bottom: 16px; 
            margin-bottom: 32px; 
          }
          h2 { 
            font-size: 18px; 
            font-weight: 700; 
            margin-top: 32px; 
            margin-bottom: 16px; 
            background: #f1f5f9; 
            padding: 8px 12px; 
            border-radius: 4px; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .section { margin-bottom: 24px; }
          .vocab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @media (max-width: 600px) { .vocab-grid { grid-template-columns: 1fr; } }
          .item { page-break-inside: avoid; margin-bottom: 12px; }
          .vocab-term { font-weight: 700; font-size: 16px; }
          .vocab-reading { color: #4f46e5; font-size: 14px; margin-left: 8px; }
          .vocab-meaning { color: #4b5563; font-size: 14px; display: block; }
          .vocab-type { font-size: 10px; color: #94a3b8; text-transform: uppercase; border: 1px solid #e2e8f0; padding: 1px 4px; border-radius: 4px; margin-left: 6px; }
          .expr-item { margin-bottom: 16px; page-break-inside: avoid; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
          .expr-phrase { font-weight: 700; font-size: 16px; }
          .expr-reading { color: #4f46e5; font-size: 13px; display: block; margin-bottom: 2px; }
          .expr-meaning { color: #4b5563; }
          .dialogue-section-title { font-weight: 700; margin-top: 24px; margin-bottom: 12px; font-size: 15px; text-decoration: underline; color: #334155; }
          .dialogue-line { margin-bottom: 16px; display: flex; gap: 16px; page-break-inside: avoid; }
          .speaker-label { font-weight: 700; min-width: 60px; font-size: 13px; color: #64748b; text-transform: uppercase; padding-top: 3px; }
          .line-content { flex: 1; }
          .jp-text { font-weight: 500; font-size: 15px; margin-bottom: 2px; }
          .reading-text { color: #4f46e5; font-size: 12px; margin-bottom: 2px; }
          .trans-text { color: #64748b; font-size: 13px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${content.scenarioName}</h1>
        <div class="section">
          <h2>${t.vocab}</h2>
          <div class="vocab-grid">
            ${content.vocabulary.map(v => `
              <div class="item">
                <div>
                  <span class="vocab-term">${v.term}</span>
                  <span class="vocab-reading">${notation === 'kana' ? v.kana : v.romaji}</span>
                  ${v.type ? `<span class="vocab-type">${v.type}</span>` : ''}
                </div>
                <span class="vocab-meaning">${getLocalizedContent(v.meaning, language)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="section">
          <h2>${t.expressions}</h2>
          ${content.expressions.map(e => `
            <div class="expr-item">
              <div class="expr-phrase">${e.phrase}</div>
              <span class="expr-reading">${notation === 'kana' ? e.kana : e.romaji}</span>
              <div>
                <span class="expr-meaning">${getLocalizedContent(e.meaning, language)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="section">
          <h2>${t.dialogue}</h2>
          ${content.dialogues.map(d => `
            <div class="dialogue-section-title">${d.title}</div>
            ${d.lines.map(l => `
              <div class="dialogue-line">
                <div class="speaker-label">${l.roleName || l.speaker}</div>
                <div class="line-content">
                  <div class="jp-text">${l.japanese}</div>
                  <div class="reading-text">${notation === 'kana' ? l.kana : l.romaji}</div>
                  <div class="trans-text">${getLocalizedContent(l.translation, language)}</div>
                </div>
              </div>
            `).join('')}
          `).join('')}
        </div>
        <div style="margin-top: 40px; font-size: 12px; color: #cbd5e1; text-align: center; border-top: 1px solid #f1f5f9; pt: 10px;">
          Generated by Nihongo Scene Master
        </div>
        <script>
          window.onload = () => {
             setTimeout(() => {
                window.print();
             }, 500);
          }
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert("Please allow popups for this site to download the PDF.");
    }
    setIsShareOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="bg-white border-b border-slate-100 flex-shrink-0 w-full">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t.currentScenario}</h2>
                <h1 className="text-2xl font-bold text-slate-800 leading-tight">{content.scenarioName}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-12 md:ml-0 flex-wrap">
               {versions.length > 1 && (
                 <div className="relative group">
                   <select 
                     value={currentVersionIndex}
                     onChange={(e) => onSelectVersion(Number(e.target.value))}
                     className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-9 pr-8 py-2 focus:ring-indigo-500 focus:border-indigo-500 block cursor-pointer hover:bg-slate-100 transition-colors font-medium"
                   >
                     {versions.map((v, idx) => (
                       <option key={idx} value={idx}>
                         {idx === 0 ? t.latest : `V${versions.length - idx}`} - {formatTime(v.timestamp)}
                       </option>
                     ))}
                   </select>
                   <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                 </div>
               )}

               <button
                 onClick={onRegenerate}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
               >
                 <RotateCw className="w-4 h-4" />
                 <span className="hidden sm:inline">{t.regenerate}</span>
               </button>

               <button
                 onClick={onDeleteVersion}
                 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                 title={t.deleteVersion}
               >
                 <Trash2 className="w-4 h-4" />
               </button>

               {/* Share Dropdown */}
               <div className="relative" ref={shareMenuRef}>
                 <button
                   onClick={() => setIsShareOpen(!isShareOpen)}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
                 >
                   <Share2 className="w-4 h-4" />
                   <span className="hidden sm:inline">{t.share}</span>
                   <ChevronDown className={`w-3 h-3 transition-transform ${isShareOpen ? 'rotate-180' : ''}`} />
                 </button>

                 {isShareOpen && (
                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                      <button 
                        onClick={handleCopyLink}
                        disabled={isCreatingLink}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors disabled:opacity-50"
                      >
                         {linkCopied ? (
                           <Check className="w-4 h-4 text-emerald-500" />
                         ) : isCreatingLink ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                         ) : (
                           <Copy className="w-4 h-4" />
                         )}
                         {linkCopied ? t.linkCopied : isCreatingLink ? t.creatingLink : t.copyLink}
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button 
                        onClick={handleDownloadPDF}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                      >
                         <Download className="w-4 h-4" />
                         {t.download}
                      </button>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('vocab')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'vocab' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {t.vocab}
            </button>
            <button
              onClick={() => setActiveTab('expressions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'expressions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              {t.expressions}
            </button>
            <button
              onClick={() => setActiveTab('dialogue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'dialogue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {isGeneratingDialogues ? <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> : <MessageCircle className="w-4 h-4" />}
              {t.dialogue}
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar w-full bg-slate-50"
      >
        <div className="mx-auto pb-10 pt-6 transition-all duration-300 ease-in-out max-w-6xl px-4">
          {activeTab === 'vocab' && (
            <VocabularyList 
              items={content.vocabulary} 
              type="vocab" 
              savedItems={savedItems}
              onToggleSave={onToggleSave}
              notation={notation}
              language={language}
              voiceEngine={voiceEngine}
              onRetry={onRegenerate}
              onLoadMore={() => handleLoadMore('vocab')}
              canLoadMore={vocabLoadCount < 2}
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
              onRetry={onRegenerate}
              onLoadMore={() => handleLoadMore('expression')}
              canLoadMore={expressionLoadCount < 2}
            />
          )}

          {activeTab === 'dialogue' && (
            <DialoguePlayer 
              sections={content.dialogues} 
              language={language} 
              notation={notation} 
              voiceEngine={voiceEngine}
              onRetry={onRegenerate}
              isGenerating={isGeneratingDialogues}
            />
          )}
        </div>
      </div>
    </div>
  );
};
