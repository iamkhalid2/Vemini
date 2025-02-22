# Real-time Video Assistant

A web-based application that provides near real-time video analysis with voice interaction capabilities using Google's Gemini API.

## Features

- Real-time video processing (2-3 second chunks)
- Voice command interaction
- Object detection and tracking
- Spatial relationship understanding
- Scene context awareness
- Natural language responses

## Prerequisites

- Node.js 18+ installed
- A Google Gemini API key
- Modern web browser with camera and microphone access

## Project Structure

```
├── src/
│   ├── backend/         # Express server
│   │   └── server.ts    # Main server file
│   ├── frontend/        # React frontend
│   │   ├── src/        
│   │   │   ├── components/
│   │   │   └── styles/
│   │   └── package.json
│   └── utils/          # Shared utilities
└── package.json
```

## Setup

1. Install root dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd src/frontend
npm install
```

3. Create environment files:

Root `.env`:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

Frontend `.env`:
```
VITE_WS_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
```

## Running the Application

1. Start the backend server:
```bash
npm run dev:backend
```

2. In a new terminal, start the frontend:
```bash
cd src/frontend
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Usage

1. Allow camera and microphone access when prompted
2. The video feed will start automatically
3. Click the microphone button to give voice commands
4. View real-time analysis in the right panel

## Development

### Backend Development
- The backend runs on Express with Socket.IO for real-time communication
- Video chunks are processed using the Gemini API
- Results are streamed back to the frontend

### Frontend Development
- Built with React and TypeScript
- Uses WebRTC for video capture
- Web Speech API for voice recognition
- Socket.IO client for real-time updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini API for video and spatial understanding
- WebRTC for video capture capabilities
- Web Speech API for voice recognition