'use client';
/**
 * PrepVista AI — Live Interview Session
 * Voice-based interview with AI orb, timer, transcript, and Web Speech API.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type State = 'INITIALIZING' | 'GREETING' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'PAUSED' | 'FINISHED';

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [state, setState] = useState<State>('INITIALIZING');
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [currentText, setCurrentText] = useState('');
  const [timer, setTimer] = useState(0);
  const [maxDuration, setMaxDuration] = useState(600);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(6);
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load session data
  useEffect(() => {
    const stored = sessionStorage.getItem('pv_session');
    if (!stored) { router.push('/dashboard'); return; }
    const session = JSON.parse(stored);
    setAccessToken(session.access_token);
    setMaxDuration(session.duration_seconds);
    setMaxTurns(session.max_turns);

    // Auto-start greeting
    getGreeting(session.access_token);
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t >= maxDuration) {
          handleFinish();
          return t;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [maxDuration]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const getGreeting = async (token: string) => {
    setState('GREETING');
    try {
      const result = await api.submitAnswer(sessionId, '', token);
      const aiText = result.text || 'Hello! Let\'s begin your interview.';
      addTranscript('assistant', aiText);
      speakText(aiText);
      setTurnCount(result.turn || 0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addTranscript = (role: string, text: string) => {
    setTranscript((prev) => [...prev, { role, text }]);
  };

  const speakText = (text: string) => {
    setState('SPEAKING');
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Try to find a good voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => startListening();
      speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => startListening(), 2000);
    }
  };

  const startListening = () => {
    setState('LISTENING');
    setCurrentText('');

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setCurrentText(finalTranscript + interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') console.error('Speech error:', e.error);
    };

    recognition.start();
  };

  const stopListeningAndSubmit = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const userText = currentText.trim();
    if (!userText) return;

    addTranscript('user', userText);
    setCurrentText('');
    setState('PROCESSING');

    try {
      const result = await api.submitAnswer(sessionId, userText, accessToken);

      if (result.action === 'error') {
        setError(result.detail);
        return;
      }

      setTurnCount(result.turn || turnCount + 1);

      if (result.action === 'finish' || result.action === 'finish_after_this') {
        if (result.text) {
          addTranscript('assistant', result.text);
          speakText(result.text);
          // After speaking, finish
          setTimeout(() => handleFinish(), 3000);
        } else {
          handleFinish();
        }
        return;
      }

      const aiText = result.text || 'Could you tell me more?';
      addTranscript('assistant', aiText);
      speakText(aiText);
    } catch (err: any) {
      setError(err.message);
      startListening();
    }
  };

  const handleFinish = async () => {
    setState('FINISHED');
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    speechSynthesis.cancel();

    try {
      const result = await api.finishInterview(sessionId, accessToken, timer);
      // Store result and navigate to report
      sessionStorage.setItem('pv_result', JSON.stringify(result));
      router.push(`/interview/${sessionId}/report`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const orbClass = state === 'SPEAKING' ? 'orb speaking' : state === 'LISTENING' ? 'orb listening' : 'orb';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-800/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-500" />
          <span className="font-semibold text-sm">PrepVista AI</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-slate-400">Question </span>
            <span className="font-medium">{turnCount}/{maxTurns}</span>
          </div>
          <div className={`text-sm font-mono ${timer > maxDuration * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>
            {formatTime(timer)} / {formatTime(maxDuration)}
          </div>
          <button onClick={handleFinish} className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/30 transition-colors">
            End Interview
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Orb */}
        <div className={orbClass} />

        {/* State Label */}
        <p className="text-sm text-slate-400 uppercase tracking-wider">
          {state === 'GREETING' && 'Starting...'}
          {state === 'LISTENING' && '🎙 Listening...'}
          {state === 'SPEAKING' && '🔊 Speaking...'}
          {state === 'PROCESSING' && '⏳ Processing...'}
          {state === 'FINISHED' && '✅ Finished'}
          {state === 'INITIALIZING' && 'Preparing...'}
        </p>

        {/* Live typing indicator */}
        {state === 'LISTENING' && currentText && (
          <div className="max-w-lg text-center px-4">
            <p className="text-sm text-slate-300 italic">"{currentText}"</p>
          </div>
        )}

        {/* Submit button (when listening) */}
        {state === 'LISTENING' && (
          <button onClick={stopListeningAndSubmit}
            className="btn-primary !bg-green-600 hover:!bg-green-700 !shadow-green-500/20">
            ✓ Submit Answer
          </button>
        )}
      </div>

      {/* Transcript Panel */}
      <div className="bg-slate-800/40 backdrop-blur border-t border-slate-700 max-h-48 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {transcript.map((msg, i) => (
            <div key={i} className={`text-sm ${msg.role === 'assistant' ? 'text-blue-300' : 'text-slate-300'}`}>
              <span className="text-xs text-slate-500 mr-2">
                {msg.role === 'assistant' ? 'AI' : 'You'}:
              </span>
              {msg.text}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg max-w-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
