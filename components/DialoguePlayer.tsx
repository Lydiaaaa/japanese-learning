
import React, { useState, useRef } from 'react';
import { DialogueSection, Language, Notation, VoiceEngine } from '../types';
import { Play, Pause, Mic, Volume2, MessageSquare, Download, Loader2, RefreshCw } from 'lucide-react';
import { playTTS, generateDialogueAudioWithProgress } from '../services/geminiService';
import { UI_TEXT } from '../constants';

interface Props {
  sections: DialogueSection[];
  language: Language;
  notation: Notation;
  voiceEngine?: VoiceEngine;
  onRetry?: () => void;
}

const getTranslation = (trans: string | { en: string; zh: string }, lang: Language) => {
  if (typeof trans === 'string') return trans;
  return trans[lang] || trans.en;
};

export const DialoguePlayer: React.FC<Props> = ({ sections, language, notation, voiceEngine = 'system', onRetry }) => {
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [playingLine, setPlayingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordingLine, setRecordingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Record<string, string>>({}); 
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const t = UI_TEXT[language];

  // Safety Guard for empty content
  if (!sections || sections.length === 0) {
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

  const handlePlayLine = async (sectionIdx: number, lineIdx: number, text: string, speaker: string) => {
    if (playingLine?.sectionIdx === sectionIdx && playingLine?.lineIdx === lineIdx) {
        return;
    }

    setPlayingLine({ sectionIdx, lineIdx });
    try {
      const voice = speaker === 'A' ? 'Puck' : 'Kore'; 
      await playTTS(text, voice, voiceEngine as VoiceEngine);
    } catch (error) {
      console.error("Audio Playback Error", error);
    } finally {
      setTimeout(() => setPlayingLine(null), 300);
    }
  };

  const handleDownloadAudio = async () => {
    const section = sections[activeSectionIdx];
    if (!section || isDownloadingAudio) return;

    setIsDownloadingAudio(true);
    setDownloadProgress('0%');
    
    try {
        const linesToProcess = section.lines.map(line => ({
            text: line.japanese,
            speaker: line.speaker
        }));

        const wavBlob = await generateDialogueAudioWithProgress(
          linesToProcess,
          (completed, total) => {
             const pct = Math.round((completed / total) * 100);
             setDownloadProgress(`${pct}%`);
          }
        );
        
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${section.title.replace(/\s+/g, '_')}_audio.wav`;
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

  const activeSection = sections[activeSectionIdx];

  // Double check to prevent crash if index is out of bounds
  if (!activeSection) return null;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full items-start">
      <div className="md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar md:sticky md:top-6 self-start z-10">
        {sections.map((sec, idx) => {
          const isActive = idx === activeSectionIdx;
          return (
            <button
              key={idx}
              onClick={() => setActiveSectionIdx(idx)}
              className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold uppercase mb-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                  Scene {idx + 1}
                </div>
                <div className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {sec.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px] w-full">
        <div className="p-4 md:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-md">SCENE {activeSectionIdx + 1}</span>
            {activeSection.title}
          </h3>
          <button 
             onClick={handleDownloadAudio}
             disabled={isDownloadingAudio}
             className="flex items-center gap-2 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
             {isDownloadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5" />}
             {isDownloadingAudio ? (downloadProgress || t.generatingAudio) : t.downloadAudio}
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {activeSection.lines.map((line, lIdx) => {
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
          })}
        </div>
      </div>
    </div>
  );
};
