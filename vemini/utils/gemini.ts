import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Initialize the model
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-pro-preview-02-05",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
  },
});

// Initialize chat
export const startChat = async () => {
  return model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 2048,
    },
  });
};

// Process video frame
export const processVideoFrame = async (frame: string, chat: any) => {
  try {
    const result = await chat.sendMessage([{
      inlineData: {
        data: frame,
        mimeType: "image/jpeg"
      }
    }]);

    return result.response.text();
  } catch (error) {
    console.error('Error processing video frame:', error);
    return null;
  }
};

// Process voice input
export const processVoiceInput = async (chat: any, audioBlob: Blob) => {
  try {
    const result = await chat.sendMessage([{
      inlineData: {
        data: await blobToBase64(audioBlob),
        mimeType: "audio/webm"
      }
    }]);

    return result.response.text();
  } catch (error) {
    console.error('Error processing voice input:', error);
    return null;
  }
};

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const geminiConfig = {
  model,
  genAI,
};
