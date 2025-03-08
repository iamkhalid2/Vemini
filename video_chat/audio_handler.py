"""
Audio Handler Module

Provides functionality for audio input/output, speech recognition, and audio playback.
"""

import asyncio
import logging
import pyaudio
import speech_recognition as sr

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
        
        # Initialize microphone
        self.setup_microphone()
        
    def setup_microphone(self):
        """Initialize the microphone and calibrate for ambient noise."""
        try:
            self.microphone = sr.Microphone()
            with self.microphone as source:
                logger.info("Calibrating microphone for ambient noise... Please wait.")
                self.recognizer.adjust_for_ambient_noise(source, duration=2)
                logger.info("Microphone calibration complete!")
            return True
        except Exception as e:
            logger.error(f"Error initializing microphone: {e}")
            logger.warning("Voice recognition will be disabled. You can use text input instead.")
            return False
            
    async def listen_for_speech(self, timeout=config.DEFAULT_TIMEOUT):
        """
        Listen for speech and transcribe it.
        
        Returns:
            tuple: (success, text or error_message)
        """
        if not self.microphone:
            return False, "Microphone not initialized"
            
        try:
            with self.microphone as source:
                logger.info("Listening for speech... (Say something)")
                audio = self.recognizer.listen(source, timeout=timeout)
                
            try:
                # Recognize speech using Google Speech Recognition
                text = self.recognizer.recognize_google(audio)
                logger.info(f"Recognized speech: {text}")
                return True, text
            except sr.UnknownValueError:
                logger.warning("Could not understand audio")
                return False, "Could not understand audio"
            except sr.RequestError as e:
                logger.error(f"Error with speech recognition service: {e}")
                return False, f"Service error: {str(e)}"
                
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
            
    async def play_audio(self, stream, audio_data):
        """Play audio data through the given stream."""
        try:
            await asyncio.to_thread(stream.write, audio_data)
            return True
        except Exception as e:
            logger.error(f"Error playing audio: {e}")
            return False
            
    async def setup_audio_output(self):
        """Set up the audio output stream."""
        try:
            return await asyncio.to_thread(
                self.pya.open,
                format=self.pya.get_format_from_width(config.FORMAT_INT16 // 8),
                channels=config.CHANNELS,
                rate=config.RECEIVE_SAMPLE_RATE,
                output=True,
            )
        except Exception as e:
            logger.error(f"Error setting up audio output: {e}")
            return None
            
    def cleanup(self):
        """Clean up audio resources."""
        logger.info("Cleaning up audio resources")
        if self.audio_stream:
            self.audio_stream.stop_stream()
            self.audio_stream.close()
        self.pya.terminate()