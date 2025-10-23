export type AppState = 'welcome' | 'live' | 'processing' | 'results';

export interface CaptureData {
  images: string[];
  transcription: string;
}

export interface ResultsData {
  image: string;
  json: string;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogMessage {
  timestamp: string;
  level: LogLevel;
  message: string;
}