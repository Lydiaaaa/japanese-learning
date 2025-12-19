
import React, { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { StudyView } from './components/StudyView';
import { FavoritesView } from './components/FavoritesView';
import { ScenariosListView } from './components/ScenariosListView';
import { UserMenu } from './components/UserMenu';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ViewState, ScenarioContent, Language, SavedItem, ScenarioHistoryItem, Notation, VoiceEngine, DialogueSection } from './types';
import { generateVocabularyAndExpressions, generateDialoguesWithCallback, generateMoreItems, regenerateSection, regenerateSingleDialogue } from './services/geminiService';
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
  const [currentVersions, setCurrentVersions] = useState<ScenarioContent[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingScenarioName, setLoadingScenarioName] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isGeneratingDialogues, setIsGeneratingDialogues] = useState<boolean>(false);
  
  // Global State with intelligent default
  const [language, setLanguage] = useState<Language>(getInitialLanguage());
  const [notation, setNotation] = useState<Notation>('kana');
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('system');
  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [hasSetApiPreference, setHasSetApiPreference] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true); 

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Data State
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);

  const t = UI_TEXT[language];

  // Initialize Local Data
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nihongo_favorites');
      if (saved) setSavedItems(JSON.parse(saved));
      
      const history = localStorage.getItem('nihongo_scenarios');
      if (history) setScenarioHistory(JSON.parse(history));

      const savedNotation = localStorage.getItem('nihongo_notation');
      if (savedNotation === 'kana' || savedNotation === 'romaji') {
        setNotation(savedNotation);
      }
      
      const savedEngine = localStorage.getItem('nihongo_voice_engine');
      if (savedEngine === 'system' || savedEngine === 'ai') {
        setVoiceEngine(savedEngine);
      }

      // Load API Key Preference
      const storedKey = localStorage.getItem('nihongo_api_key');
      const storedPref = localStorage.getItem('nihongo_api_pref_set');
      
      if (storedKey) setCustomApiKey(storedKey);
      if (storedPref === 'true') setHasSetApiPreference(true);

    } catch (e) {
      console.error("Failed to load local storage", e);
    }
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
              const versions = [contentWithTime, ...updated[existingIndex].versions].slice(0, 5);
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
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      if (user?.uid === GUEST_ID && !currentUser) {
        setIsSyncing(false);
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        setIsSyncing(true);
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
  }, []); 

  // Persistence
  useEffect(() => {
    if (isSyncing) return; 

    if (user && user.uid !== GUEST_ID) {
      saveUserData(user.uid, { favorites: savedItems, history: scenarioHistory });
    } else {
      localStorage.setItem('nihongo_favorites', JSON.stringify(savedItems));
      localStorage.setItem('nihongo_scenarios', JSON.stringify(scenarioHistory));
    }
    
    localStorage.setItem('nihongo_language', language);
    localStorage.setItem('nihongo_notation', notation);
    localStorage.setItem('nihongo_voice_engine', voiceEngine);

  }, [savedItems, scenarioHistory, user, isSyncing, language, notation, voiceEngine]);

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
    // Safety check: remove undefined dialogues to prevent firestore crash
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

  const handleDeleteVersion = () => {
    if (!confirm(t.confirmDeleteVersion)) return;
    const updatedVersions = currentVersions.filter((_, idx) => idx !== currentVersionIndex);
    if (updatedVersions.length === 0) {
      setScenarioHistory(prev => prev.filter(item => item.id !== currentScenarioId));
      setViewState(ViewState.HOME);
      setCurrentContent(null);
      setCurrentVersions([]);
      setCurrentScenarioId('');
    } else {
      setScenarioHistory(prev => prev.map(item => {
        if (item.id === currentScenarioId) {
          return { ...item, versions: updatedVersions };
        }
        return item;
      }));
      setCurrentVersions(updatedVersions);
      setCurrentVersionIndex(0);
      setCurrentContent(updatedVersions[0]);
    }
  };

  // --- NEW: Handle Load More Items (Incremental Append) ---
  const handleLoadMoreItems = async (type: 'vocab' | 'expression') => {
    if (!currentContent) return;

    try {
      // 1. Gather existing terms for de-duplication
      let existingTerms: string[] = [];
      if (type === 'vocab') {
         existingTerms = currentContent.vocabulary.map(v => v.term);
      } else {
         existingTerms = currentContent.expressions.map(e => e.phrase);
      }

      // 2. Call Service
      const newItems = await generateMoreItems(
        currentContent.scenarioName,
        type,
        existingTerms,
        language,
        customApiKey || undefined
      );

      // 3. Update State if we got results
      if (newItems && newItems.length > 0) {
        const updatedContent = { ...currentContent };
        
        if (type === 'vocab') {
           updatedContent.vocabulary = [...updatedContent.vocabulary, ...newItems as any];
        } else {
           updatedContent.expressions = [...updatedContent.expressions, ...newItems as any];
        }

        // Update current view
        setCurrentContent(updatedContent);

        // Update history / versions
        setCurrentVersions(prev => {
          const updated = [...prev];
          updated[currentVersionIndex] = updatedContent;
          return updated;
        });

        setScenarioHistory(prev => {
           return prev.map(item => {
              if (item.id === currentContent.scenarioName) {
                 const newVersions = [...item.versions];
                 newVersions[currentVersionIndex] = updatedContent;
                 return { ...item, versions: newVersions };
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

  // --- NEW: Handle Retry Specific Section (Smart Regenerate in place) ---
  const handleRetrySection = async (type: 'vocab' | 'expression') => {
    if (!currentContent) return;

    try {
      // 1. Call Service to get standard list (repair mode)
      const repairedItems = await regenerateSection(
        currentContent.scenarioName,
        type,
        language,
        customApiKey || undefined
      );

      // 2. Update State in place (no new version)
      if (repairedItems && repairedItems.length > 0) {
        const updatedContent = { ...currentContent };
        
        if (type === 'vocab') {
           updatedContent.vocabulary = repairedItems as any;
        } else {
           updatedContent.expressions = repairedItems as any;
        }

        // Update current view
        setCurrentContent(updatedContent);

        // Update current version in the versions list
        setCurrentVersions(prev => {
          const updated = [...prev];
          updated[currentVersionIndex] = updatedContent;
          return updated;
        });

        // Update persistent history
        setScenarioHistory(prev => {
           return prev.map(item => {
              if (item.id === currentContent.scenarioName) {
                 const newVersions = [...item.versions];
                 newVersions[currentVersionIndex] = updatedContent;
                 return { ...item, versions: newVersions };
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

  // --- NEW: Handle Retry Specific Dialogue Scene (Smart Regenerate in place) ---
  const handleRetryDialogueScene = async (sceneIndex: number) => {
     if (!currentContent) return;
     
     // Derive roles (Basic fallback if not persisted, but usually persisted)
     const roles = { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
     // Ideally roles should be stored in content, but for now we default. 
     // Note: If you stored roles in content earlier, extract them here.

     try {
       const newScene = await regenerateSingleDialogue(
         currentContent.scenarioName,
         sceneIndex,
         currentContent.vocabulary,
         roles,
         language,
         customApiKey || undefined
       );

       if (newScene) {
          const updatedDialogues = [...currentContent.dialogues];
          updatedDialogues[sceneIndex] = newScene;

          const updatedContent = {
             ...currentContent,
             dialogues: updatedDialogues
          };
          
          // Update View
          setCurrentContent(updatedContent);

          // Update Versions
          setCurrentVersions(prev => {
             const updated = [...prev];
             updated[currentVersionIndex] = updatedContent;
             return updated;
          });

          // Update History
          setScenarioHistory(prev => {
             return prev.map(item => {
               if (item.id === currentContent.scenarioName) {
                 const newVersions = [...item.versions];
                 newVersions[currentVersionIndex] = updatedContent;
                 return { ...item, versions: newVersions };
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

  // --- API KEY & QUOTA LOGIC ---

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

    // If we were trying to load a scenario, resume it
    if (loadingScenarioName) {
      executeScenarioGeneration(loadingScenarioName, key || undefined);
    }
  };

  const checkQuotaAndGenerate = async (scenarioName: string) => {
    // 0. Check if user is admin (Whitelist)
    const isAdmin = checkIsAdmin(user);

    // 1. If user has Custom Key, skip quota check
    if (customApiKey) {
      executeScenarioGeneration(scenarioName, customApiKey);
      return;
    }

    // 2. If user hasn't set preference (First Time) AND is not admin, show modal.
    // Admins bypass this and default to system generation.
    if (!hasSetApiPreference && !isAdmin) {
      setShowApiKeyModal(true);
      return;
    }

    // 3. Check Quota
    // If admin, this returns { allowed: true, remaining: 9999 }
    const { allowed } = await checkDailyQuota(user);
    if (allowed) {
      executeScenarioGeneration(scenarioName);
    } else {
      setIsQuotaExceeded(true);
      setShowApiKeyModal(true);
    }
  };

  // STRATEGY: SPLIT GENERATION & INCREMENTAL RENDERING
  const executeScenarioGeneration = async (scenarioName: string, overrideKey?: string) => {
    setViewState(ViewState.GENERATING);
    setLoadingStep(0); 
    setIsGeneratingDialogues(false);
    
    // Adjusted timeline to match reality better (2s, 4.5s)
    const timeline = [2000, 4500];
    const timers: ReturnType<typeof setTimeout>[] = [];

    timeline.forEach((time, index) => {
        const timer = setTimeout(() => {
            setLoadingStep(index + 1);
        }, time);
        timers.push(timer);
    });

    try {
      // Step 1: Generate Vocab & Expressions (Fast)
      // Now also generates and returns the specific ROLES for this scenario
      const partialData = await generateVocabularyAndExpressions(scenarioName, language, overrideKey || customApiKey || undefined);
      
      const roles = partialData.roles || { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' };
      
      // If we used the free quota (no custom key), increment usage
      if (!overrideKey && !customApiKey) {
        incrementDailyQuota(user);
      }

      // Pre-fill placeholders for dialogues to prevent "undefined" holes in Firestore
      // Firestore crashes if an array contains undefined.
      // We initialize with 3 empty valid objects.
      const initialPlaceholders: DialogueSection[] = [
        { title: t.constructing, lines: [] },
        { title: t.constructing, lines: [] },
        { title: t.constructing, lines: [] }
      ];

      // Construct a valid ScenarioContent object
      const initialContent: ScenarioContent = {
         scenarioName: scenarioName,
         vocabulary: partialData.vocabulary || [],
         expressions: partialData.expressions || [],
         dialogues: initialPlaceholders, 
         timestamp: Date.now()
      };

      // Save Initial Version
      const savedVersion = saveScenarioToHistory(scenarioName, initialContent);
      
      setCurrentVersions(prev => {
         if (scenarioName === currentScenarioId) {
             return [savedVersion, ...prev];
         }
         return [savedVersion];
      });
      setCurrentVersionIndex(0);
      setCurrentContent(savedVersion);
      
      // ENTER STUDY VIEW IMMEDIATELY
      setViewState(ViewState.STUDY);
      
      // Step 2: Generate Dialogues with Incremental Callbacks
      setIsGeneratingDialogues(true);
      
      // Initialize our working array with the same placeholders
      const incomingDialogues: DialogueSection[] = [...initialPlaceholders];
      
      try {
         await generateDialoguesWithCallback(
            scenarioName, 
            initialContent.vocabulary, 
            roles, // Pass the determined roles to step 2
            (index, sceneData) => {
                // INCREMENTAL UPDATE:
                
                // Safety: Ensure sceneData is not undefined (from fallback logic)
                if (sceneData) {
                    incomingDialogues[index] = sceneData;
                }
                
                // Create a clean copy without undefined holes
                const safeDialogues = incomingDialogues.map(d => d || { title: "Error", lines: [] });
                
                // We create a new object to trigger React re-render
                const updatedContent = { 
                    ...initialContent, 
                    dialogues: safeDialogues 
                };

                // Update current view
                setCurrentContent(updatedContent);
                
                // Update history silently
                setScenarioHistory(prev => {
                    return prev.map(item => {
                        if (item.id === scenarioName) {
                            const newVersions = [...item.versions];
                            newVersions[0] = updatedContent;
                            return { ...item, versions: newVersions };
                        }
                        return item;
                    });
                });
                
                // Update versions list state
                setCurrentVersions(prev => {
                    const updated = [...prev];
                    updated[0] = updatedContent;
                    return updated;
                });
            },
            language, 
            overrideKey || customApiKey || undefined
         );

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

  // --- HANDLERS ---

  const handleScenarioSelect = async (scenarioName: string) => {
    setLoadingScenarioName(scenarioName);
    setCurrentScenarioId(scenarioName);
    setErrorMsg(null);

    const existingHistory = scenarioHistory.find(h => h.id === scenarioName);
    
    // If exists and has content, open it (no quota used)
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
      // Logic for new generation
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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)}
        onConfirm={handleApiKeyConfirm}
        language={language}
        isQuotaExceeded={isQuotaExceeded}
      />

      <nav className="bg-white border-b border-slate-100 px-4 md:px-6 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={() => setViewState(ViewState.HOME)}
        >
          {/* Logo Component with color support */}
          <div className="text-indigo-600 flex-shrink-0">
            <SaynarioLogo className="w-9 h-9" variant="jp" />
          </div>
          <span className="font-bold text-lg text-slate-800 hidden sm:inline">{t.navTitle}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Favorites Button */}
          <button
            onClick={() => setViewState(ViewState.FAVORITES)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-colors"
            title={t.favorites}
          >
            <Star className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline">{t.favorites}</span>
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          
          {/* User Menu */}
          <UserMenu 
            user={user} 
            isSyncing={isSyncing} 
            language={language} 
          />

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
             <button 
               onClick={() => setIsSettingsOpen(!isSettingsOpen)}
               className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isSettingsOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}
             >
               <Settings className="w-5 h-5" />
             </button>

             {isSettingsOpen && (
               <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                  {/* Language Toggle */}
                  <button 
                    onClick={toggleLanguage}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <Globe className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-sm">Language</span>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {language === 'zh' ? 'CN' : 'EN'}
                    </span>
                  </button>
                  
                  {/* Notation Toggle */}
                  <button 
                    onClick={toggleNotation}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <Type className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-sm">{t.notation}</span>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {notation === 'kana' ? t.kana : t.romaji}
                    </span>
                  </button>

                  <div className="h-px bg-slate-100 my-1"></div>

                  {/* Voice Engine Toggle */}
                  <button 
                    onClick={toggleVoiceEngine}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group"
                  >
                     <div className="flex items-center gap-3 text-slate-700">
                       <Zap className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                       <span className="text-sm">{t.voiceEngine}</span>
                     </div>
                     <div className="flex items-center gap-1">
                       {voiceEngine === 'ai' && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                       <span className={`text-xs font-bold px-2 py-1 rounded ${voiceEngine === 'ai' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                         {voiceEngine === 'system' ? t.engineSystem : t.engineAi}
                       </span>
                     </div>
                  </button>

                  <div className="h-px bg-slate-100 my-1"></div>

                  {/* API Key Config */}
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsQuotaExceeded(false);
                      setShowApiKeyModal(true);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group"
                  >
                     <div className="flex items-center gap-3 text-slate-700">
                       <Key className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                       <span className="text-sm">API Key</span>
                     </div>
                     <span className={`text-xs font-bold px-2 py-1 rounded ${customApiKey ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
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
              <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
            </div>
            
            {/* Dynamic Loading Text (Simplified for Step 1) */}
            <div className="mt-8 h-16 flex flex-col items-center">
               <h2 className="text-2xl font-bold text-slate-800 animate-in fade-in duration-500 key={loadingStep}">
                 {t.loadingSteps[Math.min(loadingStep, 2)]} 
               </h2>
               <div className="flex gap-2 mt-4">
                  {[0, 1, 2].map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === loadingStep ? 'w-6 bg-indigo-600' : idx < loadingStep ? 'w-2 bg-indigo-200' : 'w-2 bg-slate-200'
                      }`}
                    ></div>
                  ))}
               </div>
            </div>

            <p className="mt-6 text-slate-500 max-w-md">
              <span className="font-semibold text-indigo-600 block mb-1 text-lg">"{loadingScenarioName}"</span>
              <span className="text-sm opacity-80">{t.constructingDesc}</span>
            </p>
          </div>
        )}

        {viewState === ViewState.LOADING_SHARE && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-800">{t.loadingShare}</h2>
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
          />
        )}

        {viewState === ViewState.ERROR && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 overflow-y-auto">
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
