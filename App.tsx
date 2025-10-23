import React, { useState, useCallback } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import LiveCapture from './components/LiveCapture';
import ProcessingScreen from './components/ProcessingScreen';
import ResultsScreen from './components/ResultsScreen';
import Logger from './components/Logger';
import { generateProductImage, extractProductInfo } from './services/geminiService';
import type { AppState, CaptureData, ResultsData } from './types';
import { LogProvider, useLog } from './context/LogContext';

const AppContent: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { log } = useLog();

  const handleGoLive = () => {
    setError(null);
    log('INFO', 'User clicked "Go Live". Starting session.');
    setAppState('live');
  };

  const handleCaptureComplete = useCallback(async (data: CaptureData) => {
    setAppState('processing');
    log('INFO', 'Capture complete. Starting AI processing...');
    log('DEBUG', `Received ${data.images.length} images.`);
    log('DEBUG', `Received transcription: "${data.transcription.substring(0, 100)}..."`);
    try {
      const [imageData, jsonData] = await Promise.all([
        generateProductImage(data.images, log),
        extractProductInfo(data.transcription, data.images, log),
      ]);
      log('INFO', 'AI processing successful.');
      setResults({ image: imageData, json: jsonData });
      setAppState('results');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during AI processing.';
      log('ERROR', `Error during AI processing: ${errorMessage}`);
      console.error('Error processing AI generation:', err);
      setError(errorMessage);
      setAppState('welcome');
    }
  }, [log]);

  const handleReset = () => {
    log('INFO', 'User reset the application.');
    setAppState('welcome');
    setResults(null);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case 'live':
        return <LiveCapture onCaptureComplete={handleCaptureComplete} />;
      case 'processing':
        return <ProcessingScreen />;
      case 'results':
        return results && <ResultsScreen results={results} onReset={handleReset} />;
      case 'welcome':
      default:
        return <WelcomeScreen onGoLive={handleGoLive} error={error} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto mb-4">
        {renderContent()}
      </div>
      <Logger />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <LogProvider>
      <AppContent />
    </LogProvider>
  );
}

export default App;