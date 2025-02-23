export interface VoiceManagerEvents {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onPartialResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: Error) => void;
}

export class VoiceManager {
  private recognition: ISpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private events: VoiceManagerEvents;
  private isListening: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(events: VoiceManagerEvents) {
    this.events = events;
    this.synthesis = window.speechSynthesis;
    this.setupVoices();
  }

  private setupVoices() {
    // Load available voices
    this.voices = this.synthesis.getVoices();
    this.synthesis.onvoiceschanged = () => {
      this.voices = this.synthesis.getVoices();
    };
  }

  private setupRecognition() {
    const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (!SpeechRecognitionConstructor) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const recognition = new SpeechRecognitionConstructor() as ISpeechRecognition;

    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.addEventListener('start', () => {
      this.isListening = true;
      this.events.onSpeechStart();
    });

    recognition.addEventListener('end', () => {
      this.isListening = false;
      this.events.onSpeechEnd();
    });

    recognition.addEventListener('result', (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      const results = speechEvent.results;
      for (let i = speechEvent.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          this.events.onFinalResult(transcript);
        } else {
          this.events.onPartialResult(transcript);
        }
      }
    });

    recognition.addEventListener('error', (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      this.events.onError(new Error(errorEvent.error));
    });

    this.recognition = recognition;
  }

  public async startListening(): Promise<void> {
    if (!this.recognition) {
      this.setupRecognition();
    }

    if (this.isListening || !this.recognition) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recognition.start();
    } catch (error) {
      this.events.onError(error instanceof Error ? error : new Error('Failed to start listening'));
    }
  }

  public stopListening(): void {
    if (!this.isListening || !this.recognition) return;
    this.recognition.stop();
  }

  public async speak(text: string, options: {
    voice?: SpeechSynthesisVoice;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      if (options.voice) utterance.voice = options.voice;
      if (options.rate) utterance.rate = options.rate;
      if (options.pitch) utterance.pitch = options.pitch;
      if (options.volume) utterance.volume = options.volume;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synthesis.speak(utterance);
    });
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  public cancelSpeaking(): void {
    this.synthesis.cancel();
  }

  public dispose(): void {
    this.stopListening();
    this.cancelSpeaking();
    this.recognition = null;
  }
}