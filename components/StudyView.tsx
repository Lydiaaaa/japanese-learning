
import React, { useState } from 'react';
import { ScenarioContent, Language, SavedItem, Notation } from '../types';
import { BookOpen, MessageCircle, GraduationCap, ChevronLeft, RotateCw, Clock, Download } from 'lucide-react';
import { VocabularyList } from './VocabularyList';
import { DialoguePlayer } from './DialoguePlayer';
import { UI_TEXT } from '../constants';

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
  notation: Notation;
}

type Tab = 'vocab' | 'expressions' | 'dialogue';

// Helper to extract string content
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
  notation
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('vocab');
  const t = UI_TEXT[language];

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
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
          
          /* Vocab Grid */
          .vocab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @media (max-width: 600px) { .vocab-grid { grid-template-columns: 1fr; } }
          
          .item { page-break-inside: avoid; margin-bottom: 12px; }
          .vocab-term { font-weight: 700; font-size: 16px; }
          .vocab-reading { color: #4f46e5; font-size: 14px; margin-left: 8px; }
          .vocab-meaning { color: #4b5563; font-size: 14px; display: block; }
          .vocab-type { font-size: 10px; color: #94a3b8; text-transform: uppercase; border: 1px solid #e2e8f0; padding: 1px 4px; border-radius: 4px; margin-left: 6px; }

          /* Expressions */
          .expr-item { margin-bottom: 16px; page-break-inside: avoid; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
          .expr-phrase { font-weight: 700; font-size: 16px; }
          .expr-reading { color: #4f46e5; font-size: 13px; display: block; margin-bottom: 2px; }
          .expr-meaning { color: #4b5563; }

          /* Dialogue */
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
             // Delay slightly to ensure fonts are rendered
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
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-b-2xl md:rounded-2xl shadow-sm border border-slate-100 mb-6 flex-shrink-0">
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
          
          {/* Action Area */}
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
               onClick={handleDownloadPDF}
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
               title="Print to PDF"
             >
               <Download className="w-4 h-4" />
               <span className="hidden sm:inline">{t.download}</span>
             </button>
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
            <MessageCircle className="w-4 h-4" />
            {t.dialogue}
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {activeTab === 'vocab' && (
          <VocabularyList 
            items={content.vocabulary} 
            type="vocab" 
            savedItems={savedItems}
            onToggleSave={onToggleSave}
            notation={notation}
            language={language}
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
          />
        )}

        {activeTab === 'dialogue' && (
          <DialoguePlayer sections={content.dialogues} language={language} notation={notation} />
        )}
      </div>
    </div>
  );
};
