import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import type { CaptureData } from '../types';
import { createPcmBlob } from '../utils/helpers';
import { useLog } from '../context/LogContext';

interface LiveCaptureProps {
  onCaptureComplete: (data: CaptureData) => void;
}

const TOTAL_PHOTOS = 3;
const CAPTURE_DURATION_MS = 60 * 1000; // 1 minute

type ChecklistStatus = 'pending' | 'success' | 'error';
interface ChecklistItem {
  text: string;
  status: ChecklistStatus;
}

const LiveCapture: React.FC<LiveCaptureProps> = ({ onCaptureComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptionRef = useRef<string>('');
  const capturedImagesRef = useRef<string[]>([]);
  const liveSessionRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false); // Ref to avoid stale closures in callbacks

  const [photosTaken, setPhotosTaken] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CAPTURE_DURATION_MS / 1000);
  const [error, setError] = useState<string | null>(null);
  
  const { log } = useLog();

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { text: 'Accessing Camera & Microphone', status: 'pending' },
    { text: 'Connecting to AI Assistant', status: 'pending' },
    { text: 'Listening for "Start Recording"', status: 'pending' },
  ]);

  const updateChecklist = (index: number, status: ChecklistStatus, message?: string) => {
    setChecklist(prev => {
        const newChecklist = [...prev];
        newChecklist[index] = { ...newChecklist[index], status };
        if (message) newChecklist[index].text = message;
        return newChecklist;
    });
  }
  
  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  const cleanup = useCallback(() => {
    log('INFO', 'Cleaning up capture resources.');
    liveSessionRef.current?.close();
    liveSessionRef.current = null;

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, [log]);

  const finishCapture = useCallback(() => {
    log('INFO', 'Finishing capture and calling onCaptureComplete.');
    cleanup();
    onCaptureComplete({
      images: capturedImagesRef.current,
      transcription: transcriptionRef.current,
    });
  }, [onCaptureComplete, cleanup, log]);

  // Effect to initialize media and Gemini Live connection
  useEffect(() => {
    log('INFO', 'LiveCapture component mounted. Starting up...');
    const startUp = async () => {
      try {
        log('DEBUG', 'Requesting user media (video and audio).');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        log('INFO', 'Media stream acquired successfully.');
        updateChecklist(0, 'success');

        log('DEBUG', 'Initializing GoogleGenAI and connecting to live session.');
        updateChecklist(1, 'pending');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              log('INFO', 'Gemini Live session opened.');
              updateChecklist(1, 'success');
              updateChecklist(2, 'success');
            },
            onmessage: (message: LiveServerMessage) => {
              if (message.serverContent?.inputTranscription) {
                const newTranscript = message.serverContent.inputTranscription.text;
                log('DEBUG', `Received transcript chunk: "${newTranscript}"`);
                
                if (isCapturingRef.current) {
                  transcriptionRef.current += newTranscript;
                } else {
                  transcriptionRef.current += newTranscript;
                  const processedTranscript = transcriptionRef.current.toLowerCase().replace(/[\s.-]/g, '');
                  
                  if (processedTranscript.includes('startrecording')) {
                    log('INFO', 'Trigger phrase "start recording" detected!');
                    setIsCapturing(true);
                    transcriptionRef.current = ''; 
                  }
                }
              }
            },
            onerror: (e: ErrorEvent) => {
              log('ERROR', `Live API Error: ${e.message}`);
              setError(`Live API Error: ${e.message}`);
              updateChecklist(1, 'error', `AI Connection Error: ${e.message}`);
            },
            onclose: () => log('INFO', 'Gemini Live session closed.'),
          },
          config: { 
            inputAudioTranscription: {},
            responseModalities: [Modality.AUDIO],
          },
        });

        sessionPromise.then(session => {
            liveSessionRef.current = session;
        }).catch(err => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            log('ERROR', `Failed to connect to Live API: ${errorMessage}`);
            setError(`Failed to connect to Live API: ${errorMessage}`);
            updateChecklist(1, 'error', `AI Connection Failed: ${errorMessage}`);
        });

        log('DEBUG', 'Setting up audio processing pipeline.');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
        };
        source.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log('ERROR', `Failed to get user media: ${errorMessage}`);
        setError('Could not access camera or microphone. Please check permissions.');
        updateChecklist(0, 'error', `Media Error: ${errorMessage}`);
        return;
      }
    };

    startUp();
    return cleanup;
  }, [cleanup, log]);

  // Effect to run timers and photo capture once triggered
  useEffect(() => {
     if (!isCapturing || error) return;

     log('INFO', 'Capture triggered. Starting timers and photo capture interval.');

     const photoInterval = setInterval(() => {
        if (photosTaken < TOTAL_PHOTOS && videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if(context){
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                capturedImagesRef.current.push(dataUrl);
                setPhotosTaken((p) => {
                    const newCount = p + 1;
                    log('DEBUG', `Photo taken (${newCount}/${TOTAL_PHOTOS}).`);
                    return newCount;
                });
            }
        }
     }, CAPTURE_DURATION_MS / (TOTAL_PHOTOS + 1));

     const timerInterval = setInterval(() => {
         setTimeLeft((t) => {
             if (t <= 1) {
                 clearInterval(timerInterval);
                 clearInterval(photoInterval);
                 finishCapture();
                 return 0;
             }
             return t - 1;
         });
     }, 1000);

     return () => {
         clearInterval(photoInterval);
         clearInterval(timerInterval);
     };
  }, [isCapturing, error, finishCapture, photosTaken, log]);

  const renderStatus = () => {
    if (isCapturing) {
        return <h2 className="text-3xl font-bold mb-4 text-cyan-400">Listening... Speak about your product now!</h2>
    }
    return (
        <div className="w-full max-w-md bg-gray-900 p-4 rounded-lg mb-4">
            <h2 className="text-2xl font-bold mb-3 text-cyan-400">Setup Checklist</h2>
            {checklist.map((item, index) => (
                <div key={index} className="flex items-center text-lg mb-2">
                    <span className="mr-3">
                        {item.status === 'pending' && <div className="w-5 h-5 border-2 border-yellow-400 rounded-full animate-spin"></div>}
                        {item.status === 'success' && <span className="text-green-400">✓</span>}
                        {item.status === 'error' && <span className="text-red-400">✗</span>}
                    </span>
                    <span className={`${item.status === 'error' ? 'text-red-300' : 'text-gray-200'}`}>{item.text}</span>
                </div>
            ))}
        </div>
    )
  }


  return (
    <div className="w-full flex flex-col items-center p-6 bg-gray-800 rounded-2xl shadow-lg">
      {renderStatus()}
      {error && <p className="text-red-400 bg-red-900 p-3 rounded-md mb-4">{error}</p>}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-cyan-500 shadow-cyan-500/20 shadow-xl">
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover"></video>
        {isCapturing && (
          <>
            <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg text-2xl font-mono">
                {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
            </div>
            <div className="absolute bottom-4 left-4">
                <p className="text-lg font-semibold bg-black/50 p-2 rounded-lg">Photos taken: {photosTaken} / {TOTAL_PHOTOS}</p>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default LiveCapture;