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
import { useRef, useState, useEffect } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  // Video reference for displaying the active stream (webcam or screen capture)
  const videoRef = useRef<HTMLVideoElement>(null);
  // Active video stream state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  // Mobile view state for responsive design
  const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);
  // State for the floating log panel
  const [showFloatingLogs, setShowFloatingLogs] = useState<boolean>(false);
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="App">
      {/* Animated background */}
      <div className="animated-background">
        <div className="gradient-blob"></div>
        <div className="gradient-blob"></div>
        <div className="gradient-blob"></div>
      </div>
      
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          {!isMobileView && <SidePanel />}
          
          <main>
            <header className="app-header">
              <h1 className="app-title">
                <span className="logo">V</span>
                <span className="title-text">emini</span>
              </h1>
              
              {isMobileView && (
                <div className="app-actions">
                  <button 
                    className="menu-toggle"
                    onClick={() => setShowFloatingLogs(!showFloatingLogs)}
                    aria-label={showFloatingLogs ? "Close menu" : "Open menu"}
                  >
                    <span className="material-symbols-outlined filled">
                      {showFloatingLogs ? 'close' : 'menu'}
                    </span>
                  </button>
                </div>
              )}
            </header>
            
            <div className="main-app-area">
              {/* Altair visualization component */}
              <Altair />
              
              {/* Video stream */}
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
              
              {/* Floating logs panel for mobile */}
              {isMobileView && showFloatingLogs && (
                <div className="floating-logs-panel">
                  <SidePanel />
                </div>
              )}
            </div>
            
            {/* Control tray for media controls */}
            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            />
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
