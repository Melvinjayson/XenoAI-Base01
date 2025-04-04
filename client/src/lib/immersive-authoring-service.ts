import { ApiResponse } from '@/types/api';

export interface GenerationParameters {
  prompt: string;
  style?: 'realistic' | 'stylized' | 'abstract' | 'scifi';
  complexity?: number; 
  environmentType?: string;
  format?: '3d' | '2d' | 'audio';
  temperature?: number;
  context?: string; // Previous context/history
}

export interface SceneObject {
  id: string;
  type: 'primitive' | 'model' | 'text' | 'light' | 'group';
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  properties: Record<string, any>;
  children?: SceneObject[];
}

export interface GeneratedObject {
  object: SceneObject;
  previewUrl?: string;
  modelUrl?: string;
  suggestions: string[];
  metadata: {
    generationTime: number;
    complexity: number;
    vertexCount?: number;
    polygonCount?: number;
  };
}

export interface GenerationResponse {
  objects: GeneratedObject[];
  sceneContext?: {
    lighting: string;
    environment: string;
    mood: string;
  };
  nextSteps: string[];
}

export interface NaturalLanguageCommand {
  command: string;
  objectId?: string;
  parameters?: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  message: string;
  modifications?: {
    objectId: string;
    property: string;
    oldValue: any;
    newValue: any;
  }[];
}

// The AI co-pilot assistant service for immersive authoring
export class ImmersiveAuthoringService {
  private static readonly API_ENDPOINT = '/api/immersive-authoring';
  private static readonly GENERATION_ENDPOINT = `${ImmersiveAuthoringService.API_ENDPOINT}/generate`;
  private static readonly COMMAND_ENDPOINT = `${ImmersiveAuthoringService.API_ENDPOINT}/command`;
  private static readonly ASSIST_ENDPOINT = `${ImmersiveAuthoringService.API_ENDPOINT}/assist`;

  /**
   * Generate 3D content based on natural language prompt
   */
  static async generateContent(params: GenerationParameters): Promise<ApiResponse<GenerationResponse>> {
    try {
      const response = await fetch(this.GENERATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to generate content'
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error generating content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a natural language command to modify the scene
   */
  static async processCommand(command: NaturalLanguageCommand): Promise<ApiResponse<CommandResult>> {
    try {
      const response = await fetch(this.COMMAND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to process command'
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error processing command:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get AI assistance and suggestions for the current scene
   */
  static async getAssistance(
    scene: SceneObject[], 
    question?: string
  ): Promise<ApiResponse<{suggestions: string[], analysis: Record<string, any>}>> {
    try {
      const response = await fetch(this.ASSIST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scene,
          question
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to get assistance'
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error getting assistance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Convert speech to text for voice commands
   */
  static async speechToText(audioBlob: Blob): Promise<ApiResponse<{text: string, confidence: number}>> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(`${this.API_ENDPOINT}/speech-to-text`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to process speech'
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error processing speech:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a preview of an object before full generation
   */
  static async generatePreview(prompt: string): Promise<ApiResponse<{previewUrl: string}>> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({prompt})
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to generate preview'
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}