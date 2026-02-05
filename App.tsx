
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, History, Cpu, Power, AlertCircle, Smartphone } from 'lucide-react';
import AssistantVisualizer from './components/JarvisVisualizer';
import { geminiService } from './services/geminiService';
import { AppStatus, ChatMessage } from './types';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const streamRef = useRef<MediaStream | null>(null);

  const speak = useCallback((text: string) => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    const voices = synthesisRef.current.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith('bn') || v.name.includes('Bangla'));
    if (bnVoice) utterance.voice = bnVoice;
    utterance.onstart = () => setStatus(AppStatus.SPEAKING);
    utterance.onend = () => setStatus(AppStatus.IDLE);
    synthesisRef.current.speak(utterance);
    setHistory(prev => [{ role: 'jarvis', text, timestamp: new Date() }, ...prev]);
  }, []);

  // System Control Actions
  const systemActions = {
    toggle_flashlight: async (state: string) => {
      try {
        if (state === 'on') {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: true }] });
          return "জ্বি স্যার, টর্চ জ্বালানো হয়েছে।";
        } else {
          streamRef.current?.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          return "টর্চ বন্ধ করা হয়েছে।";
        }
      } catch (e) {
        return "দুঃখিত স্যার, আপনার ফোনের হার্ডওয়্যার টর্চ সাপোর্ট করছে না।";
      }
    },
    vibrate_device: (duration: number = 500) => {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
        return "ফোন ভাইব্রেট করা হচ্ছে।";
      }
      return "আপনার ফোন ভাইব্রেশন সাপোর্ট করে না।";
    },
    check_battery: async () => {
      // @ts-ignore
      if (navigator.getBattery) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        return `আপনার ফোনের ব্যাটারি লেভেল এখন ${level} পার্সেন্ট।`;
      }
      return "আমি ব্যাটারি স্ট্যাটাস চেক করতে পারছি না।";
    },
    get_location: () => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((pos) => {
          window.open(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`, "_blank");
          resolve("আমি আপনার বর্তমান অবস্থান ম্যাপে ওপেন করেছি।");
        }, () => resolve("আমি আপনার লোকেশন পারমিশন পাচ্ছি না।"));
      });
    },
    open_app: (app: string) => {
      const links: Record<string, string> = {
        whatsapp: "whatsapp://send",
        facebook: "fb://",
        youtube: "https://youtube.com",
        calculator: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end",
        dialer: "tel:",
        settings: "intent://#Intent;action=android.settings.SETTINGS;end",
        camera: "intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end"
      };
      if (links[app.toLowerCase()]) {
        window.open(links[app.toLowerCase()], "_blank");
        return `আপনার জন্য ${app} ওপেন করার চেষ্টা করছি।`;
      }
      return `দুঃখিত, আমি ${app} সরাসরি ওপেন করতে পারছি না।`;
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.onstart = () => { setStatus(AppStatus.LISTENING); setErrorMsg(null); };
    recognition.onresult = (e: any) => { 
      const text = e.results[0][0].transcript; 
      setTranscript(text); 
      handleAI(text); 
    };
    recognition.onend = () => setStatus(prev => prev === AppStatus.LISTENING ? AppStatus.IDLE : prev);
    recognitionRef.current = recognition;
  }, []);

  const handleAI = async (text: string) => {
    setHistory(prev => [{ role: 'user', text, timestamp: new Date() }, ...prev]);
    setStatus(AppStatus.THINKING);

    try {
      const response = await geminiService.askAssistant(text);
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          let result = "";
          if (fc.name === 'toggle_flashlight') result = await systemActions.toggle_flashlight(fc.args.state);
          else if (fc.name === 'vibrate_device') result = systemActions.vibrate_device(fc.args.duration);
          else if (fc.name === 'check_battery') result = await systemActions.check_battery();
          else if (fc.name === 'get_location') result = (await systemActions.get_location()) as string;
          else if (fc.name === 'open_app') result = systemActions.open_app(fc.args.app_name);
          speak(result);
        }
      } else {
        speak(response.text);
      }
    } catch (err) {
      speak("দুঃখিত স্যার, সার্ভারের সাথে সংযোগে সমস্যা হচ্ছে।");
      setStatus(AppStatus.IDLE);
    }
  };

  const toggleListening = async () => {
    if (!hasGreeted) { 
      speak("হ্যালো! আমি আপনার অ্যাসিস্ট্যান্ট। আমি আপনার ফোন কন্ট্রোল করতে এবং প্রশ্নের উত্তর দিতে প্রস্তুত।"); 
      setHasGreeted(true); 
      return; 
    }
    
    if (status === AppStatus.LISTENING) {
      recognitionRef.current?.stop();
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current?.start();
    } catch (err) {
      setErrorMsg("মাইক্রোফোন পারমিশন দিন।");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-[#010409] text-slate-100 font-['Hind_Siliguri']">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.15)_0%,_transparent_70%)] pointer-events-none"></div>

      <header className="w-full flex justify-between items-center max-w-6xl z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`absolute -inset-1 bg-cyan-500/30 rounded-lg blur transition-opacity ${status !== AppStatus.IDLE ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center glow-cyan">
              <Smartphone size={24} className="text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">SMART <span className="text-cyan-500 uppercase">Assistant</span></h1>
            <p className="text-[9px] text-cyan-500/50 uppercase tracking-[0.3em] font-mono">Mobile Controller Active</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-900/50 hover:bg-cyan-500/10 rounded-xl border border-white/5 transition-all">
          <History size={20} className="text-slate-400" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-4xl z-10">
        <AssistantVisualizer 
          isListening={status === AppStatus.LISTENING}
          isThinking={status === AppStatus.THINKING}
          isSpeaking={status === AppStatus.SPEAKING}
        />

        <div className="text-center space-y-4 px-4">
          {errorMsg && <div className="text-red-400 text-xs bg-red-400/10 py-1 px-4 rounded-full border border-red-400/20 animate-pulse">{errorMsg}</div>}
          <div className="min-h-[100px] flex flex-col items-center justify-center">
             <div className="flex items-center gap-2 mb-2 opacity-50">
                <div className={`w-1.5 h-1.5 rounded-full ${status === AppStatus.IDLE ? 'bg-slate-600' : 'bg-cyan-500 animate-pulse'}`}></div>
                <p className="text-[10px] uppercase tracking-widest">{status === AppStatus.IDLE ? 'System Ready' : status}</p>
             </div>
             <h2 className={`text-2xl md:text-3xl font-light transition-all duration-500 max-w-2xl ${status === AppStatus.LISTENING ? 'text-cyan-300' : 'text-slate-300'}`}>
               {transcript || (hasGreeted ? "কিভাবে সাহায্য করতে পারি স্যার?" : "শুরু করতে বাটনে ক্লিক করুন")}
             </h2>
          </div>
        </div>

        <button
          onClick={toggleListening}
          className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 transform active:scale-90
            ${status === AppStatus.LISTENING ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 
              status === AppStatus.THINKING ? 'bg-purple-600 animate-pulse' : 'bg-slate-900 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] hover:border-cyan-400'}
          `}
        >
          {status === AppStatus.LISTENING ? <MicOff size={32} /> : status === AppStatus.THINKING ? <Cpu size={32} className="animate-spin" /> : <Mic size={32} className="text-cyan-400" />}
          
          {status === AppStatus.IDLE && (
            <div className="absolute -inset-2 border border-cyan-500/10 rounded-full animate-ping pointer-events-none"></div>
          )}
        </button>
      </main>

      <footer className="w-full grid grid-cols-1 md:grid-cols-3 py-8 max-w-6xl z-10 text-[9px] text-slate-600 uppercase tracking-[0.3em]">
        <div className="hidden md:flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> System Online</div>
        <div className="text-center font-bold text-cyan-500/40">Powered by Gemini Neural Brain</div>
        <div className="hidden md:block text-right">Encrypted Link v5.0</div>
      </footer>

      {/* Sidebar Memory */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-slate-950/98 backdrop-blur-xl z-50 transform transition-transform duration-500 border-l border-white/5 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[10px] font-bold text-cyan-500 tracking-[0.2em] uppercase">Assistant Memory</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Power size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-none">
            {history.length === 0 ? (
              <p className="text-slate-700 text-[10px] text-center italic mt-20">No data in memory logs</p>
            ) : (
              history.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-xl text-xs max-w-[90%] leading-relaxed ${msg.role === 'user' ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20' : 'bg-slate-900 text-slate-300 border border-white/5'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-700 mt-1 font-mono">
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => setHistory([])}
            className="mt-6 w-full py-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-400/30 hover:text-red-400 text-[9px] uppercase tracking-widest rounded-lg border border-red-500/10 transition-all"
          >
            Reset Memory
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
