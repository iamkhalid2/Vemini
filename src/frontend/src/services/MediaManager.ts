interface MediaCallbacks {
  onVideoFrame?: (frame: ImageData) => void;
  onVoiceData?: (audio: Blob) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onError?: (error: Error) => void;
}

export class MediaManager {
  private videoStream: MediaStream | null = null;
  private videoContext: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private frameInterval: number | null = null;
  private audioChunks: Blob[] = [];
  private callbacks: MediaCallbacks = {};
  private isRecordingVoice = false;

  constructor(private fps: number = 2) {}

  public async startCamera(width: number = 1280, height: number = 720): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user'
        }
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.videoStream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;

      // Create canvas for frame extraction
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.videoContext = this.canvas.getContext('2d');

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (this.videoElement) {
          this.videoElement.onloadedmetadata = () => resolve();
        }
      });

      // Start frame extraction
      this.startFrameExtraction();
    } catch (error) {
      this.handleError(error);
    }
  }

  public async startVoiceInput(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          // Convert to proper format and emit
          const audioBlob = new Blob([event.data], { type: 'audio/webm;codecs=opus' });
          this.callbacks.onVoiceData?.(audioBlob);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecordingVoice = true;
        this.audioChunks = [];
        this.callbacks.onVoiceStart?.();
      };

      this.mediaRecorder.onstop = () => {
        this.isRecordingVoice = false;
        this.callbacks.onVoiceEnd?.();
      };

      this.mediaRecorder.start(100); // Capture in 100ms chunks
    } catch (error) {
      this.handleError(error);
    }
  }

  public stopVoiceInput(): void {
    if (this.mediaRecorder && this.isRecordingVoice) {
      this.mediaRecorder.stop();
      this.isRecordingVoice = false;
    }
  }

  public stopCamera(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    this.videoElement = null;
    this.canvas = null;
    this.videoContext = null;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public setCallbacks(callbacks: MediaCallbacks): void {
    this.callbacks = callbacks;
  }

  public isVoiceRecording(): boolean {
    return this.isRecordingVoice;
  }

  private startFrameExtraction(): void {
    if (!this.videoElement || !this.videoContext || !this.canvas) return;

    const interval = 1000 / this.fps; // Convert fps to milliseconds
    this.frameInterval = window.setInterval(() => {
      try {
        // Draw current video frame to canvas
        this.videoContext.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get frame data
        const frameData = this.videoContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Emit frame
        this.callbacks.onVideoFrame?.(frameData);
      } catch (error) {
        this.handleError(error);
      }
    }, interval);
  }

  private handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('MediaManager error:', err);
    this.callbacks.onError?.(err);
  }

  public dispose(): void {
    this.stopCamera();
    this.stopVoiceInput();
  }
}