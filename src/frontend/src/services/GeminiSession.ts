interface GeminiResponse {
  text?: string;
  audio?: Blob;
  error?: string;
}

interface SessionConfig {
  apiKey: string;
  model: string;
  responseModalities: ('TEXT' | 'AUDIO')[];
}

export class GeminiSession {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private responseHandler: ((response: GeminiResponse) => void) | null = null;
  private config: SessionConfig;

  constructor(config: SessionConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In production, this should go through your backend server
        const wsUrl = `wss://generativelanguage.googleapis.com/v1/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.sendSessionConfig();
          resolve();
        };

        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('WebSocket connection closed');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public sendVideoFrame(frame: ImageData): Promise<void> {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('Not connected'));
    }

    const message = {
      realtimeInput: {
        mediaChunks: [this.convertFrameToBlob(frame)]
      }
    };

    return this.send(message);
  }

  public sendVoiceInput(audio: Blob): Promise<void> {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('Not connected'));
    }

    const message = {
      realtimeInput: {
        mediaChunks: [audio]
      }
    };

    return this.send(message);
  }

  public sendTextInput(text: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      return Promise.reject(new Error('Not connected'));
    }

    const message = {
      clientContent: {
        turns: [{
          parts: [{ text }],
          role: "user"
        }],
        turnComplete: true
      }
    };

    return this.send(message);
  }

  public onResponse(callback: (response: GeminiResponse) => void): void {
    this.responseHandler = callback;
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private async send(message: any): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  private sendSessionConfig(): void {
    const setupMessage = {
      setup: {
        model: this.config.model,
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          responseModalities: this.config.responseModalities
        }
      }
    };

    this.send(setupMessage);
  }

  private async convertFrameToBlob(frame: ImageData): Promise<Blob> {
    // Convert ImageData to base64 using canvas
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.putImageData(frame, 0, 0);
    
    // Get as blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert frame to blob'));
      }, 'image/jpeg', 0.8);
    });
  }

  private handleMessage(event: MessageEvent): void {
    if (!this.responseHandler) return;

    try {
      if (event.data instanceof Blob) {
        // Handle audio response
        this.responseHandler({ audio: event.data });
      } else {
        // Handle text response
        const data = JSON.parse(event.data);
        if (data.serverContent?.modelTurn?.parts) {
          const text = data.serverContent.modelTurn.parts
            .map((part: any) => part.text)
            .filter(Boolean)
            .join(' ');
          
          if (text) {
            this.responseHandler({ text });
          }
        }
        
        if (data.error) {
          this.responseHandler({ error: data.error.message || 'Unknown error' });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.responseHandler({ error: 'Failed to process response' });
    }
  }
}