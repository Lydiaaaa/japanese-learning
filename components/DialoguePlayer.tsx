
import React, { useState, useRef, useEffect } from 'react';
import { DialogueSection, Language, Notation, VoiceEngine } from '../types';
import { Play, Pause, Mic, Volume2, MessageSquare, Download, Loader2, RefreshCw, PenTool, Plus } from 'lucide-react';
import { playTTS, generateDialogueAudioWithProgress } from '../services/geminiService';
import { UI_TEXT } from '../constants';

interface Props {
  sections: DialogueSection[];
  language: Language;
  notation: Notation;
  voiceEngine?: VoiceEngine;
  onRetry?: () => void;
  onRetryScene?: (index: number) => Promise<void>;
  onAddScene?: (prompt: string) => Promise<void>;
  isGenerating?: boolean;
}

const getTranslation = (trans: string | { en: string; zh: string } | undefined, lang: Language) => {
  if (!trans) return '';
  if (typeof trans === 'string') return trans;
  return trans[lang] || trans.en || '';
};

export const DialoguePlayer: React.FC<Props> = ({ 
    sections, 
    language, 
    notation, 
    voiceEngine = 'system', 
    onRetry, 
    onRetryScene,
    onAddScene,
    isGenerating 
}) => {
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [playingLine, setPlayingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordingLine, setRecordingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Record<string, string>>({}); 
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  
  // Custom Scene State
  const [isAddingSceneMode, setIsAddingSceneMode] = useState(false);
  const [newScenePrompt, setNewScenePrompt] = useState('');
  const [isCreatingScene, setIsCreatingScene] = useState(false);
  
  // Local loading state for retry actions
  const [retryingSceneIdx, setRetryingSceneIdx] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const contentTopRef = useRef<HTMLDivElement>(null);
  
  const t = UI_TEXT[language];
  const MAX_SCENES = 10;

  // Auto-scroll logic
  useEffect(() => {
    if (contentTopRef.current) {
        // Try to find the scrollable parent container in StudyView
        const scrollableParent = contentTopRef.current.closest('.overflow-y-auto');
        if (scrollableParent) {
            scrollableParent.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Fallback
            contentTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
  }, [activeSectionIdx, isAddingSceneMode]);

  // When sections length increases (new scene added), select the new scene
  useEffect(() => {
     if (sections && sections.length > 0) {
         // If we were adding a scene, and now sections count increased, select the last one
         // Note: We need a way to know if this is a NEW scene or just initial load.
         // A simple heuristic: if isCreatingScene becomes false and length > prevLength.
         // For simplicity, we just check if the last section is populated and we were in adding mode.
     }
  }, [sections.length]);

  const handlePlayLine = async (sectionIdx: number, lineIdx: number, text: string, speaker: string) => {
    if (playingLine?.sectionIdx === sectionIdx && playingLine?.lineIdx === lineIdx) {
        return;
    }

    setPlayingLine({ sectionIdx, lineIdx });
    try {
      const voice = speaker === 'A' ? 'Puck' : 'Kore';
      // Get API Key from localStorage for TTS if available
      const customKey = localStorage.getItem('nihongo_api_key') || undefined;
      await playTTS(text, voice, voiceEngine as VoiceEngine, customKey);
    } catch (error) {
      console.error("Audio Playback Error", error);
    } finally {
      setTimeout(() => setPlayingLine(null), 300);
    }
  };

  const handleDownloadAudio = async () => {
    const section = sections[activeSectionIdx];
    // Safeguard against missing lines
    if (!section || !section.lines || !Array.isArray(section.lines) || isDownloadingAudio) return;

    setIsDownloadingAudio(true);
    setDownloadProgress('0%');
    
    try {
        const linesToProcess = section.lines.map(line => ({
            text: line.japanese,
            speaker: line.speaker
        }));
        
        // Get API Key from localStorage for TTS if available
        const customKey = localStorage.getItem('nihongo_api_key') || undefined;

        const wavBlob = await generateDialogueAudioWithProgress(
          linesToProcess,
          (completed, total) => {
             const pct = Math.round((completed / total) * 100);
             setDownloadProgress(`${pct}%`);
          },
          customKey
        );
        
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(section.title || "Scene").replace(/\s+/g, '_')}_audio.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to generate audio file", error);
        alert("Audio generation failed. Please check your connection.");
    } finally {
        setIsDownloadingAudio(false);
        setDownloadProgress('');
    }
  };

  const handleRetryClick = async () => {
    if (onRetryScene) {
      setRetryingSceneIdx(activeSectionIdx);
      try {
        await onRetryScene(activeSectionIdx);
      } finally {
        setRetryingSceneIdx(null);
      }
    } else if (onRetry) {
      onRetry();
    }
  };

  const handleCreateScene = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newScenePrompt.trim() || !onAddScene) return;

      setIsCreatingScene(true);
      try {
          await onAddScene(newScenePrompt.trim());
          setNewScenePrompt('');
          setIsAddingSceneMode(false);
          // Select the new scene (it's the last one now)
          setActiveSectionIdx(sections.length); 
      } catch (err) {
          console.error(err);
      } finally {
          setIsCreatingScene(false);
      }
  };

  const startRecording = async (sectionIdx: number, lineIdx: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(prev => ({...prev, [`${sectionIdx}-${lineIdx}`]: audioUrl}));
        setRecordingLine(null);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingLine({ sectionIdx, lineIdx });
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to use the recording feature.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = (sectionIdx: number, lineIdx: number) => {
    const key = `${sectionIdx}-${lineIdx}`;
    const url = recordedAudio[key];
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  // Helper to check if ANY content exists
  const hasAnyContent = sections && sections.some(s => !!s);
  
  // If absolutely nothing exists and we are NOT generating, show empty state
  if (!hasAnyContent && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-slate-400 p-8">
        <p className="mb-4">No dialogues available</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        )}
      </div>
    );
  }

  const activeSection = sections[activeSectionIdx];
  
  // Determine if this specific section is loading.
  const isSectionLoading = 
    !activeSection || 
    retryingSceneIdx === activeSectionIdx || 
    (isGenerating && (!activeSection.lines || activeSection.lines.length === 0));

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full items-start">
      {/* Sidebar Navigation */}
      <div className="md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar md:sticky md:top-6 self-start z-10">
        {sections.map((sec, idx) => {
          const isActive = idx === activeSectionIdx && !isAddingSceneMode;
          const isLoaded = sec && sec.lines && sec.lines.length > 0;
          const isProcessing = isGenerating && (!sec || !sec.lines || sec.lines.length === 0);
          
          return (
            <button
              key={idx}
              disabled={!isLoaded && !isProcessing && idx !== activeSectionIdx} 
              onClick={() => { setActiveSectionIdx(idx); setIsAddingSceneMode(false); }}
              className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
              } ${!isLoaded && !isActive && !isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing && (
                 <div className="absolute inset-0 bg-slate-200/30 animate-pulse"></div>
              )}

              <div className={`p-2 rounded-lg relative z-10 ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {isLoaded ? <MessageSquare className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className={`text-xs font-bold uppercase mb-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {idx < 3 ? `${t.scene} ${idx + 1}` : (language === 'zh' ? `自定义 ${idx - 2}` : `Custom ${idx - 2}`)}
                </div>
                <div className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {sec ? sec.title : "..."}
                </div>
              </div>
            </button>
          );
        })}

        {/* Add Scene Button */}
        {onAddScene && sections.length < MAX_SCENES && !isGenerating && (
            <button
                onClick={() => setIsAddingSceneMode(true)}
                disabled={isCreatingScene}
                className={`flex-shrink-0 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all ${
                    isAddingSceneMode 
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-white'
                }`}
            >
                {isCreatingScene ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="font-bold text-sm">{language === 'zh' ? '自定义场景' : 'Add Scene'}</span>
            </button>
        )}
      </div>

      {/* Main Content Area */}
      <div ref={contentTopRef} className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px] w-full">
        
        {isAddingSceneMode ? (
            // New Scene Creation Form
            <div className="flex flex-col items-center justify-center h-full p-8 text-center flex-1 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-full max-w-md">
                    <div className="bg-indigo-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                        <PenTool className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {language === 'zh' ? '你想在这个场景下聊什么？' : 'What specific conversation do you want?'}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6">
                        {language === 'zh' 
                            ? '例如：“询问有没有靠窗的位置”、“结账时发现钱不够了”' 
                            : 'E.g., "Asking for a window seat", "Realizing I forgot my wallet"'}
                    </p>
                    
                    <form onSubmit={handleCreateScene}>
                        <textarea
                            value={newScenePrompt}
                            onChange={(e) => setNewScenePrompt(e.target.value)}
                            placeholder={language === 'zh' ? '输入对话主题...' : 'Describe the conversation...'}
                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all min-h-[120px] resize-none mb-4 text-slate-700"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAddingSceneMode(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                {language === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={!newScenePrompt.trim() || isCreatingScene}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreatingScene && <Loader2 className="w-4 h-4 animate-spin" />}
                                {language === 'zh' ? '生成对话' : 'Generate'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        ) : isSectionLoading ? (
           // Skeleton for Active Loading Section
           <div className="flex flex-col items-center justify-center h-full p-8 text-center flex-1 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-6">
                 <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-40 animate-pulse"></div>
                 <div className="relative bg-white p-4 rounded-full shadow-sm border border-indigo-100">
                    <PenTool className="w-8 h-8 text-indigo-500 animate-bounce" style={{ animationDuration: '3s' }} />
                 </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t.writingScene}</h3>
              <p className="text-slate-400 mt-2 max-w-sm text-sm">
                 {t.writingDesc}
              </p>
           </div>
        ) : (
           // Loaded Content
           <>
            <div className="p-4 md:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-md uppercase">
                    {activeSectionIdx < 3 ? `${t.scene} ${activeSectionIdx + 1}` : (language === 'zh' ? `自定义` : `Custom`)}
                </span>
                {activeSection.title}
              </h3>
              <button 
                 onClick={handleDownloadAudio}
                 // Disable if downloading OR lines are missing/empty
                 disabled={isDownloadingAudio || !activeSection.lines || activeSection.lines.length === 0}
                 className="flex items-center gap-2 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
              >
                 {isDownloadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5" />}
                 {isDownloadingAudio ? (downloadProgress || t.generatingAudio) : t.downloadAudio}
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Defensive Check: Ensure lines exist and are an array */}
              {activeSection.lines && Array.isArray(activeSection.lines) && activeSection.lines.length > 0 ? (
                  activeSection.lines.map((line, lIdx) => {
                    const isPlaying = playingLine?.sectionIdx === activeSectionIdx && playingLine?.lineIdx === lIdx;
                    const isRecording = recordingLine?.sectionIdx === activeSectionIdx && recordingLine?.lineIdx === lIdx;
                    const hasRecording = !!recordedAudio[`${activeSectionIdx}-${lIdx}`];
                    const isUser = line.speaker === 'A'; 
                    const translation = getTranslation(line.translation, language);

                    return (
                      <div key={lIdx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                          
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {line.roleName || `${t.speaker} ${line.speaker}`}
                            </span>
                          </div>

                          <div className={`p-4 md:p-5 rounded-2xl text-lg font-medium relative group transition-all duration-300 ${
                              isUser 
                                ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm' 
                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm' 
                            } ${isPlaying ? 'ring-4 ring-indigo-100' : ''}`}>
                            
                            <div className="mb-1 leading-relaxed">{line.japanese}</div>
                            
                            <div className={`text-sm font-normal mb-3 pb-2 border-b border-dashed ${
                              isUser ? 'text-indigo-600 border-indigo-200' : 'text-indigo-600 border-slate-100'
                            }`}>
                                {notation === 'kana' ? line.kana : line.romaji}
                            </div>

                            <p className={`text-sm font-normal text-slate-500`}>
                              {translation}
                            </p>
                            
                            <div className={`flex gap-2 mt-3 pt-1 justify-end opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button 
                                  onClick={() => handlePlayLine(activeSectionIdx, lIdx, line.japanese, line.speaker)}
                                  className={`p-1.5 rounded-full transition-all bg-white border border-slate-100 shadow-sm ${
                                    isPlaying ? 'text-indigo-600 ring-2 ring-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-200'
                                  }`}
                                  title={t.listen}
                                >
                                  {isPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                                </button>

                                {!isRecording ? (
                                  <button 
                                    onClick={() => startRecording(activeSectionIdx, lIdx)}
                                    className={`p-1.5 rounded-full transition-all bg-white border border-slate-100 shadow-sm ${
                                      hasRecording ? 'text-emerald-500 border-emerald-200' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-200'
                                    }`}
                                    title={t.record}
                                  >
                                    <Mic className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={stopRecording}
                                    className="p-1.5 rounded-full bg-red-500 text-white animate-pulse shadow-sm"
                                    title={t.stop}
                                  >
                                    <div className="w-3.5 h-3.5 bg-white rounded-sm" />
                                  </button>
                                )}

                                {hasRecording && !isRecording && (
                                  <button
                                    onClick={() => playRecording(activeSectionIdx, lIdx)}
                                    className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-sm"
                                    title={t.playMy}
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="p-3 bg-white rounded-full mb-3 shadow-sm">
                      <MessageSquare className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="mb-2 font-bold text-slate-600">{t.contentUnavailable}</p>
                    <p className="text-xs max-w-xs mx-auto opacity-70 mb-6 text-center">{t.incompleteResponse}</p>
                    {(onRetry || onRetryScene) && (
                        <button 
                          onClick={handleRetryClick}
                          disabled={retryingSceneIdx !== null}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-full text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                        >
                            {retryingSceneIdx !== null ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />}
                            {t.retrySection}
                        </button>
                    )}
                </div>
              )}
            </div>
           </>
        )}
      </div>
    </div>
  );
};
