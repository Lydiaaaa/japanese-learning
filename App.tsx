
import React, { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { StudyView } from './components/StudyView';
import { FavoritesView } from './components/FavoritesView';
import { ScenariosListView } from './components/ScenariosListView';
import { UserMenu } from './components/UserMenu';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ViewState, ScenarioContent, Language, LearningLanguage, SavedItem, ScenarioHistoryItem, Notation, VoiceEngine, DialogueSection } from './types';
import { generateVocabularyAndExpressions, generateDialoguesWithCallback, generateMoreItems, regenerateSection, regenerateSingleDialogue, generateCustomScene } from './services/geminiService';
import { subscribeToAuth, syncUserData, saveUserData, GUEST_ID, getSharedScenario, User, checkIsAdmin } from './services/firebase';
import { Loader2, Globe, Star, Settings, Type, Zap, AlertTriangle, RefreshCw, Key } from 'lucide-react';
import { UI_TEXT, LEARNING_LANGUAGES } from './constants';
import { SaynarioLogo } from './components/Logo';

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('nihongo_language');
  if (saved === 'zh' || saved === 'en') return saved as Language;
  const sysLang = navigator.language || 'en';
  return sysLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

const getInitialTargetLanguage = (): LearningLanguage => {
  const saved = localStorage.getItem('nihongo_target_language');
  return (saved as LearningLanguage) || 'ja';
};

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<ScenarioContent | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingScenarioName, setLoadingScenarioName] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isGeneratingDialogues, setIsGeneratingDialogues] = useState<boolean>(false);
  
  const [language, setLanguage] = useState<Language>(getInitialLanguage());
  const [targetLanguage, setTargetLanguage] = useState<LearningLanguage>(getInitialTargetLanguage());
  const [notation, setNotation] = useState<Notation>('kana');
  // Default to system voice to save costs for user
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('system');
  
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true); 

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);

  const t = UI_TEXT[language];
  const activeTargetLang = LEARNING_LANGUAGES.find(l => l.id === targetLanguage)!;

  // Global Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary-50', activeTargetLang.themeLight);
    root.style.setProperty('--color-primary-100', activeTargetLang.theme + '1a');
    root.style.setProperty('--color-primary-500', activeTargetLang.theme);
    root.style.setProperty('--color-primary-600', activeTargetLang.theme);
    root.style.setProperty('--color-primary-700', activeTargetLang.themeDark);
    root.style.setProperty('--primary-color', activeTargetLang.theme);
  }, [targetLanguage, activeTargetLang]);

  // Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nihongo_favorites');
      if (saved) setSavedItems(JSON.parse(saved));
      const history = localStorage.getItem('nihongo_scenarios');
      if (history) setScenarioHistory(JSON.parse(history));
      const savedNotation = localStorage.getItem('nihongo_notation');
      if (savedNotation) setNotation(savedNotation as Notation);
      const savedEngine = localStorage.getItem('nihongo_voice_engine');
      if (savedEngine) setVoiceEngine(savedEngine as VoiceEngine);
      
      // Check API Key
      if (!process.env.API_KEY && !localStorage.getItem('nihongo_api_key')) {
         setShowApiKeyModal(true);
      }
    } catch (e) { console.error(e); }
  }, []);

  // Auth Subscription & Sync Logic
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (authUser) => {
      setUser(authUser);
      
      // If user is logged in, try to sync local data with cloud
      if (authUser && authUser.uid !== GUEST_ID) {
        try {
            // Read directly from localStorage to ensure we have the latest data before sync
            const localFavs = JSON.parse(localStorage.getItem('nihongo_favorites') || '[]');
            const localHist = JSON.parse(localStorage.getItem('nihongo_scenarios') || '[]');
            
            const merged = await syncUserData(authUser.uid, { 
                favorites: localFavs, 
                history: localHist 
            });
            
            if (merged) {
                setSavedItems(merged.favorites);
                setScenarioHistory(merged.history);
            }
        } catch (e) {
            console.error("Sync failed:", e);
        }
      }
      
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setIsSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSyncing) return; 
    
    // Always save to localStorage as backup/offline cache
    localStorage.setItem('nihongo_favorites', JSON.stringify(savedItems));
    localStorage.setItem('nihongo_scenarios', JSON.stringify(scenarioHistory));
    
    // If logged in, also try to save to cloud
    if (user && user.uid !== GUEST_ID) {
      saveUserData(user.uid, { favorites: savedItems, history: scenarioHistory });
    }

    localStorage.setItem('nihongo_language', language);
    localStorage.setItem('nihongo_target_language', targetLanguage);
    localStorage.setItem('nihongo_notation', notation);
    localStorage.setItem('nihongo_voice_engine', voiceEngine);
  }, [savedItems, scenarioHistory, user, isSyncing, language, targetLanguage, notation, voiceEngine]);

  // Handle Scenario Generation without manual API key management
  const executeScenarioGeneration = async (scenarioName: string) => {
    // Check key before starting
    if (!process.env.API_KEY && !localStorage.getItem('nihongo_api_key')) {
        setShowApiKeyModal(true);
        return;
    }

    setViewState(ViewState.GENERATING);
    setLoadingStep(0); 
    setIsGeneratingDialogues(false);
    
    try {
      const partialData = await generateVocabularyAndExpressions(scenarioName, targetLanguage, language);
      const roles = partialData.roles || { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
      
      const initialContent: ScenarioContent = {
         scenarioName: scenarioName,
         targetLanguage: targetLanguage,
         vocabulary: partialData.vocabulary || [],
         expressions: partialData.expressions || [],
         dialogues: [ { title: t.constructing, lines: [] }, { title: t.constructing, lines: [] }, { title: t.constructing, lines: [] } ], 
         roles: roles,
         timestamp: Date.now()
      };

      const savedVersion = saveScenarioToHistory(scenarioName, initialContent);
      setCurrentContent(savedVersion);
      setViewState(ViewState.STUDY);
      
      setIsGeneratingDialogues(true);
      await generateDialoguesWithCallback(
        scenarioName, 
        targetLanguage,
        initialContent.vocabulary, 
        roles,
        (index, sceneData) => {
          if (sceneData) {
            setCurrentContent(prev => {
              if (!prev) return null;
              const newDialogues = [...prev.dialogues];
              newDialogues[index] = sceneData;
              const updated = { ...prev, dialogues: newDialogues };
              saveScenarioToHistory(scenarioName, updated);
              return updated;
            });
          }
        },
        language
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t.errorDesc);
      setViewState(ViewState.ERROR);
    } finally { setIsGeneratingDialogues(false); }
  };

  const saveScenarioToHistory = (id: string, content: ScenarioContent) => {
    const timestamp = Date.now();
    const contentWithTime = { ...content, timestamp };
    setScenarioHistory(prev => {
      const existingIndex = prev.findIndex(item => item.id === id && item.targetLanguage === targetLanguage);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], versions: [contentWithTime], lastAccessed: timestamp };
        return updated;
      } else {
        return [{ id, name: id, targetLanguage, versions: [contentWithTime], lastAccessed: timestamp }, ...prev];
      }
    });
    return contentWithTime;
  };

  const handleScenarioSelect = (scenarioName: string) => {
    setLoadingScenarioName(scenarioName);
    setCurrentScenarioId(scenarioName);
    const existingHistory = scenarioHistory.find(h => h.id === scenarioName && h.targetLanguage === targetLanguage);
    if (existingHistory) {
      setCurrentContent(existingHistory.versions[0]);
      setViewState(ViewState.STUDY);
    } else {
      executeScenarioGeneration(scenarioName);
    }
  };

  const handleTargetLanguageChange = (id: LearningLanguage) => {
    if (id === targetLanguage) return;
    setTargetLanguage(id);
    if (viewState !== ViewState.HOME) {
      setViewState(ViewState.HOME);
    }
  };

  const handleBack = () => {
    setViewState(ViewState.HOME);
    setCurrentContent(null);
    setCurrentScenarioId('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)}
        language={language}
        isQuotaExceeded={false}
        onConfirm={(key) => {
            if (key) localStorage.setItem('nihongo_api_key', key);
            setShowApiKeyModal(false);
        }}
      />

      <nav className="bg-white border-b border-slate-100 px-4 md:px-6 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewState(ViewState.HOME)}>
            <div className="text-indigo-600 flex-shrink-0">
              <SaynarioLogo className="w-9 h-9" />
            </div>
            <span className="font-bold text-lg text-slate-800 hidden sm:inline">{t.navTitle}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setViewState(ViewState.FAVORITES)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-colors" title={t.favorites}>
            <Star className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">{t.favorites}</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <UserMenu user={user} isSyncing={isSyncing} language={language} />
          <div className="relative" ref={settingsRef}>
             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isSettingsOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}>
               <Settings className="w-5 h-5" />
             </button>
             {isSettingsOpen && (
               <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                  <button onClick={() => { setLanguage(l => l === 'zh' ? 'en' : 'zh'); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Globe className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <span className="text-sm">UI Language</span>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{language === 'zh' ? 'CN' : 'EN'}</span>
                  </button>
                  <button onClick={() => { setShowApiKeyModal(true); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Key className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <span className="text-sm">API Key</span>
                    </div>
                  </button>
                  <button onClick={() => { setNotation(n => n === 'kana' ? 'romaji' : 'kana'); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Type className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <span className="text-sm">{t.notation}</span>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{notation === 'kana' ? t.kana : t.romaji}</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button onClick={() => { setVoiceEngine(v => v === 'system' ? 'ai' : 'system'); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group">
                     <div className="flex items-center gap-3 text-slate-700">
                       <Zap className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                       <span className="text-sm">{t.voiceEngine}</span>
                     </div>
                     <span className={`text-xs font-bold px-2 py-1 rounded ${voiceEngine === 'ai' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{voiceEngine === 'system' ? t.engineSystem : t.engineAi}</span>
                  </button>
               </div>
             )}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative w-full">
        {viewState === ViewState.HOME && (
          <Home 
            onScenarioSelect={handleScenarioSelect} 
            onViewHistory={() => setViewState(ViewState.HISTORY)} 
            language={language} 
            targetLanguage={targetLanguage}
            onTargetLanguageChange={handleTargetLanguageChange}
          />
        )}
        {viewState === ViewState.GENERATING && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-200 opacity-40 rounded-full blur-xl animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
            </div>
            <div className="mt-8 h-16 flex flex-col items-center">
               <h2 className="text-2xl font-bold text-slate-800 animate-in fade-in duration-500">{t.loadingSteps[loadingStep]}</h2>
            </div>
            <p className="mt-6 text-slate-500 max-w-md">
              <span className="font-semibold text-indigo-600 block mb-1 text-lg">"{loadingScenarioName}"</span>
              <span className="text-sm opacity-80">{t.constructingDesc}</span>
            </p>
          </div>
        )}
        {viewState === ViewState.STUDY && currentContent && (
          <StudyView 
            content={currentContent} 
            versions={[]} 
            currentVersionIndex={0}
            onBack={handleBack} 
            language={language}
            savedItems={savedItems}
            onToggleSave={item => setSavedItems(prev => prev.some(i => i.id === item.id && i.type === item.type) ? prev.filter(i => !(i.id === item.id && i.type === item.type)) : [...prev, item])}
            onRegenerate={() => executeScenarioGeneration(currentScenarioId)}
            onSelectVersion={() => {}}
            onDeleteVersion={() => {}}
            notation={notation}
            voiceEngine={voiceEngine}
            isGeneratingDialogues={isGeneratingDialogues}
            onLoadMoreItems={type => generateMoreItems(currentContent.scenarioName, targetLanguage, type, currentContent[type === 'vocab' ? 'vocabulary' : 'expressions'].map((i:any) => i.term || i.phrase)).then(items => setCurrentContent(prev => prev ? ({ ...prev, [type === 'vocab' ? 'vocabulary' : 'expressions']: [...prev[type === 'vocab' ? 'vocabulary' : 'expressions'], ...items] }) : null))}
            onRetrySection={type => regenerateSection(currentContent.scenarioName, targetLanguage, type).then(items => setCurrentContent(prev => prev ? ({ ...prev, [type === 'vocab' ? 'vocabulary' : 'expressions']: items }) : null))}
            onRetryScene={idx => regenerateSingleDialogue(currentContent.scenarioName, targetLanguage, idx, currentContent.vocabulary, currentContent.roles!, language).then(s => setCurrentContent(prev => prev ? ({ ...prev, dialogues: prev.dialogues.map((d, i) => i === idx ? s : d) }) : null))}
            onAddScene={p => generateCustomScene(currentContent.scenarioName, targetLanguage, p, currentContent.vocabulary, currentContent.roles!, language).then(s => setCurrentContent(prev => prev ? ({ ...prev, dialogues: [...prev.dialogues, s] }) : null))}
          />
        )}
        {viewState === ViewState.FAVORITES && (
          <FavoritesView 
            savedItems={savedItems} 
            onBack={() => setViewState(ViewState.HOME)}
            language={language}
            onToggleSave={item => setSavedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))}
            notation={notation}
            voiceEngine={voiceEngine}
            targetLanguage={targetLanguage}
          />
        )}
        {viewState === ViewState.HISTORY && (
          <ScenariosListView 
            history={scenarioHistory.filter(h => h.targetLanguage === targetLanguage)}
            onBack={() => setViewState(ViewState.HOME)}
            onSelect={item => {
              setCurrentScenarioId(item.id);
              setTargetLanguage(item.targetLanguage);
              setCurrentContent(item.versions[0]);
              setViewState(ViewState.STUDY);
            }}
            onDelete={(id, e) => {
              e.stopPropagation();
              setScenarioHistory(prev => prev.filter(h => h.id !== id));
            }}
            language={language}
          />
        )}
        {viewState === ViewState.ERROR && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.errorTitle}</h2>
            <p className="text-slate-500 max-w-md mb-8">{errorMsg || t.errorDesc}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setViewState(ViewState.HOME)}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                {t.goHome}
              </button>
              <button 
                onClick={() => {
                  if (!process.env.API_KEY && !localStorage.getItem('nihongo_api_key')) {
                    setShowApiKeyModal(true);
                  } else {
                    executeScenarioGeneration(loadingScenarioName);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
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
