let processingEnabled = true;
let frameBuffer: Array<{
  id: string;
  data: string;
  timestamp: number;
}> = [];

const MAX_BUFFER_SIZE = 5;
const PROCESS_INTERVAL = 500; // ms between frame processing

// Process frames from the buffer
async function processFrameBuffer() {
  if (!processingEnabled || frameBuffer.length === 0) return;

  const frame = frameBuffer[frameBuffer.length - 1]; // Get most recent frame
  frameBuffer = []; // Clear buffer after getting frame

  // Post the frame back to main thread for processing
  self.postMessage({
    type: 'FRAME_READY',
    frame
  });

  // Schedule next processing
  setTimeout(processFrameBuffer, PROCESS_INTERVAL);
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'ADD_FRAME':
      // Add frame to buffer, removing oldest if full
      if (frameBuffer.length >= MAX_BUFFER_SIZE) {
        frameBuffer.shift();
      }
      frameBuffer.push(data);
      break;

    case 'START_PROCESSING':
      processingEnabled = true;
      processFrameBuffer();
      break;

    case 'STOP_PROCESSING':
      processingEnabled = false;
      frameBuffer = [];
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

// Error handling
self.addEventListener('error', (event: ErrorEvent) => {
  self.postMessage({
    type: 'ERROR',
    error: event.message || 'Unknown error in video processor'
  });
});