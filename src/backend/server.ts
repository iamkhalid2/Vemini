import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { GeminiProcessor } from '../utils/GeminiProcessor';

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const WS_PING_INTERVAL = parseInt(process.env.WS_PING_INTERVAL || '30000', 10);
const WS_PING_TIMEOUT = parseInt(process.env.WS_PING_TIMEOUT || '5000', 10);

// Frame processing queue
interface QueueItem {
  frame: { id: string; data: string; timestamp: number };
  socket: any;
}

class FrameQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private processor: GeminiProcessor;
  private maxQueueSize = 10;
  private processDelay = 500; // 500ms between frames

  constructor(processor: GeminiProcessor) {
    this.processor = processor;
  }

  async enqueue(item: QueueItem): Promise<void> {
    // If queue is full, remove oldest frame
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    this.queue.push(item);
    
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const item = this.queue.shift();
    
    if (item) {
      try {
        console.log(`📸 Processing frame: ${item.frame.id}`);
        const analysis = await this.processor.processFrame(item.frame);
        
        item.socket.emit('analysis-result', analysis);
        console.log(`✨ Analysis complete for frame: ${item.frame.id}`);
        console.log(`   Objects detected: ${analysis.objects.length}`);
        console.log(`   Actions detected: ${analysis.actions.length}`);
      } catch (error) {
        console.error('❌ Error processing frame:', error);
        item.socket.emit('error', {
          message: 'Failed to process frame',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
      }

      // Add delay before processing next frame
      await new Promise(resolve => setTimeout(resolve, this.processDelay));
      this.processQueue();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const app = express();
const httpServer = createServer(app);

// Configure CORS with specific origin
const io = new SocketServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: WS_PING_INTERVAL,
  pingTimeout: WS_PING_TIMEOUT
});

// Enable CORS for REST endpoints
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

// Initialize Gemini processor and frame queue
const geminiProcessor = new GeminiProcessor(GEMINI_API_KEY);
const frameQueue = new FrameQueue(geminiProcessor);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected');

  // Send initial connection status
  socket.emit('connection_status', { 
    status: 'connected',
    timestamp: Date.now()
  });

  // Handle incoming video frames
  socket.on('video-frame', async (frame: { id: string; data: string; timestamp: number }) => {
    console.log(`📸 Received frame: ${frame.id}`);
    
    // Add frame to processing queue
    await frameQueue.enqueue({ frame, socket });

    // Send queue status
    socket.emit('queue-status', {
      queueLength: frameQueue.getQueueLength(),
      timestamp: Date.now()
    });
  });

  // Handle voice commands
  socket.on('voice-command', async (command: string) => {
    try {
      console.log('\n👤 User:', command);

      // Generate response using Gemini processor
      const response = await geminiProcessor.generateVoiceResponse(command);
      
      console.log('🤖 Assistant:', response);
      console.log('-------------------------------------------');

      // Send response back to client
      socket.emit('voice-response', {
        response,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      socket.emit('error', {
        message: 'Failed to process voice command',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  });

  // Handle ping
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', reason);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now(),
    wsClients: io.engine.clientsCount,
    queueLength: frameQueue.getQueueLength(),
    processor: {
      context: geminiProcessor.getContext()
    }
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server accepting connections from: ${CORS_ORIGIN}`);
  console.log('-------------------------------------------\n');
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});