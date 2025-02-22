import React, { useEffect, useRef, useState } from 'react';
import '../styles/VideoStream.css';

interface VideoStreamProps {
  onChunk: (chunk: Blob) => void;
}

const VideoStream: React.FC<VideoStreamProps> = ({ onChunk }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let chunkInterval: number;

    const initializeStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            onChunk(event.data);
          }
        };

        // Start recording and create chunks every 3 seconds
        setIsRecording(true);
        mediaRecorderRef.current.start();
        
        chunkInterval = window.setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.start();
          }
        }, 3000);
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    initializeStream();

    return () => {
      window.clearInterval(chunkInterval);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onChunk]);

  return (
    <div className="video-stream">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
      />
      {isRecording && (
        <div className="recording-indicator">
          Recording
        </div>
      )}
    </div>
  );
};

export default VideoStream;