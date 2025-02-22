import { useState, useEffect, useCallback, useRef } from 'react';
import { startChat, processVideoFrame } from '../utils/gemini';

interface VideoStreamHook {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  streamError: string | null;
  analysis: string | null;
  startStream: () => Promise<void>;
  stopStream: () => void;
  captureFrame: () => Promise<void>;
}

export const useVideoStream = (processingInterval = 2000): VideoStreamHook => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Initialize canvas once
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
  }, []);

  // Initialize Gemini chat
  useEffect(() => {
    const initChat = async () => {
      try {
        chatRef.current = await startChat();
      } catch (error) {
        console.error('Error initializing chat:', error);
        setStreamError('Failed to initialize chat');
      }
    };
    initChat();
  }, []);

  // Start video stream
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setStreamError(null);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setStreamError('Failed to access camera');
      setIsStreaming(false);
    }
  };

  // Stop video stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture and process frame
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !chatRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG
    const frame = canvas.toDataURL('image/jpeg', 0.8);

    try {
      // Process frame with Gemini
      const result = await processVideoFrame(frame, chatRef.current);
      if (result) {
        setAnalysis(result);
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      setStreamError('Failed to process frame');
    }
  };

  // Automatic frame capture
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isStreaming) {
      intervalId = setInterval(captureFrame, processingInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isStreaming, processingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (canvasRef.current) {
        canvasRef.current = null;
      }
    };
  }, [stopStream]);

  return {
    videoRef,
    isStreaming,
    streamError,
    analysis,
    startStream,
    stopStream,
    captureFrame
  };
};
