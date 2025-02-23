import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';

interface Frame {
  id: string;
  data: string; // base64 encoded image
  timestamp: number;
}

interface DetectedObject {
  name: string;
  position?: { x: number; y: number };
  confidence: number;
  lastSeenAt: number;
}

interface Action {
  description: string;
  objects: string[];
  confidence: number;
  timestamp: number;
}

interface ParsedAction {
  description?: string;
  objects?: string[];
  confidence?: number;
}

interface ParsedRelationship {
  object1?: string;
  object2?: string;
  relationship?: string;
}

interface AnalysisResult {
  objects: DetectedObject[];
  actions: Action[];
  sceneDescription: string;
  relationships: Array<{
    object1: string;
    object2: string;
    relationship: string;
  }>;
  timestamp: number;
}

interface ProcessingContext {
  recentObjects: DetectedObject[];
  recentActions: Action[];
  sceneDescription?: string;
  lastProcessedTimestamp: number;
  contextWindow: Frame[]; // Keep last N frames for context
}

export class GeminiProcessor {
  private model: GenerativeModel;
  private context: ProcessingContext;
  private apiKey: string;
  private readonly MAX_CONTEXT_FRAMES = 5;
  private readonly OBJECT_MEMORY_DURATION = 10000; // 10 seconds
  private readonly MODEL_NAME = 'gemini-1.5-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.context = {
      recentObjects: [],
      recentActions: [],
      lastProcessedTimestamp: 0,
      contextWindow: []
    };
    
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: this.MODEL_NAME });
  }

  public async processFrame(frame: Frame): Promise<AnalysisResult> {
    try {
      this.updateContextWindow(frame);
      const prompt = this.createAnalysisPrompt();
      const parts: Part[] = [
        { text: prompt },
        ...this.context.contextWindow.map(frame => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.data
          }
        }))
      ];

      const result = await this.model.generateContent(parts);
      const response = await result.response;
      const analysis = this.parseGeminiResponse(response.text());
      this.updateContext(analysis);
      return analysis;
    } catch (error) {
      console.error('Error processing frame with Gemini:', error);
      throw error;
    }
  }

  public async generateVoiceResponse(command: string): Promise<string> {
    try {
      const prompt = this.createVoicePrompt(command);
      const parts: Part[] = [{ text: prompt }];
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating voice response:', error);
      throw error;
    }
  }

  private createAnalysisPrompt(): string {
    const recentObjectsStr = this.context.recentObjects
      .map(obj => `${obj.name} was seen ${(Date.now() - obj.lastSeenAt) / 1000}s ago`)
      .join('. ');

    const recentActionsStr = this.context.recentActions
      .map(action => action.description)
      .join('. ');

    return `
      Analyze this sequence of ${this.context.contextWindow.length} frames.
      
      Previous context:
      Objects: ${recentObjectsStr}
      Actions: ${recentActionsStr}
      Scene description: ${this.context.sceneDescription || 'None'}
      
      Please provide:
      1. A list of objects with their positions, confidence scores, and temporal consistency
      2. Any actions or movements detected across frames
      3. A natural description of the scene evolution
      4. Spatial and temporal relationships between objects
      
      Format the response as JSON with the following structure:
      {
        "objects": [{"name": string, "position": {"x": number, "y": number}, "confidence": number}],
        "actions": [{"description": string, "objects": string[], "confidence": number}],
        "sceneDescription": string,
        "relationships": [{"object1": string, "object2": string, "relationship": string}]
      }
    `;
  }

  private createVoicePrompt(command: string): string {
    return `
      Command: "${command}"
      
      Current scene context:
      ${this.context.sceneDescription || 'No scene description available'}
      
      Recent objects in view:
      ${this.context.recentObjects.map(obj => 
        `- ${obj.name} (seen ${(Date.now() - obj.lastSeenAt) / 1000}s ago)`
      ).join('\n')}
      
      Recent actions:
      ${this.context.recentActions.map(action => 
        `- ${action.description} (${action.objects.join(', ')})`
      ).join('\n')}
      
      Please provide a natural response to the user's command, taking into account
      the current scene context, visible objects, and recent actions.
    `;
  }

  private parseGeminiResponse(response: string): AnalysisResult {
    try {
      const cleanJsonStr = this.extractAndCleanJson(response);
      const parsed = JSON.parse(cleanJsonStr);
      const currentTime = Date.now();

      const validatedResponse = {
        objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        sceneDescription: typeof parsed.sceneDescription === 'string' 
          ? parsed.sceneDescription 
          : 'No description available',
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
        timestamp: currentTime
      };

      const objects = validatedResponse.objects.map((obj: DetectedObject) => ({
        name: String(obj.name || 'Unknown Object'),
        position: obj.position || undefined,
        confidence: Number(obj.confidence) || 0.5,
        lastSeenAt: currentTime
      }));
      
      const actions = validatedResponse.actions.map((action: ParsedAction) => ({
        description: String(action.description || 'Unknown Action'),
        objects: Array.isArray(action.objects) ? action.objects.map(String) : [],
        confidence: Number(action.confidence) || 0.5,
        timestamp: currentTime
      }));

      const relationships = validatedResponse.relationships.map((rel: ParsedRelationship) => ({
        object1: String(rel.object1 || 'Unknown Object'),
        object2: String(rel.object2 || 'Unknown Object'),
        relationship: String(rel.relationship || 'near')
      }));

      return {
        ...validatedResponse,
        objects,
        actions,
        relationships,
        timestamp: currentTime
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        objects: [],
        actions: [],
        sceneDescription: 'Failed to analyze scene',
        relationships: [],
        timestamp: Date.now()
      };
    }
  }

  private extractAndCleanJson(text: string): string {
    try {
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : text;

      jsonStr = jsonStr.trim();

      if (!jsonStr.startsWith('{')) {
        jsonStr = '{' + jsonStr;
      }
      if (!jsonStr.endsWith('}')) {
        jsonStr = jsonStr + '}';
      }

      jsonStr = jsonStr.replace(/\\([^"\\\/bfnrtu])/g, '$1');

      jsonStr = jsonStr
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,])\s*}/g, '}')
        .replace(/\[\s*]/g, '[]')
        .replace(/undefined/g, 'null');

      return jsonStr;
    } catch (error) {
      console.error('Error cleaning JSON:', error);
      return '{"objects":[],"actions":[],"sceneDescription":"Error parsing response","relationships":[]}';
    }
  }

  private updateContextWindow(frame: Frame): void {
    this.context.contextWindow.push(frame);
    if (this.context.contextWindow.length > this.MAX_CONTEXT_FRAMES) {
      this.context.contextWindow.shift();
    }
  }

  private updateContext(analysis: AnalysisResult): void {
    const currentTime = Date.now();

    analysis.objects.forEach(obj => {
      const existingObj = this.context.recentObjects.find(o => o.name === obj.name);
      if (existingObj) {
        existingObj.lastSeenAt = currentTime;
        existingObj.position = obj.position;
        existingObj.confidence = obj.confidence;
      } else {
        this.context.recentObjects.push({
          ...obj,
          lastSeenAt: currentTime
        });
      }
    });

    if (analysis.actions) {
      this.context.recentActions.push(
        ...analysis.actions.map(action => ({
          ...action,
          timestamp: currentTime
        }))
      );
    }

    this.context.recentObjects = this.context.recentObjects.filter(
      obj => currentTime - obj.lastSeenAt < this.OBJECT_MEMORY_DURATION
    );

    this.context.recentActions = this.context.recentActions.slice(-10);
    this.context.sceneDescription = analysis.sceneDescription;
    this.context.lastProcessedTimestamp = currentTime;
  }

  public getContext(): ProcessingContext {
    return { ...this.context };
  }

  public clearContext(): void {
    this.context = {
      recentObjects: [],
      recentActions: [],
      lastProcessedTimestamp: 0,
      contextWindow: []
    };
  }
}