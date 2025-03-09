"""
FastAPI application for Video Chat Assistant

This serves as the main API endpoint for the web version of the Video Chat Assistant.
"""

import os
import sys
import logging
import base64
import json
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv

# Import video chat components
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from video_chat import config
from video_chat.assistant import VideoChatAssistant
from video_chat.visual_handler import VisualHandler

# Load environment variables
env_path = Path('.') / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # Look for .env in the parent directory
    env_path = Path('..') / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("api")

# Check for API key
if not os.environ.get('GOOGLE_API_KEY'):
    logger.error("GOOGLE_API_KEY environment variable is not set")
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

# Create FastAPI app
app = FastAPI(title="Video Chat Assistant API")

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request/response models
class MessageRequest(BaseModel):
    text: str
    with_visual: bool = False
    visual_data: Optional[str] = None  # Base64 encoded image
    visual_type: Optional[str] = "image"  # "image", "video", etc.

class MessageResponse(BaseModel):
    text: str
    audio: Optional[str] = None  # Base64 encoded audio

# Initialize the visual handler
visual_handler = VisualHandler()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Video Chat Assistant API is running"}

@app.post("/api/message", response_model=MessageResponse)
async def process_message(request: MessageRequest):
    """Process a text message with optional visual data"""
    try:
        # Initialize the assistant with default model
        assistant = VideoChatAssistant(model=os.environ.get('MODEL', config.MODEL))
        
        # Process visual data if provided
        visual_data = None
        if request.with_visual and request.visual_data:
            # Convert base64 to image bytes
            image_bytes = base64.b64decode(request.visual_data)
            # Use visual handler to process the image
            visual_data = visual_handler.process_image_bytes(image_bytes)
        
        # Process the message
        response = await assistant.process_web_request(
            text=request.text,
            visual_data=visual_data
        )
        
        return response
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket connection for real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Initialize the assistant with default model
        assistant = VideoChatAssistant(model=os.environ.get('MODEL', config.MODEL))
        
        # Process messages
        while True:
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            # Process message
            response = await assistant.process_websocket_message(request_data)
            
            # Send response back to client
            await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_text(json.dumps({"error": str(e)}))