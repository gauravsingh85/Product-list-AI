import React, { useState, useEffect, useRef } from 'react';
import { useLog } from '../context/LogContext';
import type { LogLevel } from '../types';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'text-cyan-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-400',
};

const Logger: React.FC = () => {
  const { logs, clearLogs } = useLog();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom when new logs are added
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-lg border border-gray-700 shadow-2xl font-mono text-sm">
      <div 
        className="flex justify-between items-center p-3 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="font-bold text-gray-200">Debug Logs</h3>
        <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              className="mr-4 text-xs bg-gray-700 hover:bg-red-800 text-gray-300 px-2 py-1 rounded"
            >
              Clear
            </button>
            <span className="text-cyan-400 transform transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
              ▲
            </span>
        </div>
      </div>
      {!isCollapsed && (
        <div ref={scrollRef} className="bg-black p-4 h-64 overflow-y-auto border-t border-gray-700">
          {logs.map((log, index) => (
            <div key={index} className="flex">
              <span className="text-gray-500 mr-3">{log.timestamp}</span>
              <span className={`font-bold w-12 ${LOG_LEVEL_COLORS[log.level]}`}>{`[${log.level}]`}</span>
              <span className="flex-1 text-gray-300 whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Logger;
