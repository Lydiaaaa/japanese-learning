
import React, { useState, useRef } from 'react';
import { DialogueSection, Language, Notation } from '../types';
import { Play, Pause, Mic, Volume2, MessageSquare } from 'lucide-react';
import { playTTS } from '../services/geminiService';
import { UI_TEXT } from '../constants';

interface Props {
  sections: DialogueSection[];
  language: Language;
  notation: Notation;
}

// Helper to extract translation string based on language
const getTranslation = (trans: string | { en: string; zh: string }, lang: Language) => {
  if (typeof trans === 'string') return trans;
  return trans[lang] || trans.en;
};

export const DialoguePlayer: React.FC<Props> = ({ sections, language, notation }) => {
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [playingLine, setPlayingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordingLine, setRecordingLine] = useState<{sectionIdx: number, lineIdx: number} | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Record<string, string>>({}); // key: "secIdx-lineIdx" -> blobUrl

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const t = UI_TEXT[language];

  // Play AI Audio
  const handlePlayLine = async (sectionIdx: number, lineIdx: number, text: string, speaker: string) => {
    if (playingLine?.sectionIdx === sectionIdx && playingLine?.lineIdx === lineIdx) {
        return;
    }

    setPlayingLine({ sectionIdx, lineIdx });
    try {
      const voice = speaker === 'A' ? 'Puck' : 'Kore'; // Differentiate speakers
      await playTTS(text, voice);
    } catch (error) {
      console.error("Audio Playback Error", error);
    } finally {
      setPlayingLine(null);
    }
  };

  // Recording Logic
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

  if (!activeSection) return null;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar: Scene List */}
      <div className="md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
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

      {/* Main Content: Dialogue Stream */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-md">SCENE {activeSectionIdx + 1}</span>
            {activeSection.title}
          </h3>
        </div>

        {/* Lines Container */}
        <div className="p-4 md:p-6 space-y-6">
          {activeSection.lines.map((line, lIdx) => {
            const isPlaying = playingLine?.sectionIdx === activeSectionIdx && playingLine?.lineIdx === lIdx;
            const isRecording = recordingLine?.sectionIdx === activeSectionIdx && recordingLine?.lineIdx === lIdx;
            const hasRecording = !!recordedAudio[`${activeSectionIdx}-${lIdx}`];
            const isUser = line.speaker === 'A'; // A is "User" (Right), B is "Partner" (Left)
            const translation = getTranslation(line.translation, language);

            return (
              <div key={lIdx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* Speaker Label */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {line.roleName || `${t.speaker} ${line.speaker}`}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className={`p-4 md:p-5 rounded-2xl text-lg font-medium relative group transition-all duration-300 ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-100' 
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
                    } ${isPlaying ? 'ring-4 ring-indigo-100' : ''}`}>
                    
                    {/* Japanese Text */}
                    <div className="mb-1 leading-relaxed">{line.japanese}</div>
                    
                    {/* Pronunciation Line */}
                    <div className={`text-sm font-normal mb-3 pb-2 border-b border-dashed ${
                      isUser ? 'text-indigo-100 border-indigo-400/30' : 'text-indigo-600 border-slate-100'
                    }`}>
                        {notation === 'kana' ? line.kana : line.romaji}
                    </div>

                    {/* Translation */}
                    <p className={`text-sm font-normal ${isUser ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {translation}
                    </p>
                    
                    {/* Action Bar (Only visible on hover or active state) */}
                    <div className={`flex gap-2 mt-3 pt-1 justify-end opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {/* Listen */}
                        <button 
                          onClick={() => handlePlayLine(activeSectionIdx, lIdx, line.japanese, line.speaker)}
                          className={`p-1.5 rounded-full transition-all ${
                            isUser 
                              ? (isPlaying ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-indigo-100 hover:bg-indigo-400') 
                              : (isPlaying ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                          }`}
                          title={t.listen}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Record */}
                        {!isRecording ? (
                          <button 
                            onClick={() => startRecording(activeSectionIdx, lIdx)}
                            className={`p-1.5 rounded-full transition-all ${
                              hasRecording 
                                ? 'bg-emerald-500 text-white shadow-sm' 
                                : (isUser ? 'bg-indigo-500 text-indigo-100 hover:bg-indigo-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                            }`}
                            title={t.record}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={stopRecording}
                            className="p-1.5 rounded-full bg-red-500 text-white animate-pulse"
                            title={t.stop}
                          >
                            <div className="w-3.5 h-3.5 bg-white rounded-sm" />
                          </button>
                        )}

                        {/* Play Recording */}
                        {hasRecording && !isRecording && (
                          <button
                            onClick={() => playRecording(activeSectionIdx, lIdx)}
                            className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
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
