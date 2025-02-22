import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { VideoChunk } from './VideoChunker';

interface ProcessingContext {
  recentObjects: Array<{
    name: string;
    lastSeenAt: number;
    position?: { x: number; y: number };
  }>;
  sceneDescription?: string;
  lastProcessedTimestamp: number;
}

interface AnalysisResult {
  objects: Array<{
    name: string;
    position?: { x: number; y: number };
    confidence: number;
  }>;
  sceneDescription: string;
  relationships: Array<{
    object1: string;
    object2: string;
    relationship: string;
  }>;
  timestamp: number;
}

export class GeminiProcessor {
  private model: GenerativeModel;
  private context: ProcessingContext;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.context = {
      recentObjects: [],
      lastProcessedTimestamp: 0
    };
    
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  /**
   * Process a video chunk using Gemini API
   */
  public async processChunk(chunk: VideoChunk): Promise<AnalysisResult> {
    try {
      // Convert video data to base64
      const base64Data = await this.convertToBase64(chunk.data);
      
      // Create prompt with context
      const prompt = this.createAnalysisPrompt();

      // Prepare parts for Gemini API
      const parts: Part[] = [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'video/webm',
            data: base64Data
          }
        }
      ];

      // Generate content with Gemini
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      const analysis = this.parseGeminiResponse(response.text());
      
      // Update context with new information
      this.updateContext(analysis);

      return analysis;
    } catch (error) {
      console.error('Error processing chunk with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate a response to a voice command based on current context
   */
  public async generateVoiceResponse(command: string): Promise<string> {
    try {
      // Format prompt with command and context
      const prompt = `
        Command: "${command}"
        
        Current scene context:
        ${this.context.sceneDescription || 'No scene description available'}
        
        Recent objects in view:
        ${this.context.recentObjects.map(obj => 
          `- ${obj.name} (last seen ${Date.now() - obj.lastSeenAt}ms ago)`
        ).join('\n')}
        
        Please provide a natural response to the user's command, taking into account
        the current scene context and visible objects.
      `;

      const parts: Part[] = [{ text: prompt }];

      // Generate content with Gemini
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating voice response:', error);
      throw error;
    }
  }

  /**
   * Create a prompt for Gemini that includes context from previous chunks
   */
  private createAnalysisPrompt(): string {
    const contextStr = this.context.recentObjects
      .map(obj => `${obj.name} was last seen ${Date.now() - obj.lastSeenAt}ms ago`)
      .join('. ');

    return `
      Previous context: ${contextStr}
      Previous scene description: ${this.context.sceneDescription || 'None'}
      
      Please analyze this video chunk and provide:
      1. A list of objects with their positions and confidence scores
      2. A natural description of the scene
      3. Spatial relationships between objects
      
      Format the response as JSON with the following structure:
      {
        "objects": [{"name": string, "position": {"x": number, "y": number}, "confidence": number}],
        "sceneDescription": string,
        "relationships": [{"object1": string, "object2": string, "relationship": string}]
      }
    `;
  }

  /**
   * Parse the response from Gemini into a structured format
   */
  private parseGeminiResponse(response: string): AnalysisResult {
    try {
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || [null, response];
      const jsonStr = jsonMatch[1];
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        ...parsed,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse Gemini response');
    }
  }

  /**
   * Update the processing context with new information
   */
  private updateContext(analysis: AnalysisResult): void {
    // Update object positions and timestamps
    analysis.objects.forEach(obj => {
      const existingObj = this.context.recentObjects.find(o => o.name === obj.name);
      if (existingObj) {
        existingObj.lastSeenAt = analysis.timestamp;
        existingObj.position = obj.position;
      } else {
        this.context.recentObjects.push({
          name: obj.name,
          lastSeenAt: analysis.timestamp,
          position: obj.position
        });
      }
    });

    // Remove objects not seen recently (over 10 seconds ago)
    const maxAge = 10000; // 10 seconds
    this.context.recentObjects = this.context.recentObjects.filter(
      obj => analysis.timestamp - obj.lastSeenAt < maxAge
    );

    // Update scene description
    this.context.sceneDescription = analysis.sceneDescription;
    this.context.lastProcessedTimestamp = analysis.timestamp;
  }

  /**
   * Convert video data to base64 string
   */
  private async convertToBase64(data: Blob | Buffer): Promise<string> {
    if (Buffer.isBuffer(data)) {
      // Node.js environment
      return data.toString('base64');
    } else {
      // Browser environment
      const buffer = await data.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let binary = '';
      uint8Array.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    }
  }

  /**
   * Get the current context
   */
  public getContext(): ProcessingContext {
    return { ...this.context };
  }

  /**
   * Clear the current context
   */
  public clearContext(): void {
    this.context = {
      recentObjects: [],
      lastProcessedTimestamp: 0
    };
  }
}