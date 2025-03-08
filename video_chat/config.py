"""
Configuration settings for the Video Chat Assistant
"""

# Audio configuration
FORMAT_INT16 = 16  # PyAudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000  # Input audio sampling rate
RECEIVE_SAMPLE_RATE = 24000  # Output audio sampling rate
CHUNK_SIZE = 1024  # Audio processing chunk size

# Gemini model selection
MODEL = "gemini-2.0-flash-exp"  # Default model - must use the experimental version for Live API
API_VERSION = "v1alpha"  # API version for Live API
MODEL_CONFIG = {"response_modalities": ["AUDIO"]}  # Default Gemini config

# Voice Recognition Settings
# No default timeout - let the recognizer wait for complete phrases
PHRASE_TIME_LIMIT = 10  # Maximum time to listen for a single phrase (seconds)
RESPONSE_BUFFER_SIZE = 20  # Increased buffer size for smoother responses
PLAYBACK_DELAY = 0.01  # Small delay between chunks for smoother playback (seconds)

# Context clues that indicate visual context is needed
VISUAL_CONTEXT_KEYWORDS = [
    "see", "look", "screen", "showing", "display", "shown",
    "visual", "image", "picture", "photo", "view", "monitor",
    "camera", "webcam", "what's on", "what is on"
]

# Application settings
INITIAL_PROMPT = "Introduce yourself as a helpful voice and video assistant that can analyze visual content when relevant."
MAX_QUEUE_SIZE = 5