import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { CameraIcon, PhotoIcon, ArrowUpCircleIcon, SpeakerWaveIcon, MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

// API base URL - adjust for development/production
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8000/api';

// Initial system prompt (same as CLI version)
const INITIAL_PROMPT = "Introduce yourself in a witful way as a helpful realtime multimodal assistant created by Khalid.";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaSource, setMediaSource] = useState('none'); // 'none', 'camera', 'screen'
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const webcamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      
      // If voice mode is active, automatically submit after getting result
      if (isVoiceModeActive) {
        handleSubmitWithText(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
      // If voice mode is active, start listening again
      if (isVoiceModeActive) {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
    };
    
    return true;
  };
  
  // Start listening for speech
  const startListening = () => {
    if (!recognitionRef.current) {
      if (!initSpeechRecognition()) {
        alert('Speech recognition is not supported in your browser.');
        return;
      }
    }
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition', error);
    }
  };
  
  // Stop listening for speech
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  
  // Toggle voice mode
  const toggleVoiceMode = () => {
    const newState = !isVoiceModeActive;
    setIsVoiceModeActive(newState);
    
    if (newState) {
      startListening();
    } else {
      stopListening();
    }
  };
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Initialize speech recognition when component mounts
  useEffect(() => {
    initSpeechRecognition();
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Initialize with system prompt on first load
  useEffect(() => {
    if (!isInitialized && !messages.length) {
      setIsInitialized(true);
      setIsLoading(true);
      
      // Send initial system prompt
      axios.post(`${API_URL}/message`, { text: INITIAL_PROMPT })
        .then(response => {
          const assistantMessage = {
            id: Date.now(),
            sender: 'assistant',
            text: response.data.text,
            audio: response.data.audio
          };
          
          setMessages([assistantMessage]);
          
          // Play audio if available
          if (response.data.audio && audioRef.current) {
            const audioSrc = `data:audio/wav;base64,${response.data.audio}`;
            audioRef.current.src = audioSrc;
            audioRef.current.play().catch(error => {
              console.error('Error playing audio:', error);
            });
            setIsPlayingAudio(true);
          }
        })
        .catch(error => {
          console.error('Error sending initial prompt:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isInitialized, messages]);
  
  // Function to capture image from webcam
  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  };
  
  // Function to capture screenshot
  const captureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          cursor: "always",
          displaySurface: "monitor" 
        }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get screenshot as data URL
      const screenshot = canvas.toDataURL('image/jpeg');
      setCapturedImage(screenshot);
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screen. Please ensure you have granted screen sharing permissions.');
    }
  };
  
  // Function to clear captured image
  const clearImage = () => {
    setCapturedImage(null);
  };
  
  // Function to handle form submission with specific text
  const handleSubmitWithText = async (text) => {
    if (!text.trim() && !capturedImage) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text,
      image: capturedImage
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Prepare request data
      const requestData = {
        text: text,
        with_visual: !!capturedImage,
        visual_data: capturedImage ? capturedImage.split(',')[1] : null // Remove the data:image/jpeg;base64, prefix
      };
      
      // Send request to API
      const response = await axios.post(`${API_URL}/message`, requestData);
      
      // Add assistant response to chat
      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.data.text,
        audio: response.data.audio
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Play audio if available
      if (response.data.audio && audioRef.current) {
        const audioSrc = `data:audio/wav;base64,${response.data.audio}`;
        audioRef.current.src = audioSrc;
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
        setIsPlayingAudio(true);
      }
      
      // Clear the captured image after sending
      setCapturedImage(null);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await handleSubmitWithText(inputText);
  };
  
  // Handle special commands like in the CLI version
  const handleSpecialCommands = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText === 'voice on') {
      setIsVoiceModeActive(true);
      startListening();
      return true;
    } else if (lowerText === 'voice off' || (isVoiceModeActive && lowerText === 'q')) {
      setIsVoiceModeActive(false);
      stopListening();
      return true;
    } else if (lowerText === 'use camera') {
      setMediaSource(mediaSource === 'camera' ? 'none' : 'camera');
      return true;
    } else if (lowerText === 'use screen') {
      setMediaSource(mediaSource === 'screen' ? 'none' : 'screen');
      return true;
    } else if (lowerText === 'q') {
      // In CLI this would quit, but we'll just clear the chat
      setMessages([]);
      return true;
    }
    
    return false;
  };
  
  // Handle text input change
  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    
    // Check for special commands when Enter is pressed
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (handleSpecialCommands(text)) {
        setInputText('');
        return;
      }
      
      handleSubmit();
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Video Chat Assistant</h1>
          <div className="flex space-x-3">
            <button 
              onClick={() => setMediaSource(mediaSource === 'camera' ? 'none' : 'camera')}
              className={`p-2 rounded-full ${mediaSource === 'camera' ? 'bg-primary-400' : 'bg-primary-700'} hover:bg-primary-500 transition-colors`}
              title="Toggle camera"
            >
              <CameraIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setMediaSource(mediaSource === 'screen' ? 'none' : 'screen')}
              className={`p-2 rounded-full ${mediaSource === 'screen' ? 'bg-primary-400' : 'bg-primary-700'} hover:bg-primary-500 transition-colors`}
              title="Toggle screen capture"
            >
              <PhotoIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={toggleVoiceMode}
              className={`p-2 rounded-full ${isVoiceModeActive ? 'bg-primary-400 animate-pulse' : 'bg-primary-700'} hover:bg-primary-500 transition-colors`}
              title={isVoiceModeActive ? "Disable voice mode" : "Enable voice mode"}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow container mx-auto p-4 flex flex-col">
        {/* Visual canvas area - displays webcam or screen capture UI */}
        <div className="mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-800">
          <div className="flex items-center justify-center p-2 bg-gray-700 text-white">
            <h2 className="text-lg font-medium">Visual Input</h2>
            {mediaSource !== 'none' && (
              <button 
                onClick={() => setMediaSource('none')}
                className="ml-4 bg-gray-600 p-1 rounded-full hover:bg-gray-500 transition-colors"
                title="Close visual input"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {mediaSource === 'none' && !capturedImage && (
            <div className="flex flex-col items-center justify-center p-8 text-white text-center">
              <div className="flex space-x-6 mb-4">
                <button 
                  onClick={() => setMediaSource('camera')}
                  className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <CameraIcon className="h-12 w-12 mb-2" />
                  <span>See Camera</span>
                </button>
                <button 
                  onClick={() => setMediaSource('screen')}
                  className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <PhotoIcon className="h-12 w-12 mb-2" />
                  <span>See Screen</span>
                </button>
              </div>
              <p className="text-gray-400">Select a visual input source</p>
            </div>
          )}
          
          {mediaSource === 'camera' && !capturedImage && (
            <div>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-64 object-cover"
              />
              <div className="p-3 bg-gray-700 flex justify-between">
                <button 
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                  onClick={captureImage}
                >
                  Capture Image
                </button>
              </div>
            </div>
          )}
          
          {mediaSource === 'screen' && !capturedImage && (
            <div className="p-6 text-center text-white">
              <PhotoIcon className="h-20 w-20 mx-auto mb-4" />
              <p className="mb-4">Click the button below to capture your screen</p>
              <button 
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                onClick={captureScreenshot}
              >
                Capture Screenshot
              </button>
            </div>
          )}
          
          {/* Captured image display */}
          {capturedImage && (
            <div>
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-64 object-contain"
              />
              <div className="p-3 bg-gray-700 flex justify-between">
                <button 
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  onClick={clearImage}
                >
                  Clear Image
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Voice mode status indicator */}
        {isVoiceModeActive && (
          <div className={`mb-4 p-3 rounded-lg bg-primary-50 border border-primary-300 text-primary-700 flex items-center justify-between ${isListening ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <MicrophoneIcon className="h-5 w-5 mr-2" />
              {isListening ? 'Listening... Speak clearly' : 'Voice mode active - Click the microphone to speak'}
            </div>
            <button
              onClick={toggleVoiceMode}
              className="bg-primary-100 hover:bg-primary-200 p-1 rounded text-xs"
            >
              Turn Off
            </button>
          </div>
        )}
        
        {/* Messages area */}
        <div className="flex-grow bg-white rounded-lg shadow-md p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <h3 className="text-xl font-medium mb-2">Video Chat Assistant</h3>
              <p>Initializing... The assistant will introduce itself shortly.</p>
              <p className="mt-2 text-sm">You can use these commands just like in the CLI version:</p>
              <ul className="mt-2 text-sm list-disc list-inside">
                <li>'voice on' - Activate voice recognition</li>
                <li>'voice off' - Deactivate voice recognition</li>
                <li>'use camera' - Switch to camera input</li>
                <li>'use screen' - Switch to screen capture</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'user' 
                        ? 'bg-primary-500 text-white rounded-br-none' 
                        : message.isError 
                          ? 'bg-red-100 text-red-700 rounded-bl-none' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {message.image && (
                      <div className="mb-2">
                        <img 
                          src={message.image} 
                          alt="User captured" 
                          className="rounded max-h-40 max-w-full"
                        />
                      </div>
                    )}
                    {message.text && (
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    )}
                    {message.audio && (
                      <button 
                        className="mt-2 flex items-center text-sm text-primary-700 hover:text-primary-500"
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.src = `data:audio/wav;base64,${message.audio}`;
                            audioRef.current.play();
                            setIsPlayingAudio(true);
                          }
                        }}
                      >
                        <SpeakerWaveIcon className="h-5 w-5 mr-1" />
                        Play audio
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-4 rounded-lg rounded-bl-none max-w-[80%]">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>
      
      {/* Input form */}
      <footer className="bg-white border-t p-4 shadow-inner">
        <div className="container mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleTextChange}
              disabled={isLoading || isListening}
              className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={isListening ? "Listening..." : isVoiceModeActive ? "Voice mode active (or type a message)" : "Type a message..."}
            />
            {isVoiceModeActive && !isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                <MicrophoneIcon className="h-6 w-6" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || (!inputText.trim() && !capturedImage) || isListening}
                className={`p-2 rounded-lg ${
                  isLoading || (!inputText.trim() && !capturedImage) || isListening
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                <ArrowUpCircleIcon className="h-6 w-6" />
              </button>
            )}
          </form>
          <div className="mt-2 text-xs text-gray-500 text-center">
            <p>
              {isVoiceModeActive 
                ? "Voice mode active: Speak clearly or type commands like 'voice off'" 
                : "Tip: Type 'voice on' to activate voice recognition"}
            </p>
          </div>
        </div>
      </footer>
      
      {/* Hidden audio element for playing responses */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlayingAudio(false)}
        onError={() => setIsPlayingAudio(false)}
        className="hidden"
      />
    </div>
  );
}

export default App;