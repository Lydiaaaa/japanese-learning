import React, { useState } from 'react';
import { ScenarioContent, Language, SavedItem, VocabularyItem, ExpressionItem } from '../types';
import { BookOpen, MessageCircle, GraduationCap, ChevronLeft } from 'lucide-react';
import { VocabularyList } from './VocabularyList';
import { DialoguePlayer } from './DialoguePlayer';
import { UI_TEXT } from '../constants';

interface StudyViewProps {
  content: ScenarioContent;
  onBack: () => void;
  language: Language;
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
}

type Tab = 'vocab' | 'expressions' | 'dialogue';

export const StudyView: React.FC<StudyViewProps> = ({ content, onBack, language, savedItems, onToggleSave }) => {
  const [activeTab, setActiveTab] = useState<Tab>('vocab');
  const t = UI_TEXT[language];

  const isSaved = (text: string) => {
    return savedItems.some(i => 
      (i.type === 'vocab' && (i.content as VocabularyItem).term === text) ||
      (i.type === 'expression' && (i.content as ExpressionItem).phrase === text)
    );
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-b-2xl md:rounded-2xl shadow-sm border border-slate-100 mb-6 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
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
