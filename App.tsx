import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { StudyView } from './components/StudyView';
import { FavoritesView } from './components/FavoritesView';
import { ViewState, ScenarioContent, Language, SavedItem } from './types';
import { generateScenarioContent } from './services/geminiService';
import { Loader2, AlertCircle, RefreshCw, Globe, Star } from 'lucide-react';
import { UI_TEXT } from './constants';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [currentContent, setCurrentContent] = useState<ScenarioContent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingScenario, setLoadingScenario] = useState<string>('');
  
  // Global State
  const [language, setLanguage] = useState<Language>('zh');
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('nihongo_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const t = UI_TEXT[language];

  useEffect(() => {
    localStorage.setItem('nihongo_favorites', JSON.stringify(savedItems));
  }, [savedItems]);

  const toggleSavedItem = (item: SavedItem) => {
    setSavedItems(prev => {
      const exists = prev.some(i => i.id === item.id && i.type === item.type);
      if (exists) {
        return prev.filter(i => !(i.id === item.id && i.type === item.type));
      }
      return [...prev, item];
    });
  };

  const handleScenarioSelect = async (scenario: string) => {
    setViewState(ViewState.GENERATING);
    setLoadingScenario(scenario);
    setErrorMsg(null);

    try {
      const content = await generateScenarioContent(scenario, language);
      setCurrentContent(content);
      setViewState(ViewState.STUDY);
    } catch (err) {
      console.error(err);
      setErrorMsg(t.errorDesc);
      setViewState(ViewState.ERROR);
    }
  };

  const handleBack = () => {
    setViewState(ViewState.HOME);
    setCurrentContent(null);
  };

  const handleRetry = () => {
    if (loadingScenario) {
      handleScenarioSelect(loadingScenario);
    } else {
      setViewState(ViewState.HOME);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setViewState(ViewState.HOME)}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">日</div>
          <span className="font-bold text-lg text-slate-800 hidden md:inline">{t.navTitle}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState(ViewState.FAVORITES)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-colors"
            title={t.favorites}
          >
            <Star className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">{t.favorites}</span>
          </button>

          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>
      </nav>

      <main className="container mx-auto md:mt-6">
        {viewState === ViewState.HOME && (
          <Home onScenarioSelect={handleScenarioSelect} language={language} />
        )}

        {viewState === ViewState.FAVORITES && (
          <FavoritesView 
            savedItems={savedItems} 
            onBack={() => setViewState(ViewState.HOME)}
            language={language}
            onToggleSave={toggleSavedItem}
          />
        )}

        {viewState === ViewState.GENERATING && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-slate-800">{t.constructing}</h2>
            <p className="mt-2 text-slate-500 max-w-md">
              {t.constructingDesc} <br/>
              <span className="font-semibold text-indigo-600">"{loadingScenario}"</span>
            </p>
            <div className="mt-8 flex gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-0"></span>
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}

        {viewState === ViewState.STUDY && currentContent && (
          <StudyView 
            content={currentContent} 
            onBack={handleBack} 
            language={language}
            savedItems={savedItems}
            onToggleSave={toggleSavedItem}
          />
        )}

        {viewState === ViewState.ERROR && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
            <div className="p-4 bg-red-50 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t.errorTitle}</h2>
            <p className="text-slate-500 mb-6 max-w-sm">{errorMsg}</p>
            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                {t.goHome}
              </button>
              <button 
                onClick={handleRetry}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t.tryAgain}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
