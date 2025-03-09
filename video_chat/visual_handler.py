"""
Visual Handler Module

Provides functionality for capturing webcam frames and screen screenshots.
"""

import io
import base64
import logging
import asyncio
import cv2
import PIL.Image
import mss
import numpy as np

from . import config

logger = logging.getLogger(__name__)

class VisualHandler:
    """Handles visual input including webcam and screenshots."""
    
    def __init__(self):
        """Initialize the visual handler."""
        self.cap = None  # Video capture device
        self.media_source = "screen"  # Default to screen capture, alternatives: "camera"
        self.setup_video_capture()
        
    def setup_video_capture(self):
        """Initialize webcam video capture."""
        try:
            self.cap = cv2.VideoCapture(0)
            if not self.cap.isOpened():
                logger.warning("Could not open video device. Webcam features will be disabled.")
                return False
            logger.info("Webcam initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Error initializing video capture: {e}")
            logger.warning("Webcam features will be disabled.")
            return False
            
    def set_media_source(self, source):
        """
        Set the media source for visual input.
        
        Args:
            source (str): Either "screen" or "camera"
            
        Returns:
            bool: True if successful, False otherwise
        """
        if source not in ["screen", "camera"]:
            logger.error(f"Invalid media source: {source}")
            return False
            
        # If switching to camera, ensure it's available
        if source == "camera" and (not self.cap or not self.cap.isOpened()):
            success = self.setup_video_capture()
            if not success:
                logger.error("Failed to set up camera as media source")
                return False
                
        self.media_source = source
        logger.info(f"Media source set to: {source}")
        return True
        
    def get_frame(self):
        """
        Capture a frame from the webcam.
        
        Returns:
            dict or None: Dictionary with mime_type and base64-encoded data, or None if failed
        """
        if not self.cap or not self.cap.isOpened():
            logger.warning("Webcam not available for capturing frame")
            return None
            
        try:
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Failed to capture frame from webcam")
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
            
            logger.debug("Captured frame from webcam")
            return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}
        except Exception as e:
            logger.error(f"Error capturing frame: {e}")
            return None
            
    def get_screenshot(self):
        """
        Capture the screen as a screenshot.
        
        Returns:
            dict or None: Dictionary with mime_type and base64-encoded data, or None if failed
        """
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
                logger.debug("Captured screenshot")
                return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}
        except Exception as e:
            logger.error(f"Error capturing screenshot: {e}")
            return None
            
    def get_visual_data(self):
        """
        Capture visual data from the current media source.
        
        Returns:
            dict or None: Dictionary with mime_type and base64-encoded data, or None if failed
        """
        if self.media_source == "camera":
            return self.get_frame()
        else:  # Default to screen
            return self.get_screenshot()
            
    def should_capture_visual(self, query):
        """
        Determine if the query needs visual context.
        
        Args:
            query (str): The user's text query
            
        Returns:
            bool: True if visual context is needed, False otherwise
        """
        if not query:
            return False
            
        query = query.lower()
        for keyword in config.VISUAL_CONTEXT_KEYWORDS:
            if keyword in query:
                logger.debug(f"Visual context needed due to keyword: {keyword}")
                return True
        return False
        
    def process_image_bytes(self, image_bytes):
        """
        Process external image bytes for use with the model.
        
        Args:
            image_bytes (bytes): Raw image bytes
            
        Returns:
            dict: Message with image data for the model
        """
        try:
            # Create message for the model
            msg = {
                "mime_type": "image/jpeg",
                "data": image_bytes
            }
            
            logger.debug("Processed external image bytes")
            return msg
        except Exception as e:
            logger.error(f"Error processing image bytes: {e}")
            return None

    def cleanup(self):
        """Clean up visual resources."""
        logger.info("Cleaning up visual resources")
        if self.cap and self.cap.isOpened():
            self.cap.release()