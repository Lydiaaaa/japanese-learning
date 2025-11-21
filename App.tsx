import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { StudyView } from './components/StudyView';
import { FavoritesView } from './components/FavoritesView';
import { ScenariosListView } from './components/ScenariosListView';
import { UserMenu } from './components/UserMenu';
import { ViewState, ScenarioContent, Language, SavedItem, ScenarioHistoryItem } from './types';
import { generateScenarioContent } from './services/geminiService';
import { subscribeToAuth, syncUserData, saveUserData, GUEST_USER, GUEST_ID } from './services/firebase';
import { Loader2, AlertCircle, RefreshCw, Globe, Star } from 'lucide-react';
import { UI_TEXT } from './constants';
import { User } from 'firebase/auth';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<ScenarioContent | null>(null);
  const [currentVersions, setCurrentVersions] = useState<ScenarioContent[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingScenarioName, setLoadingScenarioName] = useState<string>('');
  
  // Global State
  const [language, setLanguage] = useState<Language>('zh');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true); // Start true to check auth status

  // Data State
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);

  const t = UI_TEXT[language];

  // Initialize Local Data on mount (before Auth is ready)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nihongo_favorites');
      if (saved) setSavedItems(JSON.parse(saved));
      
      const history = localStorage.getItem('nihongo_scenarios');
      if (history) setScenarioHistory(JSON.parse(history));
    } catch (e) {
      console.error("Failed to load local storage", e);
    }
  }, []);

  // Auth Subscription & Sync
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      // If we are already logged in as Guest, ignore null from auth listener (which implies logged out from firebase)
      if (user?.uid === GUEST_ID && !currentUser) {
        setIsSyncing(false);
        return;
      }

      setUser(currentUser);
      
      if (currentUser) {
        setIsSyncing(true);
        // Sync/Merge Local data with Cloud
        const syncedData = await syncUserData(currentUser.uid, {
          favorites: savedItems,
          history: scenarioHistory
        });
        
        if (syncedData) {
          setSavedItems(syncedData.favorites);
          setScenarioHistory(syncedData.history);
        }
        setIsSyncing(false);
      } else {
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []); // Note: Dependency array is empty to run only on mount

  // Persistence: Cloud if logged in, Local if not
  useEffect(() => {
    if (isSyncing) return; // Don't save while syncing initial load

    if (user && user.uid !== GUEST_ID) {
      saveUserData(user.uid, { favorites: savedItems, history: scenarioHistory });
    } else {
      localStorage.setItem('nihongo_favorites', JSON.stringify(savedItems));
      localStorage.setItem('nihongo_scenarios', JSON.stringify(scenarioHistory));
    }
  }, [savedItems, scenarioHistory, user, isSyncing]);

  const handleGuestLogin = () => {
    setUser(GUEST_USER);
    setIsSyncing(false);
  };

  const toggleSavedItem = (item: SavedItem) => {
    setSavedItems(prev => {
      const exists = prev.some(i => i.id === item.id && i.type === item.type);
      if (exists) {
        return prev.filter(i => !(i.id === item.id && i.type === item.type));
      }
      return [...prev, item];
    });
  };

  const saveScenarioToHistory = (id: string, content: ScenarioContent) => {
    const timestamp = Date.now();
    const contentWithTime = { ...content, scenarioName: id, timestamp };
    
    setScenarioHistory(prev => {
      const existingIndex = prev.findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const versions = [contentWithTime, ...updated[existingIndex].versions].slice(0, 5);
        updated[existingIndex] = {
          ...updated[existingIndex],
          versions,
          lastAccessed: timestamp
        };
        return updated;
      } else {
        return [{
          id: id,
          name: id,
          versions: [contentWithTime],
          lastAccessed: timestamp
        }, ...prev];
      }
    });
    
    return contentWithTime;
  };

  const deleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scenario history?')) {
      setScenarioHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleScenarioSelect = async (scenarioName: string) => {
    setLoadingScenarioName(scenarioName);
    setCurrentScenarioId(scenarioName);
    setErrorMsg(null);

    const existingHistory = scenarioHistory.find(h => h.id === scenarioName);
    
    if (existingHistory && existingHistory.versions.length > 0) {
      const latestVersion = existingHistory.versions[0];
      setCurrentVersions(existingHistory.versions);
      setCurrentVersionIndex(0);
      setCurrentContent(latestVersion);
      
      setScenarioHistory(prev => prev.map(item => 
        item.id === scenarioName ? { ...item, lastAccessed: Date.now() } : item
      ));
      
      setViewState(ViewState.STUDY);
    } else {
      setViewState(ViewState.GENERATING);
      try {
        const content = await generateScenarioContent(scenarioName, language);
        const savedVersion = saveScenarioToHistory(scenarioName, content);
        
        setCurrentVersions([savedVersion]);
        setCurrentVersionIndex(0);
        setCurrentContent(savedVersion);
        setViewState(ViewState.STUDY);
      } catch (err) {
        console.error(err);
        setErrorMsg(t.errorDesc);
        setViewState(ViewState.ERROR);
      }
    }
  };

  const handleRegenerate = async () => {
    const scenarioIdToUse = currentScenarioId; 
    if (!scenarioIdToUse) return;
    
    setViewState(ViewState.GENERATING);
    setLoadingScenarioName(scenarioIdToUse);
    
    try {
      const content = await generateScenarioContent(scenarioIdToUse, language);
      const savedVersion = saveScenarioToHistory(scenarioIdToUse, content);
      
      setCurrentVersions(prev => [savedVersion, ...prev]);
      setCurrentVersionIndex(0);
      setCurrentContent(savedVersion);
      
      setViewState(ViewState.STUDY);
    } catch (err) {
       console.error(err);
       setErrorMsg(t.errorDesc);
       setViewState(ViewState.ERROR);
    }
  };

  const handleVersionSelect = (index: number) => {
    if (index >= 0 && index < currentVersions.length) {
      setCurrentVersionIndex(index);
      setCurrentContent(currentVersions[index]);
    }
  };

  const openHistoryItem = (item: ScenarioHistoryItem) => {
    setCurrentScenarioId(item.id);
    setCurrentVersions(item.versions);
    setCurrentVersionIndex(0);
    setCurrentContent(item.versions[0]);
    
    setScenarioHistory(prev => prev.map(h => 
      h.id === item.id ? { ...h, lastAccessed: Date.now() } : h
    ));
    
    setViewState(ViewState.STUDY);
  };

  const handleBack = () => {
    setViewState(ViewState.HOME);
    setCurrentContent(null);
    setCurrentVersions([]);
    setCurrentScenarioId('');
  };

  const handleRetry = () => {
    if (loadingScenarioName) {
      handleScenarioSelect(loadingScenarioName);
    } else {
      setViewState(ViewState.HOME);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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

          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          
          <UserMenu 
            user={user} 
            isSyncing={isSyncing} 
            language={language} 
            onGuestLogin={handleGuestLogin}
          />
        </div>
      </nav>

      <main className="container mx-auto md:mt-6">
        {viewState === ViewState.HOME && (
          <Home 
            onScenarioSelect={handleScenarioSelect} 
            onViewHistory={() => setViewState(ViewState.HISTORY)}
            language={language} 
          />
        )}

        {viewState === ViewState.FAVORITES && (
          <FavoritesView 
            savedItems={savedItems} 
            onBack={() => setViewState(ViewState.HOME)}
            language={language}
            onToggleSave={toggleSavedItem}
          />
        )}

        {viewState === ViewState.HISTORY && (
          <ScenariosListView
            history={scenarioHistory}
            onBack={() => setViewState(ViewState.HOME)}
            onSelect={openHistoryItem}
            onDelete={deleteScenario}
            language={language}
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
              <span className="font-semibold text-indigo-600">"{loadingScenarioName}"</span>
            </p>
          </div>
        )}

        {viewState === ViewState.STUDY && currentContent && (
          <StudyView 
            content={currentContent} 
            versions={currentVersions}
            currentVersionIndex={currentVersionIndex}
            onBack={handleBack} 
            language={language}
            savedItems={savedItems}
            onToggleSave={toggleSavedItem}
            onRegenerate={handleRegenerate}
            onSelectVersion={handleVersionSelect}
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