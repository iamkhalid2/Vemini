interface Frame {
  id: string;
  data: string; // base64 encoded image
  timestamp: number;
}

interface FrameExtractionOptions {
  targetFps: number;
  width: number;
  height: number;
  quality: number;
}

export class VideoFrameExtractor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private isActive: boolean = false;
  private lastFrameTime: number = 0;
  private frameInterval: number;
  private options: FrameExtractionOptions;
  private onFrameCallback?: (frame: Frame) => Promise<void>;

  constructor(options: Partial<FrameExtractionOptions> = {}) {
    this.options = {
      targetFps: options.targetFps || 2, // 2 fps recommended for Gemini
      width: options.width || 640,
      height: options.height || 480,
      quality: options.quality || 0.85
    };

    this.frameInterval = 1000 / this.options.targetFps;
    this.setupCanvas();
  }

  private setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.ctx = this.canvas.getContext('2d');
  }

  public async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.options.width },
          height: { ideal: this.options.height },
          frameRate: { ideal: this.options.targetFps }
        },
        audio: false
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.play();

      console.log('📹 Video frame extractor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize video frame extractor:', error);
      throw error;
    }
  }

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.extractFrames();
    console.log('▶️ Frame extraction started');
  }

  public stop(): void {
    this.isActive = false;
    console.log('⏹️ Frame extraction stopped');
  }

  public onFrame(callback: (frame: Frame) => Promise<void>): void {
    this.onFrameCallback = callback;
  }

  private async extractFrames(): Promise<void> {
    if (!this.isActive || !this.video || !this.canvas || !this.ctx) return;

    const currentTime = performance.now();
    const timeSinceLastFrame = currentTime - this.lastFrameTime;

    if (timeSinceLastFrame >= this.frameInterval) {
      try {
        // Extract frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Convert to base64
        const base64Data = this.canvas.toDataURL('image/jpeg', this.options.quality);
        
        // Create frame object
        const frame: Frame = {
          id: `frame-${Date.now()}`,
          data: base64Data.split(',')[1], // Remove data URL prefix
          timestamp: Date.now()
        };

        // Send frame through callback
        if (this.onFrameCallback) {
          await this.onFrameCallback(frame);
        }

        this.lastFrameTime = currentTime;
      } catch (error) {
        console.error('❌ Error extracting frame:', error);
      }
    }

    // Schedule next frame
    requestAnimationFrame(() => this.extractFrames());
  }

  public setOptions(options: Partial<FrameExtractionOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    this.frameInterval = 1000 / this.options.targetFps;

    if (this.canvas) {
      this.canvas.width = this.options.width;
      this.canvas.height = this.options.height;
    }
  }

  public dispose(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.stream = null;
  }

  public getStatus(): {
    isActive: boolean;
    fps: number;
    resolution: { width: number; height: number };
  } {
    return {
      isActive: this.isActive,
      fps: this.options.targetFps,
      resolution: {
        width: this.options.width,
        height: this.options.height
      }
    };
  }
}