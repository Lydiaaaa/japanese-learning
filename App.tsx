import React, { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { StudyView } from './components/StudyView';
import { FavoritesView } from './components/FavoritesView';
import { ScenariosListView } from './components/ScenariosListView';
import { UserMenu } from './components/UserMenu';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ViewState, ScenarioContent, Language, TargetLanguage, SavedItem, ScenarioHistoryItem, Notation, VoiceEngine, DialogueSection } from './types';
import { generateVocabularyAndExpressions, generateDialoguesWithCallback, generateMoreItems, regenerateSection, regenerateSingleDialogue, generateCustomScene } from './services/geminiService';
import { subscribeToAuth, syncUserData, saveUserData, GUEST_ID, getSharedScenario, User, checkDailyQuota, incrementDailyQuota, checkIsAdmin } from './services/firebase';
import { Loader2, AlertCircle, RefreshCw, Globe, Star, Settings, Type, Zap, Key } from 'lucide-react';
import { UI_TEXT } from './constants';
import { SaynarioLogo } from './components/Logo';

// Helper to detect initial language
const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('nihongo_language');
  if (saved === 'zh' || saved === 'en') return saved as Language;
  
  const sysLang = navigator.language || 'en';
  // Check for zh-CN, zh-TW, zh-HK, etc.
  return sysLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<ScenarioContent | null>(null);
  // We keep currentVersions for internal logic compatibility with the single-version model
  const [currentVersions, setCurrentVersions] = useState<ScenarioContent[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingScenarioName, setLoadingScenarioName] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isGeneratingDialogues, setIsGeneratingDialogues] = useState<boolean>(false);
  
  // Global State with intelligent default
  const [language, setLanguage] = useState<Language>(getInitialLanguage());
  // New State: Target Learning Language
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('ja');

  const [notation, setNotation] = useState<Notation>('kana');
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('system');
  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [hasSetApiPreference, setHasSetApiPreference] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  // FIX: Start as FALSE. This ensures that even if auth hangs or is blocked, 
  // we default to "Guest Mode" immediately so local saving works.
  const [isSyncing, setIsSyncing] = useState(false); 

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Data State
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);
  
  // DATA PROTECTION STATE
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);
  
  // Refs to hold latest state for async callbacks to prevent stale closures
  const savedItemsRef = useRef(savedItems);
  const historyRef = useRef(scenarioHistory);

  const t = UI_TEXT[language];

  // Keep refs in sync with state
  useEffect(() => {
    savedItemsRef.current = savedItems;
  }, [savedItems]);

  useEffect(() => {
    historyRef.current = scenarioHistory;
  }, [scenarioHistory]);

  // Initialize Local Data - SAFELY
  useEffect(() => {
    const loadData = () => {
      try {
        const saved = localStorage.getItem('nihongo_favorites');
        if (saved) {
           const parsed = JSON.parse(saved);
           if (Array.isArray(parsed)) {
             setSavedItems(parsed);
             savedItemsRef.current = parsed; 
           }
        }
        
        const history = localStorage.getItem('nihongo_scenarios');
        if (history) {
           const parsed = JSON.parse(history);
           if (Array.isArray(parsed)) {
             setScenarioHistory(parsed);
             historyRef.current = parsed; 
           }
        }

        const savedNotation = localStorage.getItem('nihongo_notation');
        if (savedNotation === 'kana' || savedNotation === 'romaji') {
          setNotation(savedNotation);
        }
        
        const savedEngine = localStorage.getItem('nihongo_voice_engine');
        if (savedEngine === 'system' || savedEngine === 'ai') {
          setVoiceEngine(savedEngine);
        }

        const savedTarget = localStorage.getItem('nihongo_target_language');
        if (savedTarget) {
            setTargetLanguage(savedTarget as TargetLanguage);
        }

        // Load API Key Preference
        const storedKey = localStorage.getItem('nihongo_api_key');
        const storedPref = localStorage.getItem('nihongo_api_pref_set');
        
        if (storedKey) setCustomApiKey(storedKey);
        if (storedPref === 'true') setHasSetApiPreference(true);

      } catch (e) {
        console.error("Failed to load local storage", e);
        // Do NOT wipe data on error, just proceed with defaults
      } finally {
        // CRITICAL: Signal that local data is loaded
        setIsLocalLoaded(true);
      }
    };

    loadData();
  }, []);

  // Click outside to close settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for Share URL on mount
  useEffect(() => {
    const checkShare = async () => {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('share');
      
      if (shareId) {
        setViewState(ViewState.LOADING_SHARE);
        const content = await getSharedScenario(shareId);
        
        if (content) {
          // Save to history automatically
          const timestamp = Date.now();
          const contentWithTime = { ...content, timestamp }; 
          
          setScenarioHistory(prev => {
            const existingIndex = prev.findIndex(item => item.id === content.scenarioName);
            if (existingIndex >= 0) {
              const updated = [...prev];
              // Overwrite with shared content as the latest version
              const versions = [contentWithTime, ...updated[existingIndex].versions].slice(0, 1);
              updated[existingIndex] = {
                ...updated[existingIndex],
                versions,
                lastAccessed: timestamp
              };
              return updated;
            } else {
              return [{
                id: content.scenarioName,
                name: content.scenarioName,
                versions: [contentWithTime],
                lastAccessed: timestamp
              }, ...prev];
            }
          });

          setCurrentScenarioId(content.scenarioName);
          setCurrentContent(contentWithTime);
          setCurrentVersions([contentWithTime]);
          setCurrentVersionIndex(0);
          setViewState(ViewState.STUDY);

          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setErrorMsg(t.shareError);
          setViewState(ViewState.ERROR);
        }
      }
    };
    
    checkShare();
  }, [t.shareError]);

  // Auth Subscription
  // IMPORTANT: Only subscribe AFTER local data is loaded
  useEffect(() => {
    if (!isLocalLoaded) return;

    const unsubscribe = subscribeToAuth(async (currentUser) => {
      // If user logs out or is null
      if (!currentUser) {
        setUser(null);
        // Ensure syncing is off so local persistence works
        setIsSyncing(false);
        return;
      }

      // User Logged In
      setUser(currentUser);
      setIsSyncing(true); // Temporarily block local persistence while merging
      
      // Merge Cloud + Local Data
      const syncedData = await syncUserData(currentUser.uid, {
        favorites: savedItemsRef.current,
        history: historyRef.current
      });
      
      if (syncedData) {
        setSavedItems(syncedData.favorites);
        setScenarioHistory(syncedData.history);
      }
      
      // Done syncing, resume standard persistence
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, [isLocalLoaded]); 

  // Persistence
  useEffect(() => {
    // CRITICAL GUARD: Never save if local storage hasn't finished loading yet OR if we are in the middle of a cloud sync.
    if (!isLocalLoaded || isSyncing) return; 

    if (user && user.uid !== GUEST_ID) {
      saveUserData(user.uid, { favorites: savedItems, history: scenarioHistory });
    } else {
      localStorage.setItem('nihongo_favorites', JSON.stringify(savedItems));
      localStorage.setItem('nihongo_scenarios', JSON.stringify(scenarioHistory));
    }
    
    localStorage.setItem('nihongo_language', language);
    localStorage.setItem('nihongo_notation', notation);
    localStorage.setItem('nihongo_voice_engine', voiceEngine);
    localStorage.setItem('nihongo_target_language', targetLanguage);

  }, [savedItems, scenarioHistory, user, isSyncing, language, notation, voiceEngine, targetLanguage, isLocalLoaded]);

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
    // Safety check: remove undefined dialogues
    const safeContent = {
        ...content,
        dialogues: content.dialogues.filter(Boolean)
    };
    
    const timestamp = Date.now();
    const contentWithTime = { ...safeContent, scenarioName: id, timestamp };
    
    setScenarioHistory(prev => {
      const existingIndex = prev.findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const versions = [contentWithTime]; 
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

  const handleDeleteVersion = () => {
    if (!confirm(t.confirmDeleteVersion)) return;
    setScenarioHistory(prev => prev.filter(item => item.id !== currentScenarioId));
    setViewState(ViewState.HOME);
    setCurrentContent(null);
    setCurrentVersions([]);
    setCurrentScenarioId('');
  };

  // ... (keeping other handlers same as they are logic only) ...
  const handleLoadMoreItems = async (type: 'vocab' | 'expression') => {
    if (!currentContent) return;
    const targetLang = currentContent.targetLanguage || 'ja';
    try {
      let existingTerms: string[] = [];
      if (type === 'vocab') {
         existingTerms = currentContent.vocabulary.map(v => v.term);
      } else {
         existingTerms = currentContent.expressions.map(e => e.phrase);
      }
      const newItems = await generateMoreItems(currentContent.scenarioName, type, existingTerms, language, targetLang, customApiKey || undefined);
      if (newItems && newItems.length > 0) {
        const updatedContent = { ...currentContent };
        if (type === 'vocab') {
           updatedContent.vocabulary = [...updatedContent.vocabulary, ...newItems as any];
        } else {
           updatedContent.expressions = [...updatedContent.expressions, ...newItems as any];
        }
        setCurrentContent(updatedContent);
        setCurrentVersions([updatedContent]);
        setScenarioHistory(prev => {
           return prev.map(item => {
              if (item.id === currentContent.scenarioName) {
                 return { ...item, versions: [updatedContent] };
              }
              return item;
           });
        });
      }
    } catch (e) {
      console.error("Failed to load more items", e);
      alert(t.errorDesc);
    }
  };

  const handleRetrySection = async (type: 'vocab' | 'expression') => {
    if (!currentContent) return;
    const targetLang = currentContent.targetLanguage || 'ja';
    try {
      const repairedItems = await regenerateSection(currentContent.scenarioName, type, language, targetLang, customApiKey || undefined);
      if (repairedItems && repairedItems.length > 0) {
        const updatedContent = { ...currentContent };
        if (type === 'vocab') {
           updatedContent.vocabulary = repairedItems as any;
        } else {
           updatedContent.expressions = repairedItems as any;
        }
        setCurrentContent(updatedContent);
        setCurrentVersions([updatedContent]);
        setScenarioHistory(prev => {
           return prev.map(item => {
              if (item.id === currentContent.scenarioName) {
                 return { ...item, versions: [updatedContent] };
              }
              return item;
           });
        });
      }
    } catch (e) {
      console.error("Failed to repair section", e);
      alert(t.errorDesc);
    }
  };

  const handleRetryDialogueScene = async (sceneIndex: number) => {
     if (!currentContent) return;
     const targetLang = currentContent.targetLanguage || 'ja';
     const roles = currentContent.roles || { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
     try {
       const newScene = await regenerateSingleDialogue(currentContent.scenarioName, sceneIndex, currentContent.vocabulary, roles, language, targetLang, customApiKey || undefined);
       if (newScene) {
          const updatedDialogues = [...currentContent.dialogues];
          updatedDialogues[sceneIndex] = newScene;
          const updatedContent = { ...currentContent, dialogues: updatedDialogues };
          setCurrentContent(updatedContent);
          setCurrentVersions([updatedContent]);
          setScenarioHistory(prev => {
             return prev.map(item => {
               if (item.id === currentContent.scenarioName) {
                 return { ...item, versions: [updatedContent] };
               }
               return item;
             });
          });
       }
     } catch (e) {
       console.error("Failed to regenerate scene", e);
       alert(t.errorDesc);
     }
  };

  const handleAddDialogueScene = async (prompt: string) => {
    if (!currentContent) return;
    const targetLang = currentContent.targetLanguage || 'ja';
    const roles = currentContent.roles || { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
    try {
        const newScene = await generateCustomScene(currentContent.scenarioName, prompt, currentContent.vocabulary, roles, language, targetLang, customApiKey || undefined);
        if (newScene) {
            const updatedDialogues = [...currentContent.dialogues, newScene];
            const updatedContent = { ...currentContent, dialogues: updatedDialogues };
            setCurrentContent(updatedContent);
            setCurrentVersions([updatedContent]);
            setScenarioHistory(prev => {
                return prev.map(item => {
                    if (item.id === currentContent.scenarioName) {
                        return { ...item, versions: [updatedContent] };
                    }
                    return item;
                });
            });
        }
    } catch (e) {
        console.error("Failed to add custom scene", e);
        alert(t.errorDesc);
    }
  };

  const handleApiKeyConfirm = (key: string | null) => {
    if (key) {
      setCustomApiKey(key);
      localStorage.setItem('nihongo_api_key', key);
    } else {
      setCustomApiKey(null);
      localStorage.removeItem('nihongo_api_key');
    }
    setHasSetApiPreference(true);
    localStorage.setItem('nihongo_api_pref_set', 'true');
    setShowApiKeyModal(false);
    setIsQuotaExceeded(false);
    if (loadingScenarioName) {
      executeScenarioGeneration(loadingScenarioName, key || undefined);
    }
  };

  const checkQuotaAndGenerate = async (scenarioName: string) => {
    const isAdmin = checkIsAdmin(user);
    if (customApiKey) {
      executeScenarioGeneration(scenarioName, customApiKey);
      return;
    }
    if (!hasSetApiPreference && !isAdmin) {
      setShowApiKeyModal(true);
      return;
    }
    const { allowed } = await checkDailyQuota(user);
    if (allowed) {
      executeScenarioGeneration(scenarioName);
    } else {
      setIsQuotaExceeded(true);
      setShowApiKeyModal(true);
    }
  };

  const executeScenarioGeneration = async (scenarioName: string, overrideKey?: string) => {
    setViewState(ViewState.GENERATING);
    setLoadingStep(0); 
    setIsGeneratingDialogues(false);
    
    const timeline = [2000, 4500];
    const timers: ReturnType<typeof setTimeout>[] = [];

    timeline.forEach((time, index) => {
        const timer = setTimeout(() => {
            setLoadingStep(index + 1);
        }, time);
        timers.push(timer);
    });

    try {
      const partialData = await generateVocabularyAndExpressions(scenarioName, language, targetLanguage, overrideKey || customApiKey || undefined);
      const roles = partialData.roles || { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
      
      if (!overrideKey && !customApiKey) {
        incrementDailyQuota(user);
      }

      const initialPlaceholders: DialogueSection[] = [
        { title: t.constructing, lines: [] },
        { title: t.constructing, lines: [] },
        { title: t.constructing, lines: [] }
      ];

      const initialContent: ScenarioContent = {
         scenarioName: scenarioName,
         targetLanguage: targetLanguage, 
         vocabulary: partialData.vocabulary || [],
         expressions: partialData.expressions || [],
         dialogues: initialPlaceholders, 
         roles: roles,
         timestamp: Date.now()
      };

      const savedVersion = saveScenarioToHistory(scenarioName, initialContent);
      setCurrentVersions([savedVersion]);
      setCurrentVersionIndex(0);
      setCurrentContent(savedVersion);
      setViewState(ViewState.STUDY);
      setIsGeneratingDialogues(true);
      
      const incomingDialogues: DialogueSection[] = [...initialPlaceholders];
      try {
         await generateDialoguesWithCallback(scenarioName, initialContent.vocabulary, roles, (index, sceneData) => {
                if (sceneData) {
                    incomingDialogues[index] = sceneData;
                }
                const safeDialogues = incomingDialogues.map(d => d || { title: "Error", lines: [] });
                const updatedContent = { ...initialContent, dialogues: safeDialogues };
                setCurrentContent(updatedContent);
                setScenarioHistory(prev => {
                    return prev.map(item => {
                        if (item.id === scenarioName) {
                            return { ...item, versions: [updatedContent] };
                        }
                        return item;
                    });
                });
                setCurrentVersions([updatedContent]);
            }, language, targetLanguage, overrideKey || customApiKey || undefined);
      } catch (bgError) {
         console.error("Background dialogue generation failed", bgError);
      } finally {
         setIsGeneratingDialogues(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.errorDesc);
      setViewState(ViewState.ERROR);
    } finally {
      timers.forEach(clearTimeout);
    }
  };

  const handleScenarioSelect = async (scenarioName: string) => {
    setLoadingScenarioName(scenarioName);
    setCurrentScenarioId(scenarioName);
    setErrorMsg(null);
    const existingHistory = scenarioHistory.find(h => h.id === scenarioName);
    if (existingHistory && existingHistory.versions.length > 0) {
      const latestVersion = existingHistory.versions[0];
      setCurrentVersions([latestVersion]); 
      setCurrentVersionIndex(0);
      setCurrentContent(latestVersion);
      setScenarioHistory(prev => prev.map(item => item.id === scenarioName ? { ...item, lastAccessed: Date.now() } : item));
      setViewState(ViewState.STUDY);
    } else {
      checkQuotaAndGenerate(scenarioName);
    }
  };

  const handleRegenerate = async () => {
    const scenarioIdToUse = currentScenarioId; 
    if (!scenarioIdToUse) return;
    setLoadingScenarioName(scenarioIdToUse);
    checkQuotaAndGenerate(scenarioIdToUse);
  };

  const handleVersionSelect = (index: number) => {
    if (index >= 0 && index < currentVersions.length) {
      setCurrentVersionIndex(index);
      setCurrentContent(currentVersions[index]);
    }
  };

  const openHistoryItem = (item: ScenarioHistoryItem) => {
    setCurrentScenarioId(item.id);
    const latestVersion = item.versions[0];
    setCurrentVersions([latestVersion]);
    setCurrentVersionIndex(0);
    setCurrentContent(latestVersion);
    setScenarioHistory(prev => prev.map(h => h.id === item.id ? { ...h, lastAccessed: Date.now() } : h));
    setViewState(ViewState.STUDY);
  };

  const handleBack = () => {
    setViewState(ViewState.HOME);
    setCurrentContent(null);
    setCurrentVersions([]);
    setCurrentScenarioId('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleRetry = () => {
    if (loadingScenarioName) {
      checkQuotaAndGenerate(loadingScenarioName);
    } else {
      setViewState(ViewState.HOME);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };
  
  const toggleNotation = () => {
    setNotation(prev => prev === 'kana' ? 'romaji' : 'kana');
  };

  const toggleVoiceEngine = () => {
    setVoiceEngine(prev => prev === 'system' ? 'ai' : 'system');
  };

  return (
    <div className="h-screen flex flex-col bg-pastel-bg text-slate-900 font-sans overflow-hidden">
      
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)}
        onConfirm={handleApiKeyConfirm}
        language={language}
        isQuotaExceeded={isQuotaExceeded}
      />

      <nav className="bg-white border-b-2 border-black px-4 md:px-6 py-4 flex justify-between items-center z-10 shadow-none flex-shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={() => setViewState(ViewState.HOME)}
        >
          {/* Logo Icon */}
          <div className="flex-shrink-0">
            <SaynarioLogo className="w-10 h-10" />
          </div>
          {/* Updated Brand Text: Kalnia Font, Capitalized S and N, Bigger */}
          <span className="font-display font-bold text-2xl text-black hidden sm:inline tracking-tight">SayNario</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState(ViewState.FAVORITES)}
            className="p-2 rounded-lg hover:bg-pastel-yellow border-2 border-transparent hover:border-black text-slate-800 flex items-center gap-1 transition-all"
            title={t.favorites}
          >
            <Star className="w-5 h-5" />
            <span className="text-sm font-bold hidden md:inline">{t.favorites}</span>
          </button>

          <div className="h-8 w-0.5 bg-black mx-1 opacity-10"></div>
          
          <UserMenu 
            user={user} 
            isSyncing={isSyncing} 
            language={language} 
          />

          <div className="relative" ref={settingsRef}>
             <button 
               onClick={() => setIsSettingsOpen(!isSettingsOpen)}
               className={`p-2 rounded-lg transition-all border-2 flex items-center gap-1 ${isSettingsOpen ? 'bg-black text-white border-black' : 'border-transparent hover:border-black hover:bg-white text-slate-800'}`}
             >
               <Settings className="w-5 h-5" />
             </button>

             {isSettingsOpen && (
               <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-neo border-2 border-black py-2 z-50 overflow-hidden">
                  <button 
                    onClick={toggleLanguage}
                    className="w-full text-left px-5 py-3 hover:bg-pastel-blue flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-800 font-bold">
                      <Globe className="w-4 h-4" />
                      <span className="text-sm">Language</span>
                    </div>
                    <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">
                      {language === 'zh' ? 'CN' : 'EN'}
                    </span>
                  </button>
                  
                  {targetLanguage === 'ja' && (
                    <button 
                      onClick={toggleNotation}
                      className="w-full text-left px-5 py-3 hover:bg-pastel-pink flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3 text-slate-800 font-bold">
                        <Type className="w-4 h-4" />
                        <span className="text-sm">{t.notation}</span>
                      </div>
                      <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">
                        {notation === 'kana' ? t.kana : t.romaji}
                      </span>
                    </button>
                  )}

                  <div className="h-0.5 bg-black w-full opacity-5"></div>

                  <button 
                    onClick={toggleVoiceEngine}
                    className="w-full text-left px-5 py-3 hover:bg-pastel-green flex items-center justify-between group transition-colors"
                  >
                     <div className="flex items-center gap-3 text-slate-800 font-bold">
                       <Zap className="w-4 h-4" />
                       <span className="text-sm">{t.voiceEngine}</span>
                     </div>
                     <div className="flex items-center gap-1">
                       {voiceEngine === 'ai' && <Star className="w-3 h-3 text-amber-500 fill-current" />}
                       <span className={`text-xs font-black px-2 py-1 rounded ${voiceEngine === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                         {voiceEngine === 'system' ? t.engineSystem : t.engineAi}
                       </span>
                     </div>
                  </button>

                  <div className="h-0.5 bg-black w-full opacity-5"></div>

                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsQuotaExceeded(false);
                      setShowApiKeyModal(true);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-pastel-yellow flex items-center justify-between group transition-colors"
                  >
                     <div className="flex items-center gap-3 text-slate-800 font-bold">
                       <Key className="w-4 h-4" />
                       <span className="text-sm">API Key</span>
                     </div>
                     <span className={`text-xs font-black px-2 py-1 rounded ${customApiKey ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                       {customApiKey ? 'Custom' : 'Free'}
                     </span>
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
            onTargetLanguageChange={setTargetLanguage}
          />
        )}

        {viewState === ViewState.FAVORITES && (
          <FavoritesView 
            savedItems={savedItems} 
            onBack={() => setViewState(ViewState.HOME)}
            language={language}
            onToggleSave={toggleSavedItem}
            notation={notation}
            voiceEngine={voiceEngine}
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
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-pastel-blue rounded-full blur-xl opacity-80 animate-pulse"></div>
              <div className="relative bg-white border-2 border-black rounded-full p-4 shadow-neo">
                 <Loader2 className="w-12 h-12 text-black animate-spin" />
              </div>
            </div>
            
            <div className="mt-10 h-24 flex flex-col items-center w-full max-w-md">
               <h2 className="text-3xl font-serif font-black text-black animate-in fade-in duration-500 key={loadingStep} mb-6">
                 {t.loadingSteps[Math.min(loadingStep, 2)]} 
               </h2>
               <div className="flex gap-3 w-full justify-center">
                  {[0, 1, 2].map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-4 rounded-full border-2 border-black transition-all duration-500 ${
                        idx === loadingStep ? 'w-16 bg-pastel-green' : idx < loadingStep ? 'w-4 bg-black' : 'w-4 bg-white'
                      }`}
                    ></div>
                  ))}
               </div>
            </div>

            <p className="mt-8 text-slate-600 max-w-md bg-white border-2 border-black p-4 rounded-xl shadow-sm">
              <span className="font-bold text-black block mb-1 text-lg">"{loadingScenarioName}"</span>
              <span className="text-sm">{t.constructingDesc}</span>
            </p>
          </div>
        )}

        {viewState === ViewState.LOADING_SHARE && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
            <Loader2 className="w-12 h-12 text-black animate-spin mb-4" />
            <h2 className="text-xl font-bold text-black">{t.loadingShare}</h2>
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
            onDeleteVersion={handleDeleteVersion}
            notation={notation}
            voiceEngine={voiceEngine}
            isGeneratingDialogues={isGeneratingDialogues}
            onLoadMoreItems={handleLoadMoreItems}
            onRetrySection={handleRetrySection}
            onRetryScene={handleRetryDialogueScene}
            onAddScene={handleAddDialogueScene}
          />
        )}

        {viewState === ViewState.ERROR && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
            <div className="p-6 bg-red-100 rounded-full mb-6 border-2 border-black shadow-neo">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-black mb-3">{t.errorTitle}</h2>
            <p className="text-slate-600 mb-8 max-w-sm font-medium">{errorMsg}</p>
            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                className="px-8 py-3 rounded-xl border-2 border-black text-black hover:bg-white bg-slate-100 font-bold shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {t.goHome}
              </button>
              <button 
                onClick={handleRetry}
                className="px-8 py-3 rounded-xl border-2 border-black bg-pastel-green text-black hover:bg-pastel-green/80 font-bold flex items-center gap-2 shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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