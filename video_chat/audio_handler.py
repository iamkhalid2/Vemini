"""
Audio Handler Module

Provides functionality for audio input/output, speech recognition, and audio playback.
"""

import asyncio
import logging
import pyaudio
import speech_recognition as sr
import numpy as np
import time

from . import config

logger = logging.getLogger(__name__)

class AudioHandler:
    """Handles audio input/output and speech recognition."""
    
    def __init__(self):
        """Initialize the audio handler."""
        self.recognizer = sr.Recognizer()
        self.microphone = None
        self.audio_stream = None
        self.pya = pyaudio.PyAudio()
        self.audio_buffer = []  # Buffer for smoothing audio playback
        self.buffer_size = config.RESPONSE_BUFFER_SIZE  # Using config for buffer size
        
        # Speech detection parameters - improved for better detection
        self.energy_threshold = 300  # Default energy threshold for speech detection
        self.dynamic_energy_threshold = True  # Dynamically adjust for ambient noise
        self.pause_threshold = 1.0  # Seconds of non-speaking audio before a phrase is considered complete
        self.phrase_threshold = 0.3  # Minimum seconds of speaking audio before we consider the speaking audio a phrase
        self.non_speaking_duration = 0.8  # Seconds of non-speaking audio to keep on both sides of recording
        
        # Initialize microphone
        self.setup_microphone()
        
    def setup_microphone(self):
        """Initialize the microphone and calibrate for ambient noise."""
        try:
            self.microphone = sr.Microphone()
            with self.microphone as source:
                logger.info("Calibrating microphone for ambient noise... Please wait.")
                # More thorough calibration
                self.recognizer.adjust_for_ambient_noise(source, duration=3)
                # Apply calibrated values to our instance
                self.energy_threshold = self.recognizer.energy_threshold
                # Add a buffer to the energy threshold to reduce false triggers
                self.recognizer.energy_threshold = self.energy_threshold * 1.2
                logger.info(f"Microphone calibration complete! Energy threshold: {self.energy_threshold}")
            return True
        except Exception as e:
            logger.error(f"Error initializing microphone: {e}")
            logger.warning("Voice recognition will be disabled. You can use text input instead.")
            return False
            
    async def listen_for_speech(self, timeout=None):
        """
        Listen for speech and transcribe it. Improved to wait for complete phrases.
        
        Args:
            timeout: Maximum number of seconds to wait for speech to start. None means wait indefinitely.
        
        Returns:
            tuple: (success, text or error_message)
        """
        if not self.microphone:
            return False, "Microphone not initialized"
            
        try:
            with self.microphone as source:
                # Configure the recognizer for better speech detection
                self.recognizer.energy_threshold = self.energy_threshold
                self.recognizer.dynamic_energy_threshold = self.dynamic_energy_threshold
                self.recognizer.pause_threshold = self.pause_threshold
                self.recognizer.phrase_threshold = self.phrase_threshold
                self.recognizer.non_speaking_duration = self.non_speaking_duration
                
                logger.info("Listening for speech... (Say something)")
                print("\nListening... (speak clearly and I'll wait for you to finish)")
                
                # Listen without a timeout, but with a phrase time limit
                # This allows the recognizer to wait for speech to begin
                # and automatically stop when speech ends
                audio = self.recognizer.listen(
                    source, 
                    timeout=timeout,  # None = wait indefinitely for speech to start
                    phrase_time_limit=config.PHRASE_TIME_LIMIT  # Maximum duration for a single phrase
                )
                
            try:
                # Recognize speech using Google Speech Recognition
                logger.info("Recognizing speech...")
                print("Processing your complete message...")
                text = self.recognizer.recognize_google(audio)
                logger.info(f"Recognized speech: {text}")
                return True, text
            except sr.UnknownValueError:
                logger.warning("Could not understand audio")
                return False, "Could not understand audio"
            except sr.RequestError as e:
                logger.error(f"Error with speech recognition service: {e}")
                return False, f"Service error: {str(e)}"
                
        except sr.WaitTimeoutError:
            logger.warning("No speech detected within timeout period")
            return False, "No speech detected. Please try again."
        except Exception as e:
            logger.error(f"Error in voice recognition: {e}")
            return False, str(e)
            
    async def setup_audio_stream(self):
        """Setup the audio input stream."""
        try:
            mic_info = self.pya.get_default_input_device_info()
            self.audio_stream = await asyncio.to_thread(
                self.pya.open,
                format=self.pya.get_format_from_width(config.FORMAT_INT16 // 8),
                channels=config.CHANNELS,
                rate=config.SEND_SAMPLE_RATE,
                input=True,
                input_device_index=mic_info["index"],
                frames_per_buffer=config.CHUNK_SIZE,
            )
            logger.info("Audio input stream initialized")
            return True
        except Exception as e:
            logger.error(f"Error setting up audio stream: {e}")
            return False
            
    async def read_audio_chunk(self):
        """Read a chunk of audio data from the microphone."""
        if not self.audio_stream:
            return None
            
        kwargs = {"exception_on_overflow": False} if __debug__ else {}
        try:
            data = await asyncio.to_thread(self.audio_stream.read, config.CHUNK_SIZE, **kwargs)
            return {"data": data, "mime_type": "audio/pcm"}
        except Exception as e:
            logger.error(f"Error reading audio: {e}")
            return None
            
    async def buffer_audio(self, audio_data):
        """
        Add audio data to buffer for smoother playback.
        
        Returns:
            bool: True if buffer is full and ready for playback
        """
        self.audio_buffer.append(audio_data)
        return len(self.audio_buffer) >= self.buffer_size
            
    async def play_audio(self, stream, audio_data):
        """Play audio data through the given stream."""
        try:
            await asyncio.to_thread(stream.write, audio_data)
            return True
        except Exception as e:
            logger.error(f"Error playing audio: {e}")
            return False
            
    async def play_buffered_audio(self, stream):
        """
        Play all audio in the buffer with improved smoothness.
        
        Args:
            stream: Audio output stream
        
        Returns:
            bool: True if successful
        """
        try:
            if not self.audio_buffer:
                return False
                
            # Use a local copy and clear the main buffer to avoid blocking
            buffer_copy = self.audio_buffer.copy()
            self.audio_buffer.clear()
            
            # Play all audio chunks in the buffer
            for chunk in buffer_copy:
                await asyncio.to_thread(stream.write, chunk)
                # Small delay between chunks for smoother playback
                await asyncio.sleep(config.PLAYBACK_DELAY)
                
            return True
        except Exception as e:
            logger.error(f"Error playing buffered audio: {e}")
            return False
            
    async def setup_audio_output(self):
        """Set up the audio output stream with improved buffering."""
        try:
            output_stream = await asyncio.to_thread(
                self.pya.open,
                format=self.pya.get_format_from_width(config.FORMAT_INT16 // 8),
                channels=config.CHANNELS,
                rate=config.RECEIVE_SAMPLE_RATE,
                output=True,
                frames_per_buffer=config.CHUNK_SIZE * 4,  # Much larger buffer for smoother playback
            )
            logger.info("Audio output stream initialized")
            return output_stream
        except Exception as e:
            logger.error(f"Error setting up audio output: {e}")
            return None
            
    def clear_audio_buffer(self):
        """Clear the audio buffer."""
        self.audio_buffer.clear()
            
    def recalibrate_for_ambient_noise(self, duration=2):
        """Recalibrate the recognizer for ambient noise."""
        if not self.microphone:
            logger.warning("Cannot recalibrate: microphone not initialized")
            return False
            
        try:
            with self.microphone as source:
                logger.info(f"Recalibrating for ambient noise (duration: {duration}s)...")
                self.recognizer.adjust_for_ambient_noise(source, duration=duration)
                self.energy_threshold = self.recognizer.energy_threshold
                logger.info(f"Recalibration complete. New energy threshold: {self.energy_threshold}")
                return True
        except Exception as e:
            logger.error(f"Error during recalibration: {e}")
            return False
            
    def cleanup(self):
        """Clean up audio resources."""
        logger.info("Cleaning up audio resources")
        if self.audio_stream:
            self.audio_stream.stop_stream()
            self.audio_stream.close()
        self.pya.terminate()