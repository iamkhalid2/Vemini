#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Video Chat Assistant using Gemini 2.0 Multimodal Live API

This script creates an interactive assistant that:
1. Automatically activates voice and video on startup
2. Enables voice recognition for hands-free interaction
3. Takes screenshots only when the query context is related to visual content
4. Allows text-based CLI interaction as an alternative input method
5. Plays back the assistant's responses as audio

Requirements:
```
pip install google-genai opencv-python pyaudio pillow mss SpeechRecognition pydub numpy wave
```

Before running this script, ensure the `GOOGLE_API_KEY` environment variable 
is set to the API key you obtained from Google AI Studio.

Important: Use headphones to prevent the assistant from hearing its own responses.

To run the script:
```
python video_chat_assistant.py
```
"""

import asyncio
import base64
import io
import os
import sys
import time
import traceback
import threading
import re

import cv2
import numpy as np
import pyaudio
import speech_recognition as sr
import PIL.Image
import mss
import wave
import argparse

from pydub import AudioSegment
from pydub.playback import play

from google import genai

# For older Python versions compatibility
if sys.version_info < (3, 11, 0):
    import taskgroup, exceptiongroup
    asyncio.TaskGroup = taskgroup.TaskGroup
    asyncio.ExceptionGroup = exceptiongroup.ExceptionGroup

# Audio configuration
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

# Gemini model selection
MODEL = "gemini-2.0-flash"

# Initialize the client with alpha API version for Live API
client = genai.Client(http_options={"api_version": "v1alpha"})

# Audio config - both TEXT and AUDIO work with 2.0 flash
CONFIG = {"response_modalities": ["AUDIO"]}

# Initialize PyAudio
pya = pyaudio.PyAudio()

# Context clues that indicate visual context is needed
VISUAL_CONTEXT_KEYWORDS = [
    "see", "look", "screen", "showing", "display", "shown",
    "visual", "image", "picture", "photo", "view", "monitor",
    "camera", "webcam", "what's on", "what is on"
]

class VideoChatAssistant:
    def __init__(self):
        # Setup queues and other attributes
        self.audio_in_queue = None
        self.out_queue = None
        self.session = None
        self.listening = False
        self.recognizer = sr.Recognizer()
        
        try:
            self.microphone = sr.Microphone()
            
            # Call audio calibration
            with self.microphone as source:
                print("Calibrating microphone for ambient noise... Please wait.")
                self.recognizer.adjust_for_ambient_noise(source, duration=2)
                print("Calibration complete!")
        except Exception as e:
            print(f"Error initializing microphone: {e}")
            print("Voice recognition will be disabled. You can use text input instead.")
            self.microphone = None
        
        # For capturing video
        self.cap = None
        self.last_transcription = ""
        
        # Initialize video capture
        self.setup_video_capture()

    def setup_video_capture(self):
        """Initialize video capture if not already set up."""
        try:
            self.cap = cv2.VideoCapture(0)
            if not self.cap.isOpened():
                print("Warning: Could not open video device. Video features will be disabled.")
        except Exception as e:
            print(f"Error initializing video capture: {e}")
            print("Video features will be disabled.")

    def _get_frame(self):
        """Capture a frame from the webcam."""
        if not self.cap or not self.cap.isOpened():
            return None
            
        ret, frame = self.cap.read()
        if not ret:
            return None
            
        # Convert BGR to RGB color space
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = PIL.Image.fromarray(frame_rgb)
        img.thumbnail([1024, 1024])  # Resize to acceptable dimensions
        
        # Convert to bytes
        image_io = io.BytesIO()
        img.save(image_io, format="jpeg")
        image_io.seek(0)
        
        mime_type = "image/jpeg"
        image_bytes = image_io.read()
        return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}

    def _get_screenshot(self):
        """Capture the screen as a screenshot."""
        try:
            with mss.mss() as sct:
                monitor = sct.monitors[0]  # Main monitor
                
                screenshot = sct.grab(monitor)
                img = PIL.Image.frombytes("RGB", screenshot.size, screenshot.rgb)
                img.thumbnail([1024, 1024])  # Resize to acceptable dimensions
                
                image_io = io.BytesIO()
                img.save(image_io, format="jpeg")
                image_io.seek(0)
                
                mime_type = "image/jpeg"
                image_bytes = image_io.read()
                return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}
        except Exception as e:
            print(f"Error capturing screenshot: {e}")
            return None

    def should_capture_visual(self, query):
        """Determine if the query needs visual context."""
        if not query:
            return False
            
        query = query.lower()
        for keyword in VISUAL_CONTEXT_KEYWORDS:
            if keyword in query:
                return True
        return False

    async def voice_recognition_loop(self):
        """Background task to continuously listen for voice commands."""
        if not self.microphone:
            # If microphone initialization failed, just sleep forever
            while True:
                await asyncio.sleep(10)
                
        while True:
            if not self.listening:
                await asyncio.sleep(0.5)
                continue
                
            try:
                with self.microphone as source:
                    print("Listening for speech... (Say something)")
                    audio = self.recognizer.listen(source, timeout=5)
                    
                try:
                    # Recognize speech using Google Speech Recognition
                    text = self.recognizer.recognize_google(audio)
                    print(f"You said: {text}")
                    self.last_transcription = text
                    
                    # Stop listening while processing this command
                    self.listening = False
                    
                    # Check if we need visual context
                    visual_needed = self.should_capture_visual(text)
                    
                    # If visual context is needed, capture frame or screenshot
                    if visual_needed:
                        visual_data = self._get_screenshot()
                        if visual_data:
                            await self.out_queue.put(visual_data)
                            print("Added visual context from screen")
                    
                    # Send the transcribed text to the model
                    await self.session.send(input=text, end_of_turn=True)
                    
                except sr.UnknownValueError:
                    print("Could not understand audio")
                    self.listening = True
                except sr.RequestError as e:
                    print(f"Error with speech recognition service: {e}")
                    self.listening = True
                    
            except Exception as e:
                print(f"Error in voice recognition: {e}")
                self.listening = True
                await asyncio.sleep(1)

    async def send_text(self):
        """Send text input from the command line."""
        while True:
            # Only allow text input when not listening for voice
            text = await asyncio.to_thread(
                input,
                "message > " if not self.listening else "[Listening for voice... type q to stop] > "
            )
            
            # Toggle voice recognition
            if text.lower() == "voice on":
                self.listening = True
                print("Voice recognition activated. Speak clearly.")
                continue
            elif text.lower() == "voice off" or (self.listening and text.lower() == "q"):
                self.listening = False
                print("Voice recognition deactivated.")
                continue
                
            # Check for quit command
            if text.lower() == "q":
                break
                
            # Check if we need visual context
            visual_needed = self.should_capture_visual(text)
            
            # If visual context is needed, capture frame or screenshot
            if visual_needed:
                visual_data = self._get_screenshot()
                if visual_data:
                    await self.out_queue.put(visual_data)
                    print("Added visual context from screen")
                    
            # Send the text to the model
            await self.session.send(input=text or ".", end_of_turn=True)
        
        return False  # Signal to exit

    async def listen_audio(self):
        """Process audio from microphone to send to the model."""
        mic_info = pya.get_default_input_device_info()
        self.audio_stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=SEND_SAMPLE_RATE,
            input=True,
            input_device_index=mic_info["index"],
            frames_per_buffer=CHUNK_SIZE,
        )
        
        if __debug__:
            kwargs = {"exception_on_overflow": False}
        else:
            kwargs = {}
            
        while True:
            data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, **kwargs)
            await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})

    async def send_realtime(self):
        """Send queued media data to the model."""
        while True:
            msg = await self.out_queue.get()
            await self.session.send(input=msg)

    async def receive_audio(self):
        """Background task to read from the websocket and store audio chunks."""
        while True:
            turn = self.session.receive()
            async for response in turn:
                if data := response.data:
                    self.audio_in_queue.put_nowait(data)
                    continue
                if text := response.text:
                    print(text, end="")
                    
            # When turn is complete, reset the queue by emptying it
            while not self.audio_in_queue.empty():
                self.audio_in_queue.get_nowait()
                
            # Start listening for voice again after response is complete
            if self.last_transcription:
                self.listening = True

    async def play_audio(self):
        """Play received audio data."""
        stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE,
            output=True,
        )
        while True:
            bytestream = await self.audio_in_queue.get()
            await asyncio.to_thread(stream.write, bytestream)

    async def run(self):
        """Main execution loop."""
        try:
            print("Starting Video Chat Assistant...")
            print("- Type 'voice on' to activate voice recognition")
            print("- Type 'voice off' or 'q' during voice mode to deactivate voice recognition")
            print("- Type 'q' to quit the application")
            
            async with (
                client.aio.live.connect(model=MODEL, config=CONFIG) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session
                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=5)
                
                # Welcome message
                await session.send(input="Introduce yourself as a helpful voice and video assistant that can analyze visual content when relevant.", end_of_turn=True)
                
                # Create tasks
                send_text_task = tg.create_task(self.send_text())
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                tg.create_task(self.voice_recognition_loop())
                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())
                
                await send_text_task
                raise asyncio.CancelledError("User requested exit")
        
        except asyncio.CancelledError:
            print("\nExiting application. Goodbye!")
        except ExceptionGroup as EG:
            if hasattr(self, 'audio_stream') and self.audio_stream:
                self.audio_stream.close()
            traceback.print_exception(EG)
        finally:
            # Clean up video resources
            if self.cap and self.cap.isOpened():
                self.cap.release()

def main():
    """Main function to run the assistant."""
    # Check if API key is set
    if not os.environ.get('GOOGLE_API_KEY'):
        print("Error: GOOGLE_API_KEY environment variable is not set.")
        print("Please set it with: export GOOGLE_API_KEY='your_api_key'")
        sys.exit(1)
        
    # Create and run the assistant
    assistant = VideoChatAssistant()
    asyncio.run(assistant.run())

if __name__ == "__main__":
    main()