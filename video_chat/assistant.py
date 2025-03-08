"""
Video Chat Assistant Module

Main coordinator that brings together audio, visual and API components.
"""

import asyncio
import logging
import sys
import traceback
import time

from google import genai

from . import config
from .audio_handler import AudioHandler
from .visual_handler import VisualHandler

# For older Python versions compatibility
if sys.version_info < (3, 11, 0):
    import taskgroup, exceptiongroup
    asyncio.TaskGroup = taskgroup.TaskGroup
    asyncio.ExceptionGroup = exceptiongroup.ExceptionGroup

logger = logging.getLogger(__name__)

class VideoChatAssistant:
    """Main assistant class integrating audio, visual, and API capabilities."""
    
    def __init__(self, model=config.MODEL, start_with_voice=False):
        """
        Initialize the video chat assistant.
        
        Args:
            model (str): Gemini model to use
            start_with_voice (bool): Whether to start with voice recognition enabled
        """
        self.model = model
        self.listening = start_with_voice
        self.last_transcription = ""
        self.is_responding = False  # Flag to track if the assistant is currently responding
        self.should_stream_audio = False  # Flag to control audio streaming
        self.has_introduced = False  # Flag to track if the assistant has introduced itself
        
        # Initialize API client
        self.client = genai.Client(http_options={"api_version": config.API_VERSION})
        
        # Initialize component handlers
        self.audio = AudioHandler()
        self.visual = VisualHandler()
        
        # Session and queues will be initialized during run()
        self.session = None
        self.audio_in_queue = None
        self.out_queue = None
        
        logger.info(f"Video Chat Assistant initialized with model: {model}")
        
    async def send_text(self):
        """Process and send text input from the command line."""
        logger.info("Text input handler started")
        
        while True:
            # Only allow text input when not listening for voice
            prompt = "message > " if not self.listening else "[Listening for voice... type q to stop] > "
            try:
                text = await asyncio.to_thread(input, prompt)
                
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
                    logger.info("Quit command received")
                    break
                
                # Only process if there's actual input
                if text.strip():
                    # Mark that we're actively responding to a user query
                    self.is_responding = True
                    self.should_stream_audio = True
                    
                    # Process text input
                    await self._process_input(text)
                
            except EOFError:
                logger.error("EOF encountered in input")
                break
            except Exception as e:
                logger.error(f"Error processing text input: {e}")
                
        return False  # Signal to exit
        
    async def _process_input(self, text):
        """
        Process user input and determine if visual context is needed.
        
        Args:
            text (str): The user's text input
        """
        if not text:
            return
            
        # Check if we need visual context
        if self.visual.should_capture_visual(text):
            visual_data = self.visual.get_screenshot()
            if visual_data:
                await self.out_queue.put(visual_data)
                logger.info("Added visual context from screen")
                
        # Send the text to the model
        try:
            await self.session.send(input=text, end_of_turn=True)
            logger.debug(f"Sent text to model: {text}")
        except Exception as e:
            logger.error(f"Error sending text to model: {e}")
            
    async def voice_recognition_loop(self):
        """Background task to continuously listen for voice commands."""
        logger.info("Voice recognition loop started")
        
        while True:
            if not self.listening:
                await asyncio.sleep(0.5)
                continue
                
            success, result = await self.audio.listen_for_speech()
            
            if success:
                text = result
                self.last_transcription = text
                print(f"\nYou said: {text}")
                
                # Stop listening while processing this command
                self.listening = False
                
                # Mark that we're actively responding to a user query
                self.is_responding = True
                self.should_stream_audio = True
                
                # Process the voice input the same way as text
                await self._process_input(text)
            else:
                # If recognition failed, continue listening
                self.listening = True
                await asyncio.sleep(0.5)
                
    async def listen_audio(self):
        """Process audio from microphone to send to the model."""
        logger.info("Audio input handler started")
        
        # Set up the audio stream
        success = await self.audio.setup_audio_stream()
        if not success:
            logger.error("Failed to set up audio stream")
            return
            
        while True:
            # We only need to stream microphone audio when actively in a conversation
            # This helps prevent unwanted background noise from triggering the model
            if self.should_stream_audio:
                audio_data = await self.audio.read_audio_chunk()
                if audio_data:
                    await self.out_queue.put(audio_data)
            else:
                await asyncio.sleep(0.1)
                
    async def send_realtime(self):
        """Send queued media data to the model."""
        logger.info("Real-time media sender started")
        
        while True:
            try:
                msg = await self.out_queue.get()
                # Only send data if we're actively responding or it's a visual input
                if self.is_responding or msg.get("mime_type", "").startswith("image/"):
                    await self.session.send(input=msg)
                self.out_queue.task_done()
            except Exception as e:
                logger.error(f"Error sending real-time data: {e}")
                
    async def receive_audio(self):
        """Background task to read from the websocket and store audio chunks."""
        logger.info("Audio receiver started")
        
        while True:
            try:
                turn = self.session.receive()
                response_started = False
                
                async for response in turn:
                    if data := response.data:
                        # If this is the first chunk of a response, clear any old data
                        if not response_started:
                            response_started = True
                            self.audio.clear_audio_buffer()
                            
                        # Only buffer audio if the assistant is responding to a query
                        if self.is_responding or not self.has_introduced:
                            buffer_full = await self.audio.buffer_audio(data)
                            
                    elif text := response.text:
                        print(text, end="")
                        
                # Response is complete
                if response_started:
                    # Only handle intro once
                    if not self.has_introduced:
                        self.has_introduced = True
                    
                    # Turn off active response flag to stop listening until next user input
                    self.is_responding = False
                    self.should_stream_audio = False
                    
                    # Re-enable voice recognition after response is complete
                    if self.last_transcription:
                        self.listening = True
                    
            except Exception as e:
                logger.error(f"Error receiving audio: {e}")
                
    async def play_audio(self):
        """Play received audio data using buffering for smoother output."""
        logger.info("Audio playback handler started")
        
        # Set up the audio output stream
        stream = await self.audio.setup_audio_output()
        if not stream:
            logger.error("Failed to set up audio output stream")
            return
        
        # Larger buffer size for initial introduction to ensure smooth playback
        self.audio.buffer_size = 15
        
        while True:
            try:
                # Check if there's audio in the buffer to play
                if self.audio.audio_buffer:
                    await self.audio.play_buffered_audio(stream)
                else:
                    # Reduce polling rate when no audio to play
                    await asyncio.sleep(0.02)
                    
                # After introduction, use a smaller buffer for more responsive playback
                if self.has_introduced and self.audio.buffer_size > 8:
                    self.audio.buffer_size = 8
                    
            except Exception as e:
                logger.error(f"Error playing audio: {e}")
                await asyncio.sleep(0.1)  # Avoid tight loop on error
                
    async def run(self):
        """Main execution loop."""
        try:
            print("Starting Video Chat Assistant...")
            print("- Type 'voice on' to activate voice recognition")
            print("- Type 'voice off' or 'q' during voice mode to deactivate voice recognition")
            print("- Type 'q' to quit the application")
            
            logger.info(f"Connecting to model: {self.model}")
            async with (
                self.client.aio.live.connect(model=self.model, config=config.MODEL_CONFIG) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session
                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=config.MAX_QUEUE_SIZE)
                
                # For the welcome message only, allow audio streaming
                self.should_stream_audio = True
                
                # Welcome message - only on first run
                await session.send(input=config.INITIAL_PROMPT, end_of_turn=True)
                logger.info("Sent initial prompt to model")
                
                # Create tasks
                send_text_task = tg.create_task(self.send_text())
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                tg.create_task(self.voice_recognition_loop())
                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())
                
                # Wait until user quits
                await send_text_task
                raise asyncio.CancelledError("User requested exit")
        
        except asyncio.CancelledError:
            print("\nExiting application. Goodbye!")
        except ExceptionGroup as EG:
            logger.error("Error in task group:")
            traceback.print_exception(EG)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            traceback.print_exception(type(e), e, e.__traceback__)
        finally:
            # Clean up resources
            logger.info("Cleaning up resources")
            self.visual.cleanup()
            if hasattr(self, 'audio') and self.audio:
                self.audio.cleanup()