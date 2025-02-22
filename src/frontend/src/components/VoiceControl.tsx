import React, { useEffect, useState, useCallback, useRef } from 'react';
import '../styles/VoiceControl.css';

interface VoiceControlProps {
  onCommand: (command: string) => void;
}

interface ISpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const retryTimeoutRef = useRef<number>();

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    try {
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as ISpeechRecognitionConstructor | undefined;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported in this browser.');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const command = event.results[0][0].transcript;
        setTranscript(command);
        onCommand(command);
        setError(null);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        
        // Handle different error types
        switch (event.error) {
          case 'network':
            setError('Network error. Retrying...');
            // Retry after 2 seconds
            retryTimeoutRef.current = window.setTimeout(() => {
              if (isListening) {
                startListening();
              }
            }, 2000);
            break;
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'no-speech':
            setError('No speech detected. Please try again.');
            break;
          default:
            setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If we're supposed to be listening but it ended, try to restart
        if (isListening && !error) {
          startListening();
        }
      };

      recognitionRef.current = recognition;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize speech recognition');
      recognitionRef.current = null;
    }
  }, [onCommand, isListening, error]);

  // Initialize on mount
  useEffect(() => {
    initializeRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initializeRecognition]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      initializeRecognition();
    }
    
    try {
      recognitionRef.current?.abort();
      recognitionRef.current?.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start speech recognition. Please try again.');
      setIsListening(false);
    }
  }, [initializeRecognition]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className="voice-control">
      <button 
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        disabled={!!error && error.includes('not supported')}
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      {transcript && (
        <div className="transcript">
          Last command: {transcript}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="status">
        {isListening ? 'Listening...' : 'Click to speak'}
      </div>
    </div>
  );
};

// Add type declaration for Window interface
declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

export default VoiceControl;