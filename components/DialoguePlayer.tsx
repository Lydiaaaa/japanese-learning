import React, { useState, useRef, useEffect } from 'react';
import { DialogueSection, Language, Notation, VoiceEngine, TargetLanguage } from '../types';
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
  targetLanguage?: TargetLanguage;
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
    isGenerating,
    targetLanguage = 'ja'
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

  useEffect(() => {
     if (sections && sections.length > 0) {
         // Logic for new sections
     }
  }, [sections.length]);

  const handlePlayLine = async (sectionIdx: number, lineIdx: number, text: string, speaker: string) => {
    if (playingLine?.sectionIdx === sectionIdx && playingLine?.lineIdx === lineIdx) {
        return;
    }

    setPlayingLine({ sectionIdx, lineIdx });
    try {
      const voice = speaker === 'A' ? 'Puck' : 'Kore';
      const customKey = localStorage.getItem('nihongo_api_key') || undefined;
      await playTTS(text, voice, voiceEngine as VoiceEngine, customKey, targetLanguage as TargetLanguage);
    } catch (error) {
      console.error("Audio Playback Error", error);
    } finally {
      setTimeout(() => setPlayingLine(null), 300);
    }
  };

  const handleDownloadAudio = async () => {
    const section = sections[activeSectionIdx];
    if (!section || !section.lines || !Array.isArray(section.lines) || isDownloadingAudio) return;

    setIsDownloadingAudio(true);
    setDownloadProgress('0%');
    
    try {
        const linesToProcess = section.lines.map(line => ({
            text: line.japanese,
            speaker: line.speaker
        }));
        
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

  const hasAnyContent = sections && sections.some(s => !!s);
  
  if (!hasAnyContent && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-black border-dashed text-slate-400 p-8 shadow-neo">
        <p className="mb-4 font-bold text-black">No dialogues available</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-black shadow-neo-sm rounded-lg text-sm font-bold text-black hover:bg-pastel-yellow transition-all hover:shadow-none"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        )}
      </div>
    );
  }

  const activeSection = sections[activeSectionIdx];
  const isSectionLoading = 
    !activeSection || 
    retryingSceneIdx === activeSectionIdx || 
    (isGenerating && (!activeSection.lines || activeSection.lines.length === 0));

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full items-start">
      {/* Sidebar Navigation */}
      <div className="md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar md:sticky md:top-6 self-start z-10 p-1">
        {sections.map((sec, idx) => {
          const isActive = idx === activeSectionIdx && !isAddingSceneMode;
          const isLoaded = sec && sec.lines && sec.lines.length > 0;
          const isProcessing = isGenerating && (!sec || !sec.lines || sec.lines.length === 0);
          
          return (
            // Sidebar buttons: rounded-xl -> rounded-lg
            <button
              key={idx}
              disabled={!isLoaded && !isProcessing && idx !== activeSectionIdx} 
              onClick={() => { setActiveSectionIdx(idx); setIsAddingSceneMode(false); }}
              className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all relative overflow-hidden ${
                isActive 
                  ? 'bg-black border-black text-white' 
                  : 'bg-white border-black text-slate-600 hover:bg-pastel-yellow'
              } ${!isLoaded && !isActive && !isProcessing ? 'opacity-50 cursor-not-allowed border-dashed' : ''}`}
            >
              {isProcessing && (
                 <div className="absolute inset-0 bg-slate-200/30 animate-pulse"></div>
              )}

              <div className={`p-2 rounded-md border-2 border-black relative z-10 ${isActive ? 'bg-white text-black' : 'bg-slate-100 text-slate-400'}`}>
                {isLoaded ? <MessageSquare className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className={`text-[10px] font-black uppercase mb-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                  {idx < 3 ? `${t.scene} ${idx + 1}` : (language === 'zh' ? `自定义 ${idx - 2}` : `Custom ${idx - 2}`)}
                </div>
                <div className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
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
                className={`flex-shrink-0 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all ${
                    isAddingSceneMode 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-slate-300 text-slate-400 hover:border-black hover:text-black hover:bg-white'
                }`}
            >
                {isCreatingScene ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="font-bold text-sm">{language === 'zh' ? '自定义场景' : 'Add Scene'}</span>
            </button>
        )}
      </div>

      {/* Main Content Area: rounded-2xl -> rounded-xl */}
      <div ref={contentTopRef} className="flex-1 bg-white rounded-xl border-2 border-black flex flex-col min-h-[500px] w-full relative">
        
        {isAddingSceneMode ? (
            // New Scene Creation Form
            <div className="flex flex-col items-center justify-center h-full p-8 text-center flex-1 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-full max-w-md">
                    <div className="bg-pastel-purple p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border-2 border-black shadow-neo-sm">
                        <PenTool className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-xl font-black text-black mb-2">
                        {language === 'zh' ? '你想在这个场景下聊什么？' : 'What specific conversation do you want?'}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 font-medium">
                        {language === 'zh' 
                            ? '例如：“询问有没有靠窗的位置”、“结账时发现钱不够了”' 
                            : 'E.g., "Asking for a window seat", "Realizing I forgot my wallet"'}
                    </p>
                    
                    <form onSubmit={handleCreateScene}>
                        <textarea
                            value={newScenePrompt}
                            onChange={(e) => setNewScenePrompt(e.target.value)}
                            placeholder={language === 'zh' ? '输入对话主题...' : 'Describe the conversation...'}
                            className="w-full p-4 rounded-lg border-2 border-black bg-white focus:bg-white focus:ring-0 focus:shadow-neo-sm outline-none transition-all min-h-[120px] resize-none mb-4 text-black font-medium"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAddingSceneMode(false)}
                                className="flex-1 py-3 rounded-lg border-2 border-black text-black font-bold hover:bg-slate-50 transition-colors"
                            >
                                {language === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={!newScenePrompt.trim() || isCreatingScene}
                                className="flex-1 py-3 rounded-lg bg-black border-2 border-black text-white font-bold hover:bg-slate-800 transition-colors shadow-neo-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-pastel-green rounded-full blur-xl opacity-60 animate-pulse"></div>
                 <div className="relative bg-white p-6 rounded-full shadow-neo border-2 border-black">
                    <PenTool className="w-10 h-10 text-black animate-bounce" style={{ animationDuration: '3s' }} />
                 </div>
              </div>
              <h3 className="text-2xl font-black text-black">{t.writingScene}</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-sm font-medium">
                 {t.writingDesc}
              </p>
           </div>
        ) : (
           // Loaded Content
           <>
            <div className="p-4 md:p-6 border-b-2 border-black flex items-center justify-between bg-slate-50 rounded-t-lg">
              <h3 className="font-bold text-lg text-black flex items-center gap-3">
                <span className="bg-black text-white text-xs px-2 py-1 rounded-md uppercase font-black tracking-wide">
                    {activeSectionIdx < 3 ? `${t.scene} ${activeSectionIdx + 1}` : (language === 'zh' ? `自定义` : `Custom`)}
                </span>
                <span className="font-serif text-xl">{activeSection.title}</span>
              </h3>
              <button 
                 onClick={handleDownloadAudio}
                 disabled={isDownloadingAudio || !activeSection.lines || activeSection.lines.length === 0}
                 className="flex items-center gap-2 text-xs font-bold bg-white text-black hover:bg-pastel-blue px-3 py-1.5 rounded-lg border-2 border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                 {isDownloadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5" />}
                 {isDownloadingAudio ? (downloadProgress || t.generatingAudio) : t.downloadAudio}
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6 bg-white rounded-b-lg">
              {activeSection.lines && Array.isArray(activeSection.lines) && activeSection.lines.length > 0 ? (
                  activeSection.lines.map((line, lIdx) => {
                    const isPlaying = playingLine?.sectionIdx === activeSectionIdx && playingLine?.lineIdx === lIdx;
                    const isRecording = recordingLine?.sectionIdx === activeSectionIdx && recordingLine?.lineIdx === lIdx;
                    const hasRecording = !!recordedAudio[`${activeSectionIdx}-${lIdx}`];
                    const isUser = line.speaker === 'A'; 
                    const translation = getTranslation(line.translation, language);

                    let script = "";
                    if (targetLanguage === 'ja') {
                        script = notation === 'kana' ? line.kana : line.romaji;
                    } else if (targetLanguage === 'zh' || targetLanguage === 'ko') {
                        script = line.romaji || line.kana;
                    } 

                    return (
                      <div key={lIdx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                          
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              {line.roleName || `${t.speaker} ${line.speaker}`}
                            </span>
                          </div>

                          {/* Dialogue Bubble: rounded-2xl -> rounded-xl */}
                          <div className={`p-5 rounded-xl text-lg font-medium relative group transition-all duration-300 border-2 ${
                              isUser 
                                ? 'bg-pastel-green border-black text-black rounded-tr-none' 
                                : 'bg-white border-black text-black rounded-tl-none' 
                            } ${isPlaying ? 'ring-2 ring-black' : ''}`}>
                            
                            <div className="mb-1 leading-relaxed font-bold">{line.japanese}</div>
                            
                            {script && (
                                <div className={`text-sm font-bold mb-3 pb-2 border-b-2 border-dashed ${
                                isUser ? 'text-black border-black/20' : 'text-indigo-600 border-slate-200'
                                }`}>
                                    {script}
                                </div>
                            )}

                            <p className={`text-sm font-medium ${isUser ? 'text-black/70' : 'text-slate-500'}`}>
                              {translation}
                            </p>
                            
                            <div className={`flex gap-2 mt-3 pt-2 justify-end opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button 
                                  onClick={() => handlePlayLine(activeSectionIdx, lIdx, line.japanese, line.speaker)}
                                  className={`p-2 rounded-full transition-all border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[1px] active:translate-x-[1px] ${
                                    isPlaying ? 'bg-black text-white' : 'bg-white text-black hover:bg-pastel-blue'
                                  }`}
                                  title={t.listen}
                                >
                                  {isPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                                </button>

                                {!isRecording ? (
                                  <button 
                                    onClick={() => startRecording(activeSectionIdx, lIdx)}
                                    className={`p-2 rounded-full transition-all border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[1px] active:translate-x-[1px] ${
                                      hasRecording ? 'bg-pastel-green text-black' : 'bg-white text-black hover:bg-pastel-pink'
                                    }`}
                                    title={t.record}
                                  >
                                    <Mic className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={stopRecording}
                                    className="p-2 rounded-full bg-red-500 text-white animate-pulse border-2 border-black shadow-sm"
                                    title={t.stop}
                                  >
                                    <div className="w-3.5 h-3.5 bg-white rounded-sm" />
                                  </button>
                                )}

                                {hasRecording && !isRecording && (
                                  <button
                                    onClick={() => playRecording(activeSectionIdx, lIdx)}
                                    className="p-2 rounded-full bg-white text-green-600 border-2 border-green-600 hover:bg-green-50 shadow-sm"
                                    title={t.playMy}
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="p-3 bg-white rounded-full mb-3 shadow-sm border border-slate-200">
                      <MessageSquare className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="mb-2 font-bold text-slate-600">{t.contentUnavailable}</p>
                    <p className="text-xs max-w-xs mx-auto opacity-70 mb-6 text-center">{t.incompleteResponse}</p>
                    {(onRetry || onRetryScene) && (
                        <button 
                          onClick={handleRetryClick}
                          disabled={retryingSceneIdx !== null}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-black shadow-neo-sm rounded-lg text-sm font-bold text-black hover:bg-pastel-yellow transition-all disabled:opacity-50 hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
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