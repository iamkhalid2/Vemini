# 🤖 Vemini

A real-time multimodal communication interface built with React and TypeScript, leveraging Google's Generative AI services for context-aware AI interactions.

## ✨ Features

- 💬 **Real-time Communication**: WebSocket-based audio streaming and processing
- 🎧 **Advanced Audio**: Web Audio API integration with volume metering and visualization
- 🤖 **AI Integration**: Seamless connection with Google's Generative Language API
- 📹 **Media Capture**: Support for webcam and screen capture
- 🔄 **Real-time Processing**: Media stream multiplexing and audio worklet processing
- 🎛️ **Modular Design**: Flexible component architecture with side panels and control trays
- 🛠️ **Tool Integration**: Support for tool calls and responses

## 🛠️ Technical Stack

- React + TypeScript
- Web Audio API
- WebSocket API
- Google Generative AI SDK

## 🏗️ Project Structure

```
src/
├── components/          # React components (Altair, AudioPulse, etc.)
├── contexts/           # React context providers
├── hooks/             # Custom hooks for media and API
├── lib/               # Core utilities and audio processing
│   └── worklets/     # Audio worklet processors
└── [other config files]
```

## 🚀 Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Configure your Google API key
4. Start the development server:
```bash
npm start
```

## 📜 License

Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0
