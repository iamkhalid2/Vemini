"""
Vercel-specific FastAPI entry point
"""

from .index import app

# This is required for Vercel serverless deployment
# It exports the FastAPI app instance for Vercel's serverless function handler