import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import VideoStream from './components/VideoStream';
import VoiceControl from './components/VoiceControl';
import SceneAnalysis from './components/SceneAnalysis';
import './styles/App.css';

interface Analysis {
  objects: Array<{
    name: string;
    position?: { x: number; y: number };
    confidence: number;
  }>;
  sceneDescription: string;
  relationships: Array<{
    object1: string;
    object2: string;
    relationship: string;
  }>;
  timestamp: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectSocket = useCallback(() => {
    try {
      const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try reconnecting
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError(`Connection error: ${err.message}`);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            newSocket.connect();
          }, 2000);
        }
      });

      newSocket.on('analysis-result', (result: Analysis) => {
        setAnalysis(result);
      });

      newSocket.on('error', (err: { message: string }) => {
        setError(err.message);
      });

      // Ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping');
        }
      }, 30000);

      setSocket(newSocket);

      return () => {
        clearInterval(pingInterval);
        newSocket.close();
      };
    } catch (err) {
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

  const handleVideoChunk = async (chunk: Blob) => {
    if (!socket || !isConnected) {
      console.warn('Cannot send video chunk: not connected');
      return;
    }

    try {
      // Convert Blob to Buffer for transmission
      const arrayBuffer = await chunk.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      socket.emit('video-chunk', buffer);
    } catch (err) {
      console.error('Error sending video chunk:', err);
      setError(`Failed to send video chunk: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleVoiceCommand = (command: string) => {
    if (!socket || !isConnected) {
      console.warn('Cannot send voice command: not connected');
      return;
    }
    
    try {
      socket.emit('voice-command', command);
    } catch (err) {
      console.error('Error sending voice command:', err);
      setError(`Failed to send voice command: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const connectionStatus = isConnected ? 'Connected' : reconnectAttemptsRef.current > 0 
    ? `Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
    : 'Disconnected';

  return (
    <div className="app">
      <header className="app-header">
        <h1>Real-time Video Assistant</h1>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          Status: {connectionStatus}
        </div>
      </header>

      <main className="app-main">
        <div className="video-section">
          <VideoStream onChunk={handleVideoChunk} />
          <VoiceControl onCommand={handleVoiceCommand} />
        </div>

        <div className="analysis-section">
          <SceneAnalysis analysis={analysis} />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;