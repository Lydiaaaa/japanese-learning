
import React, { useState, useRef } from 'react';
import { DialogueSection, Language, Notation } from '../types';
import { Play, Pause, Mic, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { playTTS } from '../services/geminiService';
import { UI_TEXT } from '../constants';

interface Props {
  sections: DialogueSection[];
  language: Language;
  notation: Notation;
}

export const DialoguePlayer: React.FC<Props> = ({ sections, language, notation }) => {
  const [activeSection, setActiveSection] = useState<number>(0);
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

  return (
    <div className="space-y-4">
      
      {sections.map((section, sIdx) => {
        const isOpen = activeSection === sIdx;
        return (
          <div key={sIdx} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <button 
              onClick={() => setActiveSection(isOpen ? -1 : sIdx)}
              className="w-full p-4 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-bold text-slate-700">{section.title}</h3>
              {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
            </button>
            
            {isOpen && (
              <div className="p-4 space-y-6 bg-white">
                {section.lines.map((line, lIdx) => {
                  const isPlaying = playingLine?.sectionIdx === sIdx && playingLine?.lineIdx === lIdx;
                  const isRecording = recordingLine?.sectionIdx === sIdx && recordingLine?.lineIdx === lIdx;
                  const hasRecording = !!recordedAudio[`${sIdx}-${lIdx}`];
                  const isUser = line.speaker === 'A'; // Let's assume A is User for styling

                  return (
                    <div key={lIdx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-xs font-bold text-slate-400 uppercase">{line.roleName || `${t.speaker} ${line.speaker}`}</span>
                        </div>

                        <div className={`p-4 rounded-2xl text-lg font-medium leading-relaxed relative group transition-all ${
                           isUser ? 'bg-indigo-50 text-slate-800 rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        } ${isPlaying ? 'ring-2 ring-indigo-400 shadow-md' : ''}`}>
                          
                          {/* Japanese Text */}
                          <div className="mb-1">{line.japanese}</div>
                          
                          {/* Pronunciation Line (Added) */}
                          <div className="text-sm font-normal text-indigo-600 mb-2 border-b border-black/5 pb-2">
                             {notation === 'kana' ? line.kana : line.romaji}
                          </div>

                          {/* Translation */}
                          <p className="text-sm font-normal text-slate-500">{line.translation}</p>
                          
                          {/* Action Bar Overlay */}
                          <div className="flex gap-2 mt-3 justify-end">
                             {/* Listen */}
                             <button 
                                onClick={() => handlePlayLine(sIdx, lIdx, line.japanese, line.speaker)}
                                className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-indigo-100'}`}
                                title={t.listen}
                             >
                               {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                             </button>

                             {/* Record / Shadowing */}
                             {!isRecording ? (
                               <button 
                                  onClick={() => startRecording(sIdx, lIdx)}
                                  className={`p-2 rounded-full transition-all ${hasRecording ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-500'}`}
                                  title={t.record}
                               >
                                 <Mic className="w-4 h-4" />
                               </button>
                             ) : (
                               <button 
                                  onClick={stopRecording}
                                  className="p-2 rounded-full bg-red-500 text-white animate-pulse"
                                  title={t.stop}
                               >
                                 <div className="w-4 h-4 bg-white rounded-sm" />
                               </button>
                             )}

                             {/* Playback Recording */}
                             {hasRecording && !isRecording && (
                               <button
                                  onClick={() => playRecording(sIdx, lIdx)}
                                  className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                                  title={t.playMy}
                               >
                                 <Play className="w-4 h-4" />
                               </button>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
