import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';

interface Frame {
  id: string;
  data: string; // base64 encoded image
  timestamp: number;
}

interface Object {
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

interface AnalysisResult {
  objects: Object[];
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
  recentObjects: Object[];
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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.context = {
      recentObjects: [],
      recentActions: [],
      lastProcessedTimestamp: 0,
      contextWindow: []
    };
    
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  }

  /**
   * Process a video frame using Gemini API
   */
  public async processFrame(frame: Frame): Promise<AnalysisResult> {
    try {
      // Update context window
      this.updateContextWindow(frame);
      
      // Create prompt with temporal context
      const prompt = this.createAnalysisPrompt();

      // Prepare parts for Gemini API
      const parts: Part[] = [
        { text: prompt },
        ...this.context.contextWindow.map(frame => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.data
          }
        }))
      ];

      // Generate content with Gemini
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      const analysis = this.parseGeminiResponse(response.text());
      
      // Update context with new information
      this.updateContext(analysis);

      return analysis;
    } catch (error) {
      console.error('Error processing frame with Gemini:', error);
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
        
        Recent actions:
        ${this.context.recentActions.map(action => 
          `- ${action.description} (${action.objects.join(', ')})`
        ).join('\n')}
        
        Please provide a natural response to the user's command, taking into account
        the current scene context, visible objects, and recent actions.
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
   * Create a prompt for Gemini that includes temporal context
   */
  private createAnalysisPrompt(): string {
    const recentObjectsStr = this.context.recentObjects
      .map(obj => `${obj.name} was last seen ${Date.now() - obj.lastSeenAt}ms ago`)
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
   * Update context window with new frame
   */
  private updateContextWindow(frame: Frame): void {
    this.context.contextWindow.push(frame);
    if (this.context.contextWindow.length > this.MAX_CONTEXT_FRAMES) {
      this.context.contextWindow.shift();
    }
  }

  /**
   * Update the processing context with new information
   */
  private updateContext(analysis: AnalysisResult): void {
    const currentTime = Date.now();

    // Update object positions and timestamps
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

    // Add new actions
    if (analysis.actions) {
      this.context.recentActions.push(
        ...analysis.actions.map(action => ({
          ...action,
          timestamp: currentTime
        }))
      );
    }

    // Remove old objects and actions
    this.context.recentObjects = this.context.recentObjects.filter(
      obj => currentTime - obj.lastSeenAt < this.OBJECT_MEMORY_DURATION
    );

    this.context.recentActions = this.context.recentActions.slice(-10); // Keep last 10 actions

    // Update scene description
    this.context.sceneDescription = analysis.sceneDescription;
    this.context.lastProcessedTimestamp = currentTime;
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
      recentActions: [],
      lastProcessedTimestamp: 0,
      contextWindow: []
    };
  }
}