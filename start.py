#!/usr/bin/env python
"""
Start Script - Launches both backend and frontend automatically

This script:
1. Activates the virtual environment
2. Starts the FastAPI backend server
3. Waits for the backend to be ready
4. Launches the React frontend
"""

import os
import sys
import time
import subprocess
import requests
import webbrowser
from pathlib import Path

# Configuration
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
MAX_RETRIES = 30  # Maximum number of retries to check if backend is ready
RETRY_INTERVAL = 1  # Seconds to wait between retries

def is_windows():
    """Check if the script is running on Windows."""
    return sys.platform.startswith("win")

def get_venv_activation_command():
    """Get the appropriate command to activate the virtual environment."""
    base_dir = Path(__file__).resolve().parent
    
    if is_windows():
        activate_script = base_dir / "myenv" / "Scripts" / "activate.bat"
        if not activate_script.exists():
            activate_script = base_dir / "venv" / "Scripts" / "activate.bat"
        return f"call {activate_script}"
    else:
        activate_script = base_dir / "myenv" / "bin" / "activate"
        if not activate_script.exists():
            activate_script = base_dir / "venv" / "bin" / "activate"
        return f"source {activate_script}"

def start_backend():
    """Start the FastAPI backend server."""
    print("Starting backend server...")
    
    # Create the command to run the backend server
    activate_cmd = get_venv_activation_command()
    
    if is_windows():
        # On Windows, we need to use cmd.exe
        backend_cmd = f"{activate_cmd} && python start_api.py"
        process = subprocess.Popen(
            backend_cmd,
            shell=True,
            creationflags=subprocess.CREATE_NEW_CONSOLE  # Open in a new window
        )
    else:
        # On Unix-like systems
        backend_cmd = f"{activate_cmd} && python start_api.py"
        process = subprocess.Popen(
            backend_cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid  # Create a new process group
        )
    
    return process

def wait_for_backend():
    """Wait for the backend server to be ready."""
    print(f"Waiting for backend to be ready at {BACKEND_URL}...")
    
    for i in range(MAX_RETRIES):
        try:
            response = requests.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                print("Backend server is ready!")
                return True
        except requests.ConnectionError:
            pass
            
        print(f"Waiting for backend server... {i+1}/{MAX_RETRIES}")
        time.sleep(RETRY_INTERVAL)
    
    print("Failed to connect to backend server after maximum retries")
    return False

def start_frontend():
    """Start the React frontend."""
    print("Starting frontend...")
    
    client_dir = Path(__file__).resolve().parent / "client"
    
    # Check if we need to install dependencies first
    node_modules = client_dir / "node_modules"
    if not node_modules.exists():
        print("Installing frontend dependencies...")
        if is_windows():
            subprocess.run("npm install", shell=True, cwd=client_dir)
        else:
            subprocess.run(["npm", "install"], cwd=client_dir)
    
    # Start the frontend development server
    if is_windows():
        process = subprocess.Popen(
            "npm start",
            shell=True,
            cwd=client_dir,
            creationflags=subprocess.CREATE_NEW_CONSOLE  # Open in a new window
        )
    else:
        process = subprocess.Popen(
            ["npm", "start"],
            cwd=client_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid  # Create a new process group
        )
    
    return process

def open_browser():
    """Open the browser to the frontend URL."""
    print(f"Opening {FRONTEND_URL} in your web browser...")
    webbrowser.open(FRONTEND_URL)

def main():
    """Main function."""
    try:
        # Start the backend server
        backend_process = start_backend()
        
        # Wait for the backend server to be ready
        if not wait_for_backend():
            print("Error: Backend server failed to start or is not responding.")
            return
        
        # Start the frontend
        frontend_process = start_frontend()
        
        # Wait a moment and then open the browser
        time.sleep(3)
        open_browser()
        
        print("\n=== Vemini Video Chat Assistant is running ===")
        print(f"Backend server: {BACKEND_URL}")
        print(f"Frontend: {FRONTEND_URL}")
        print("\nPress Ctrl+C to stop both servers\n")
        
        # Keep the main process running until interrupted
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
        # The backend and frontend processes will be terminated automatically
        # when the main process exits
        
if __name__ == "__main__":
    main()