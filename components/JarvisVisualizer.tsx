
import React from 'react';

interface JarvisVisualizerProps {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
}

const JarvisVisualizer: React.FC<JarvisVisualizerProps> = ({ isListening, isThinking, isSpeaking }) => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
      {/* Outer Rotating Ring (Neural Pathway) */}
      <div className={`absolute w-full h-full border-4 border-dashed rounded-full transition-all duration-700 
        ${isListening ? 'border-cyan-400 border-solid animate-[spin_3s_linear_infinite] scale-110' : 
          isThinking ? 'border-purple-500 animate-[spin_1.5s_linear_infinite] opacity-100 scale-105' : 
          'border-cyan-500/20 animate-[spin_20s_linear_infinite] opacity-40'}`}></div>
      
      {/* Neural Network Glow */}
      {isThinking && (
        <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      )}

      {/* Middle Pulse Rings */}
      <div className={`absolute w-3/4 h-3/4 border-2 rounded-full transition-all duration-500 
        ${isThinking ? 'border-purple-400 animate-ping scale-110' : 
          isSpeaking ? 'border-indigo-400 animate-pulse scale-105' : 
          'border-cyan-400/30 scale-100'}`}></div>
      
      {/* Core Orb / Brain Center */}
      <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 z-10
        ${isListening ? 'bg-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.8)] scale-110' : 
          isThinking ? 'bg-gradient-to-br from-purple-600 to-indigo-700 shadow-[0_0_60px_rgba(168,85,247,0.8)] animate-pulse' : 
          isSpeaking ? 'bg-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.8)] scale-105' :
          'bg-slate-800 shadow-[0_0_20px_rgba(15,23,42,0.5)]'}`}>
        
        <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
          {/* Internal Brain-like Texture/Animation */}
          <div className={`w-12 h-12 rounded-full transition-all duration-700 relative
            ${isThinking ? 'bg-white opacity-100' : 'bg-cyan-400/50 opacity-80'}`}>
            {isThinking && (
              <div className="absolute inset-0 bg-purple-400 animate-ping rounded-full"></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Thinking Particles (Synapses) */}
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-500
            ${isThinking ? 'bg-purple-300 shadow-[0_0_8px_rgba(192,132,252,1)]' : 'bg-cyan-400 opacity-20'}`}
          style={{
            transform: `rotate(${i * 30}deg) translate(${isThinking ? '140px' : '120px'})`,
            opacity: isListening || isThinking || isSpeaking ? 1 : 0.1,
            transitionDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  );
};

export default JarvisVisualizer;
