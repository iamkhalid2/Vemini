import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { CameraIcon, PhotoIcon, ArrowUpCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

// API base URL - adjust for development/production
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8000/api';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaSource, setMediaSource] = useState('none'); // 'none', 'camera', 'screen'
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const webcamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
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
      // In a real app, you would implement screen capture here
      // For now, we'll just simulate it with a placeholder
      alert('In a real app, this would capture your screen. This feature requires additional setup.');
      
      // If you implement screen capture:
      // const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // ... process the stream to get an image ...
      // setCapturedImage(imageDataUrl);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };
  
  // Function to clear captured image
  const clearImage = () => {
    setCapturedImage(null);
  };
  
  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim() && !capturedImage) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      image: capturedImage
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Prepare request data
      const requestData = {
        text: inputText,
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
        audioRef.current.play();
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
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow container mx-auto p-4 flex flex-col">
        {/* Video preview area */}
        {mediaSource === 'camera' && !capturedImage && (
          <div className="mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-800">
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
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                onClick={() => setMediaSource('none')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {mediaSource === 'screen' && !capturedImage && (
          <div className="mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-800 p-6">
            <div className="text-center text-white p-6">
              <PhotoIcon className="h-20 w-20 mx-auto mb-4" />
              <p className="mb-4">Click the button below to capture your screen</p>
              <button 
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                onClick={captureScreenshot}
              >
                Capture Screenshot
              </button>
            </div>
          </div>
        )}
        
        {/* Captured image display */}
        {capturedImage && (
          <div className="mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-800">
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
        
        {/* Messages area */}
        <div className="flex-grow mt-4 bg-white rounded-lg shadow-md p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <h3 className="text-xl font-medium mb-2">Video Chat Assistant</h3>
              <p>Send a message to start a conversation!</p>
              <p className="mt-2 text-sm">You can also capture images or screenshots to include with your message.</p>
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
              disabled={isLoading}
              className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              disabled={isLoading || (!inputText.trim() && !capturedImage)}
              className={`p-2 rounded-lg ${
                isLoading || (!inputText.trim() && !capturedImage)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <ArrowUpCircleIcon className="h-6 w-6" />
            </button>
          </form>
          <div className="mt-2 text-xs text-gray-500 text-center">
            <p>Tip: Type your message or capture an image first, then submit</p>
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