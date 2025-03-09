# Vemini - Video Chat Assistant Web Application

Vemini is a web-based version of a video chat assistant that uses Google's Gemini API. This application provides both text and visual interactions with the assistant through a modern React frontend and FastAPI backend.

## Project Structure

```
vemini/
├── api/                  # FastAPI backend
│   └── index.py          # Main API endpoints
├── client/               # React frontend
│   ├── public/           # Static files
│   └── src/              # React source code
│       ├── App.js        # Main React component
│       ├── index.js      # React entry point
│       └── index.css     # Styles with Tailwind CSS
├── video_chat/           # Core assistant functionality
│   ├── __init__.py
│   ├── assistant.py      # Main assistant class
│   ├── audio_handler.py  # Audio processing
│   ├── config.py         # Configuration settings
│   └── visual_handler.py # Visual processing
├── main.py               # CLI entry point (original app)
├── requirements.txt      # Python dependencies
├── vercel.json           # Vercel deployment config
└── README.md             # This file
```

## Prerequisites

- Python 3.8+ with pip
- Node.js 14+ with npm
- Google API key for Gemini

## Setup Instructions

### 1. Environment Setup

Create a `.env` file in the project root with your Google API key:

```
GOOGLE_API_KEY=your_api_key_here
MODEL=gemini-pro
```

### 2. Python Environment

```bash
# Create a virtual environment
python -m venv myenv

# Activate the virtual environment
# On Windows:
myenv\Scripts\activate
# On macOS/Linux:
source myenv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Backend Setup

In a separate terminal:

```bash
# Activate the virtual environment if not already activated
# On Windows:
myenv\Scripts\activate
# On macOS/Linux:
source myenv/bin/activate

# Start the FastAPI server
uvicorn api.index:app --reload --port 8000
```

## Usage

1. Open your browser to http://localhost:3000
2. Use the interface to interact with the assistant:
   - Type text messages in the input field
   - Toggle camera or screen capture using the buttons in the header
   - Submit your queries with or without visual context
   - Listen to audio responses from the assistant

## Features

- **Text Chat**: Exchange messages with the AI assistant
- **Visual Input**: Capture images from your webcam or screenshots
- **Audio Responses**: Listen to the assistant's voice responses
- **Responsive Design**: Works on desktop and mobile devices

## Deployment to Vercel

1. Push your code to a GitHub repository
2. Connect your Vercel account to GitHub
3. Import your repository in Vercel
4. Set the following environment variables in Vercel:
   - `GOOGLE_API_KEY`: Your Gemini API key
   - `MODEL`: The Gemini model to use (e.g., "gemini-pro")
5. Deploy

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://reactjs.org/)
- Powered by [Google Gemini API](https://ai.google.dev/)
