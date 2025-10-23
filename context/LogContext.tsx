import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import type { LogMessage, LogLevel } from '../types';

interface LogContextType {
  logs: LogMessage[];
  log: (level: LogLevel, message: string) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const log = useCallback((level: LogLevel, message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newMessage: LogMessage = { timestamp, level, message };
    setLogs((prevLogs) => [...prevLogs, newMessage]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LogContext.Provider value={{ logs, log, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLog = (): LogContextType => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
};
