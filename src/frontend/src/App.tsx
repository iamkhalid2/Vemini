import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import { VideoFrameExtractor } from '../../utils/VideoFrameExtractor';
import VoiceControl from './components/VoiceControl';
import SceneAnalysis from './components/SceneAnalysis';
import './styles/App.css';

interface DetectedObject {
  name: string;
  position?: { x: number; y: number };
  confidence: number;
  lastSeenAt: number;
}

interface Action {
  description: string;
  objects: string[];
  confidence: number;
  timestamp: number;
}

interface Analysis {
  objects: DetectedObject[];
  actions: Action[];
  sceneDescription: string;
  relationships: Array<{
    object1: string;
    object2: string;
    relationship: string;
  }>;
  timestamp: number;
}

interface QueueStatus {
  queueLength: number;
  timestamp: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const frameExtractorRef = useRef<VideoFrameExtractor | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const frameProcessingTimeoutRef = useRef<number>();

  const connectSocket = useCallback(() => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
      console.log('🔌 Connecting to WebSocket server:', wsUrl);

      const newSocket = io(wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('❌ Disconnected:', reason);
        setIsConnected(false);
        setQueueStatus(null);
        
        if (reason === 'io server disconnect') {
          console.log('🔄 Server initiated disconnect, attempting reconnect...');
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (err: Error) => {
        console.error('❌ Connection error:', err.message);
        setError(`Connection error: ${err.message}`);
        setQueueStatus(null);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            newSocket.connect();
          }, 2000);
        }
      });

      newSocket.on('analysis-result', (result: Analysis) => {
        console.log('📊 Received analysis result');
        setAnalysis(result);
        setIsProcessing(false);
      });

      newSocket.on('queue-status', (status: QueueStatus) => {
        console.log('📋 Queue status:', status);
        setQueueStatus(status);
      });

      newSocket.on('error', (err: { message: string }) => {
        console.error('❌ Server error:', err.message);
        setError(err.message);
        setIsProcessing(false);

        if (frameProcessingTimeoutRef.current) {
          window.clearTimeout(frameProcessingTimeoutRef.current);
        }
      });

      newSocket.on('voice-response', (response: { response: string; timestamp: number }) => {
        console.log('🤖 AI Response:', response.response);
      });

      setSocket(newSocket);

      return () => {
        if (frameProcessingTimeoutRef.current) {
          window.clearTimeout(frameProcessingTimeoutRef.current);
        }
        newSocket.close();
      };
    } catch (err) {
      console.error('❌ Failed to initialize connection:', err);
      setError(`Failed to initialize connection: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      cleanup?.();
    };
  }, [connectSocket]);

  useEffect(() => {
    const initializeVideo = async () => {
      try {
        frameExtractorRef.current = new VideoFrameExtractor({
          targetFps: 2,
          width: 640,
          height: 480,
          quality: 0.85
        });

        await frameExtractorRef.current.initialize();

        frameExtractorRef.current.onFrame(async (frame: { id: string; data: string; timestamp: number }) => {
          if (!socket?.connected || isProcessing) return;
          
          try {
            setIsProcessing(true);
            socket.emit('video-frame', frame);

            frameProcessingTimeoutRef.current = window.setTimeout(() => {
              setIsProcessing(false);
              setError('Frame processing timeout. The server took too long to respond.');
            }, 10000);
          } catch (err) {
            console.error('❌ Error sending frame:', err);
            setError(`Failed to send frame: ${err instanceof Error ? err.message : String(err)}`);
            setIsProcessing(false);
          }
        });

        frameExtractorRef.current.start();
        console.log('📹 Video processing started');

      } catch (err) {
        console.error('❌ Failed to initialize video:', err);
        setError(`Failed to initialize video: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    if (isConnected) {
      initializeVideo();
    }

    return () => {
      if (frameProcessingTimeoutRef.current) {
        window.clearTimeout(frameProcessingTimeoutRef.current);
      }
      frameExtractorRef.current?.dispose();
    };
  }, [isConnected, socket]);

  const handleVoiceCommand = (command: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot send voice command: not connected');
      return;
    }
    
    try {
      console.log('🎤 Sending voice command:', command);
      socket.emit('voice-command', command);
    } catch (err) {
      console.error('❌ Error sending voice command:', err);
      setError(`Failed to send voice command: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const connectionStatus = isConnected ? 'Connected' : reconnectAttemptsRef.current > 0 
    ? `Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
    : 'Disconnected';

  const queueInfo = queueStatus 
    ? `Queue: ${queueStatus.queueLength} frame${queueStatus.queueLength !== 1 ? 's' : ''}`
    : '';

  return (
    <div className="app">
      <header className="app-header">
        <h1>Real-time Video Assistant</h1>
        <div className="status-container">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            Status: {connectionStatus}
          </div>
          {queueStatus && (
            <div className="queue-status">
              {queueInfo}
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="video-section">
          <div className="video-container">
            <video
              id="videoElement"
              autoPlay
              playsInline
              muted
            />
            {isProcessing && (
              <div className="processing-indicator">
                <div className="spinner"></div>
                <span>Processing frame...</span>
                {queueStatus && queueStatus.queueLength > 0 && (
                  <span className="queue-info">{queueInfo}</span>
                )}
              </div>
            )}
          </div>
          <VoiceControl onCommand={handleVoiceCommand} />
        </div>

        <div className="analysis-section">
          <SceneAnalysis analysis={analysis} />
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button 
              className="retry-button"
              onClick={() => {
                setError(null);
                connectSocket();
              }}
            >
              Retry Connection
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;