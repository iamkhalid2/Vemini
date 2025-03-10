import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { Mic, Video, Share2, Send, X } from 'lucide-react';

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
  const [showChat, setShowChat] = useState(false);
  
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
  
  // Handle option selection (Talk, Show, Share)
  const handleOptionSelect = (option) => {
    setShowChat(true);
    
    if (option === 'talk') {
      setIsVoiceModeActive(true);
      startListening();
    } else if (option === 'show') {
      setMediaSource('camera');
    } else if (option === 'share') {
      setMediaSource('screen');
      captureScreenshot();
    }
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
  };
  
  const handleKeyPress = (e) => {
    // Check for special commands when Enter is pressed
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (handleSpecialCommands(inputText)) {
        setInputText('');
        return;
      }
      
      handleSubmit();
    }
  };

  // Home/Welcome screen UI
  const WelcomeScreen = () => (
    <div className="flex-grow flex flex-col items-center justify-center text-center px-4 space-y-6">
      <h1 className="text-6xl font-normal mb-4">Hello Anon!</h1>
      <p className="text-xl text-gray-300 mb-12">Interact with Vemini using text, voice, video, or screen sharing.</p>
      
      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
        {/* Talk to Vemini */}
        <div 
          onClick={() => handleOptionSelect('talk')}
          className="bg-gray-800 p-8 rounded-lg flex flex-col items-center text-center cursor-pointer hover:bg-gray-700 transition-all"
        >
          <div className="bg-blue-600/10 p-3 rounded-full mb-4">
            <Mic className="text-blue-500 w-6 h-6" />
          </div>
          <h3 className="text-xl font-medium mb-2">Talk to Vemini</h3>
          <p className="text-gray-400">Start a real-time conversation using your microphone.</p>
        </div>
        
        {/* Show Vemini */}
        <div 
          onClick={() => handleOptionSelect('show')} 
          className="bg-gray-800 p-8 rounded-lg flex flex-col items-center text-center cursor-pointer hover:bg-gray-700 transition-all"
        >
          <div className="bg-blue-600/10 p-3 rounded-full mb-4">
            <Video className="text-blue-500 w-6 h-6" />
          </div>
          <h3 className="text-xl font-medium mb-2">Show Vemini</h3>
          <p className="text-gray-400">Use your webcam to share what you're looking at and get real-time feedback.</p>
        </div>
        
        {/* Share your screen */}
        <div 
          onClick={() => handleOptionSelect('share')}
          className="bg-gray-800 p-8 rounded-lg flex flex-col items-center text-center cursor-pointer hover:bg-gray-700 transition-all"
        >
          <div className="bg-blue-600/10 p-3 rounded-full mb-4">
            <Share2 className="text-blue-500 w-6 h-6" />
          </div>
          <h3 className="text-xl font-medium mb-2">Share your screen</h3>
          <p className="text-gray-400">Share your screen to show Vemini what you're working on.</p>
        </div>
      </div>
      
      {/* Attribution */}
      <div className="mt-12 text-lg text-gray-300">
        <p>Curated with ⚡ by Khalid</p>
      </div>
    </div>
  );

  // Chat interface UI
  const ChatScreen = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Visual input area - only show when needed */}
      {(mediaSource !== 'none' || capturedImage) && (
        <div className="mb-4 bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 bg-gray-700 text-white">
            <h2 className="text-lg font-medium">
              {mediaSource === 'camera' ? 'Camera' : mediaSource === 'screen' ? 'Screen' : 'Visual Input'}
            </h2>
            <button 
              onClick={() => {
                setMediaSource('none');
                clearImage();
              }}
              className="p-1 bg-gray-600 hover:bg-gray-500 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Camera view */}
          {mediaSource === 'camera' && !capturedImage && (
            <div>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-48 object-cover"
              />
              <div className="p-2 flex justify-center bg-gray-700">
                <button 
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  onClick={captureImage}
                >
                  Capture Image
                </button>
              </div>
            </div>
          )}
          
          {/* Screen capture prompt */}
          {mediaSource === 'screen' && !capturedImage && (
            <div className="p-4 text-center text-white">
              <p className="mb-3">Click the button below to capture your screen</p>
              <button 
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
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
                className="w-full max-h-48 object-contain"
              />
              <div className="p-2 flex justify-center bg-gray-700">
                <button 
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  onClick={clearImage}
                >
                  Clear Image
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto px-1 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p>Initializing... The assistant will introduce itself shortly.</p>
              <div className="mt-3 flex space-x-2 justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : message.isError 
                        ? 'bg-red-100 text-red-700 rounded-bl-none' 
                        : 'bg-gray-700 text-white rounded-bl-none'
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
                      className="mt-2 flex items-center text-sm text-blue-300 hover:text-blue-100"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.src = `data:audio/wav;base64,${message.audio}`;
                          audioRef.current.play();
                          setIsPlayingAudio(true);
                        }
                      }}
                    >
                      <Mic className="h-4 w-4 mr-1" />
                      Play audio
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 p-2 rounded-lg rounded-bl-none max-w-[80%]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {!showChat ? <WelcomeScreen /> : <ChatScreen />}
      </div>

      {/* Footer Input */}
      {showChat && (
        <div className="mt-auto pt-4">
          <div className="bg-gray-800 flex items-center rounded-full p-2 pr-3">
            <button 
              className={`p-2 ${isVoiceModeActive ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-400`}
              onClick={toggleVoiceMode}
              title={isVoiceModeActive ? "Turn off voice input" : "Turn on voice input"}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              className={`p-2 ${mediaSource === 'camera' ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-400 mr-1`}
              onClick={() => setMediaSource(mediaSource === 'camera' ? 'none' : 'camera')}
              title={mediaSource === 'camera' ? "Turn off camera" : "Turn on camera"}
            >
              <Video className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyPress}
              disabled={isLoading || isListening}
              className="bg-transparent flex-grow outline-none ml-1 text-gray-300"
              placeholder={isListening ? "Listening..." : "Type something..."}
            />
            <button 
              onClick={handleSubmit}
              disabled={isLoading || (!inputText.trim() && !capturedImage)}
              className={`ml-3 p-2 ${
                isLoading || (!inputText.trim() && !capturedImage)
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } rounded-full transition-colors`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

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