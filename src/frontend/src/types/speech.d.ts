interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: string, callback: Function): void;
  removeEventListener(type: string, callback: Function): void;
  abort(): void;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
  prototype: ISpeechRecognition;
}

declare global {
  const SpeechRecognition: ISpeechRecognitionConstructor | undefined;
  const webkitSpeechRecognition: ISpeechRecognitionConstructor | undefined;
  
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor | undefined;
    webkitSpeechRecognition: ISpeechRecognitionConstructor | undefined;
  }
}