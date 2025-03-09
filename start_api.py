"""
Development server starter script for the Video Chat Assistant API
"""

import uvicorn

if __name__ == "__main__":
    print("Starting Video Chat Assistant API development server...")
    print("API will be available at http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    uvicorn.run("api.index:app", host="0.0.0.0", port=8000, reload=True)