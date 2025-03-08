#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Video Chat Assistant - Main entry point

This script serves as the entry point for the Video Chat Assistant application.

To run the script:
```
python main.py
```

Or with options:
```
python main.py --help
```
"""

import os
import sys
import asyncio
import argparse
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from dotenv import load_dotenv

from video_chat import config
from video_chat.assistant import VideoChatAssistant

def load_environment():
    """Load environment variables from .env file."""
    # Try to find .env file in current directory or parent directories
    env_path = Path('.') / '.env'
    if not env_path.exists():
        # Look for .env in the parent directory if not found in current directory
        env_path = Path('..') / '.env'
    
    # Load environment variables from .env file
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        return True
    else:
        print("Warning: .env file not found. Make sure to set GOOGLE_API_KEY manually.")
        return False

def setup_logging(log_level=logging.INFO):
    """Set up logging configuration."""
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_format = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_format)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        'logs/video_chat.log', 
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    file_handler.setLevel(log_level)
    file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_format)
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Video Chat Assistant using Gemini 2.0')
    
    # Get default model from environment or config
    default_model = os.environ.get('MODEL', config.MODEL)
    
    parser.add_argument('--model', default=default_model,
                       help=f'Gemini model to use (default: {default_model})')
    
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug logging')
    
    parser.add_argument('--voice-on', action='store_true',
                       help='Start with voice recognition enabled')
    
    return parser.parse_args()

def check_api_key():
    """Check if the API key is set in environment variables."""
    if not os.environ.get('GOOGLE_API_KEY'):
        print("Error: GOOGLE_API_KEY environment variable is not set.")
        print("Please set it by:")
        print("1. Adding your API key to the .env file, or")
        print("2. Setting it manually with:")
        if sys.platform.startswith('win'):
            print("    set GOOGLE_API_KEY=your_api_key")
        else:
            print("    export GOOGLE_API_KEY=your_api_key")
        sys.exit(1)

async def main():
    """Main function to run the assistant."""
    # Load environment variables from .env file
    load_environment()
    
    args = parse_arguments()
    
    # Get log level from environment or use command line argument
    env_log_level = os.environ.get('LOG_LEVEL', 'INFO' if not args.debug else 'DEBUG')
    log_level = getattr(logging, env_log_level.upper(), logging.INFO)
    
    # Setup logging
    logger = setup_logging(log_level)
    
    # Check for API key
    check_api_key()
    
    # Create and run the assistant
    logger.info("Initializing Video Chat Assistant")
    assistant = VideoChatAssistant(
        model=args.model,
        start_with_voice=args.voice_on
    )
    
    await assistant.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nApplication terminated by user. Goodbye!")
        sys.exit(0)