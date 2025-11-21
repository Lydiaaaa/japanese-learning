import React, { useState, useEffect } from 'react';
import { ScenarioContent, Language, SavedItem, VocabularyItem, ExpressionItem } from '../types';
import { BookOpen, MessageCircle, GraduationCap, ChevronLeft, RotateCw, Clock } from 'lucide-react';
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
}

type Tab = 'vocab' | 'expressions' | 'dialogue';

export const StudyView: React.FC<StudyViewProps> = ({ 
  content, 
  versions,
  currentVersionIndex,
  onBack, 
  language, 
  savedItems, 
  onToggleSave,
  onRegenerate,
  onSelectVersion
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
          
          {/* Action Area: Version Select and Regenerate */}
          <div className="flex items-center gap-2 ml-12 md:ml-0">
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
          />
        )}
        
        {activeTab === 'expressions' && (
          <VocabularyList 
            items={content.expressions} 
            type="expression" 
            savedItems={savedItems}
            onToggleSave={onToggleSave}
          />
        )}

        {activeTab === 'dialogue' && (
          <DialoguePlayer sections={content.dialogues} language={language} />
        )}
      </div>
    </div>
  );
};