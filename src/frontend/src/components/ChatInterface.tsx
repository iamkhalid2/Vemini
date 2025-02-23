import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceManager, VoiceManagerEvents } from '../services/VoiceManager';
import styles from './ChatInterface.module.css';

interface Message {
  type: 'text' | 'voice' | 'video';
  content: string;
  timestamp: number;
  sender: 'user' | 'assistant';
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);

  // Initialize voice manager
  useEffect(() => {
    const events: VoiceManagerEvents = {
      onSpeechStart: () => setIsListening(true),
      onSpeechEnd: () => setIsListening(false),
      onPartialResult: (text) => setInput(text),
      onFinalResult: (text) => {
        setInput('');
        handleSubmit(text, 'voice');
      },
      onError: (error) => console.error('Voice error:', error)
    };

    voiceManagerRef.current = new VoiceManager(events);

    return () => {
      voiceManagerRef.current?.dispose();
    };
  }, []);

  // Handle video stream
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoActive(false);
    }
  }, []);

  // Handle voice commands
  const toggleVoice = useCallback(() => {
    if (isListening) {
      voiceManagerRef.current?.stopListening();
    } else {
      voiceManagerRef.current?.startListening();
    }
  }, [isListening]);

  // Handle message submission
  const handleSubmit = useCallback((content: string, type: 'text' | 'voice' | 'video') => {
    const newMessage: Message = {
      type,
      content,
      timestamp: Date.now(),
      sender: 'user'
    };

    setMessages(prev => [...prev, newMessage]);
    
    // TODO: Send to backend for processing
    // For now, just echo back
    setTimeout(() => {
      const response: Message = {
        type: 'text',
        content: `Received your ${type} message: ${content}`,
        timestamp: Date.now(),
        sender: 'assistant'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  }, []);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSubmit(input.trim(), 'text');
      setInput('');
    }
  };

  return (
    <div className={styles['chat-interface']}>
      <div className={styles['chat-messages']}>
        {messages.map((msg, idx) => (
          <div key={msg.timestamp + idx} className={`${styles.message} ${styles[msg.sender]}`}>
            <div className={styles['message-content']}>
              {msg.type === 'video' ? (
                <video src={msg.content} controls />
              ) : (
                msg.content
              )}
            </div>
            <div className={styles['message-meta']}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className={styles['chat-controls']}>
        {isVideoActive && (
          <div className={styles['video-preview']}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '200px', height: '150px' }}
            />
          </div>
        )}

        <form onSubmit={handleInputSubmit} className={styles['input-form']}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isListening}
          />
          
          <button
            type="button"
            onClick={toggleVoice}
            className={isListening ? 'active' : ''}
          >
            {isListening ? '🔴' : '🎤'}
          </button>

          <button
            type="button"
            onClick={isVideoActive ? stopVideo : startVideo}
            className={isVideoActive ? 'active' : ''}
          >
            {isVideoActive ? '📵' : '📹'}
          </button>

          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;