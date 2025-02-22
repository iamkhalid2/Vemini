export interface VideoChunk {
  id: string;
  data: Blob | Buffer;
  timestamp: number;
  duration: number;
}

interface ChunkProcessingResult {
  chunkId: string;
  analysis: any;
  timestamp: number;
}

/**
 * VideoChunker handles the capture and processing of video chunks
 * for near real-time analysis using Gemini API
 */
export class VideoChunker {
  private readonly chunkDuration: number;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: VideoChunk[] = [];
  private isRecording: boolean = false;
  private currentChunkStartTime: number = 0;
  private onChunkCallback?: (chunk: VideoChunk) => Promise<void>;

  constructor(options: { chunkDuration: number }) {
    this.chunkDuration = options.chunkDuration;
  }

  /**
   * Initialize video capture from the user's camera
   */
  public async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.setupMediaRecorderEvents();
    } catch (error) {
      console.error('Failed to initialize video capture:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for the MediaRecorder
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const chunk: VideoChunk = {
          id: `chunk-${Date.now()}`,
          data: event.data,
          timestamp: this.currentChunkStartTime,
          duration: this.chunkDuration
        };

        this.chunks.push(chunk);
        
        // If there's a callback registered, process the chunk
        if (this.onChunkCallback) {
          await this.onChunkCallback(chunk);
        }
      }
    };

    // Start the next chunk recording when the current one stops
    this.mediaRecorder.onstop = () => {
      if (this.isRecording) {
        this.startNewChunk();
      }
    };
  }

  /**
   * Start capturing video chunks
   */
  public start(): void {
    if (this.isRecording || !this.mediaRecorder) return;
    
    this.isRecording = true;
    this.startNewChunk();
  }

  /**
   * Stop capturing video chunks
   */
  public stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.isRecording = false;
    this.mediaRecorder.stop();
  }

  /**
   * Start recording a new chunk
   */
  private startNewChunk(): void {
    if (!this.mediaRecorder || !this.isRecording) return;

    this.currentChunkStartTime = Date.now();
    this.mediaRecorder.start();

    // Schedule the stop of this chunk
    setTimeout(() => {
      if (this.mediaRecorder?.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, this.chunkDuration);
  }

  /**
   * Register a callback to be called when a new chunk is available
   */
  public onChunk(callback: (chunk: VideoChunk) => Promise<void>): void {
    this.onChunkCallback = callback;
  }

  /**
   * Get the last N chunks
   */
  public getRecentChunks(count: number): VideoChunk[] {
    return this.chunks.slice(-count);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.chunks = [];
    this.mediaRecorder = null;
    this.stream = null;
  }
}