/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import cn from "classnames";
import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  icon: string;
  activeIcon: string;
  label: string;
  start: () => Promise<any>;
  stop: () => any;
  isActive: boolean;
};

/**
 * Enhanced button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, icon, activeIcon, label, start, stop, isActive }: MediaStreamButtonProps) => (
    <button 
      className={cn("control-button", { active: isActive })} 
      onClick={isStreaming ? stop : start}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined filled">
        {isStreaming ? activeIcon : icon}
      </span>
      <span className="button-label">{label}</span>
    </button>
  )
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  
  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  // Auto-focus connect button when not connected
  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  // Update volume CSS variable for visualization
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  // Handle audio recording
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  // Handle video frame sending
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }
    
    let timeoutId = -1;
    
    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;
      
      if (!video || !canvas) {
        return;
      }
      
      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  // Handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }
    
    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className={cn("control-tray", { disabled: !connected })}>
      <canvas className="hidden-canvas" ref={renderCanvasRef} />
      
      <div className="control-tray-container">
        <div className="control-group">
          {/* Microphone control */}
          <button 
            className={cn("control-button mic-button", { muted })} 
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            title={muted ? "Unmute microphone" : "Mute microphone"}
          >
            <span className="material-symbols-outlined filled">
              {muted ? "mic_off" : "mic"}
            </span>
            <span className="button-label">
              {muted ? "Unmute" : "Mute"}
            </span>
          </button>
          
          {/* Audio visualization */}
          <div className="control-button audio-pulse-container">
            <AudioPulse volume={volume} active={connected} hover={false} />
          </div>
          
          {/* Screen share and webcam controls */}
          {supportsVideo && (
            <>
              <MediaStreamButton
                isStreaming={screenCapture.isStreaming}
                start={changeStreams(screenCapture)}
                stop={changeStreams()}
                icon="present_to_all"
                activeIcon="cancel_presentation"
                label={screenCapture.isStreaming ? "Stop sharing" : "Share screen"}
                isActive={screenCapture.isStreaming}
              />
              
              <MediaStreamButton
                isStreaming={webcam.isStreaming}
                start={changeStreams(webcam)}
                stop={changeStreams()}
                icon="videocam"
                activeIcon="videocam_off"
                label={webcam.isStreaming ? "Stop webcam" : "Start webcam"}
                isActive={webcam.isStreaming}
              />
            </>
          )}
          
          {children}
        </div>
        
        {/* Connection control */}
        <div className="connection-control">
          <button
            ref={connectButtonRef}
            className={cn("connection-button", { connected })}
            onClick={connected ? disconnect : connect}
            aria-label={connected ? "Stop streaming" : "Start streaming"}
          >
            <div className="connection-button-inner">
              <span className="material-symbols-outlined filled">
                {connected ? "pause" : "play_arrow"}
              </span>
            </div>
            <span className="connection-label">
              {connected ? "Stop" : "Start"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);
