
export enum AppStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'jarvis';
  text: string;
  timestamp: Date;
}
