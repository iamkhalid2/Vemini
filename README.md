# Vemini: Voice-Enabled Multimodal Context Aware AI

[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/downloads/)
[![Gemini 2.0](https://img.shields.io/badge/Gemini-2.0-green)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

Vemini is a powerful, interactive voice and visual-enabled AI assistant built on Google's Gemini 2.0 API. It provides seamless voice interaction, real-time screen and camera analysis, and natural dialogue capabilities. Perfect for hands-free computing, accessibility applications, and interactive AI experiences.

## ✨ Features

- **🎙️ Voice Recognition**: Natural voice interaction with ambient noise calibration
- **🔄 Multi-Modal Input**: Process both voice commands and text inputs
- **👁️ Visual Analysis**: Analyze content from:
  - 🖥️ Screen captures (default)
  - 📷 Webcam feed
- **🔊 Real-time Audio Response**: Natural voice responses with buffer management for smooth playback
- **⚡ Interruption Capability**: Interrupt the assistant at any time with new commands
- **🧠 Context-aware Visual Analysis**: Automatically detects when visual context is needed
- **🔌 Flexible Media Selection**: Switch between camera and screen capture as needed

## 🛠️ Technology Stack

- **Google Gemini 2.0 API**: Advanced multimodal AI model
- **Python 3.9+**: Core programming language
- **Speech Recognition**: Google Speech Recognition API for voice transcription
- **PyAudio**: Audio stream handling for input/output
- **OpenCV (cv2)**: Camera capture and image processing
- **MSS**: Screen capture functionality
- **PIL**: Image processing and manipulation
- **Asyncio**: Asynchronous programming for responsive interactions

## 🚀 Getting Started

### Prerequisites

- Python 3.9 or higher
- Google API key with access to Gemini API
- Webcam (optional for camera analysis)
- Microphone (for voice interaction)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iamkhalid2/vemini.git
   cd vemini
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv myenv
   # On Windows
   myenv\Scripts\activate
   # On macOS/Linux
   source myenv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your Google API key:
   ```bash
   # On Windows
   set GOOGLE_API_KEY=your_api_key_here
   # On macOS/Linux
   export GOOGLE_API_KEY=your_api_key_here
   ```

### Running Vemini

Run the main application:
```bash
python main.py
```

## 💬 Usage

Once Vemini is running, you can interact with it using the following commands:

- Type your messages directly in the terminal
- Say **"voice on"** to activate voice recognition
- Say **"voice off"** or type **"q"** in voice mode to deactivate
- Type **"use camera"** to switch to webcam for visual analysis
- Type **"use screen"** to switch to screen capture for visual analysis
- Type anything while the assistant is speaking to interrupt it
- Type **"q"** to quit the application

### Visual Analysis Triggers

The assistant automatically detects when visual context is needed based on keywords like:
- "See", "Look", "Show", "Screen", "Camera", "Picture", etc.

Example queries:
- "What can you see on my screen?"
- "Look at this image and describe it"
- "What's showing on my webcam right now?"

## 🏗️ Project Structure

```
vemini/
├── main.py                  # Entry point for the application
├── requirements.txt         # Dependencies
├── video_chat/              # Core module
│   ├── __init__.py
│   ├── assistant.py         # Main assistant coordinator
│   ├── audio_handler.py     # Audio processing and speech recognition
│   ├── config.py            # Configuration settings
│   └── visual_handler.py    # Screen and camera capture functionality
└── logs/                    # Log files
```
## 📜 License

This project is licensed under the MIT License

## 🙏 Acknowledgements

- Google Gemini API for the underlying AI model
- Speech Recognition library contributors
- OpenCV and PIL developers
