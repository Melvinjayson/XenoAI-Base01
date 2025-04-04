import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

// Define types for mind map data structures
export interface MindMapTopic {
  id: string;
  text: string;
  parentId?: string;
  level: number;
  children: string[];
  attributes?: {
    color?: string;
    icon?: string;
    notes?: string;
    url?: string;
    importance?: number;
  };
}

export interface MindMap {
  id: string;
  title: string;
  centralTopic: MindMapTopic;
  topics: Record<string, MindMapTopic>;
  createdAt: number;
  updatedAt: number;
  userId?: string;
  tags?: string[];
  description?: string;
}

interface DetectedContext {
  type: string;
  confidence: number;
  topic: string;
  keywords: string[];
  entities: Array<{ entity: string; type: string; importance: number }>;
  action: string;
  actionParams?: Record<string, any>;
}

interface ResearchComponent {
  type: 'knowledge_graph' | 'mind_map' | 'project' | 'document' | 'summary';
  title: string;
  description: string;
  suggestedContent?: any;
}

interface ResearchInsight {
  title: string;
  content: string;
  confidence: number;
  tags: string[];
}

interface ParsedCommand {
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
}

interface MindMapContextType {
  mindMap: MindMap | null;
  loading: boolean;
  error: string | null;
  context: DetectedContext | null;
  components: ResearchComponent[];
  insights: ResearchInsight[];
  createMindMap: (centralTopic: string, contextHint?: string) => Promise<void>;
  expandTopic: (topicId: string, contextHint?: string) => Promise<void>;
  analyzeConversation: (messages: any[]) => Promise<DetectedContext>;
  getResearchInsights: (context: DetectedContext) => Promise<ResearchInsight[]>;
  getSuggestedComponents: (context: DetectedContext) => Promise<ResearchComponent[]>;
  parseCommand: (command: string, context: DetectedContext) => Promise<ParsedCommand>;
}

const defaultMindMap: MindMap = {
  id: '',
  title: '',
  centralTopic: {
    id: '',
    text: '',
    level: 0,
    children: []
  },
  topics: {},
  createdAt: 0,
  updatedAt: 0
};

export const MindMapContext = createContext<MindMapContextType | null>(null);

export const MindMapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<DetectedContext | null>(null);
  const [components, setComponents] = useState<ResearchComponent[]>([]);
  const [insights, setInsights] = useState<ResearchInsight[]>([]);

  const createMindMap = async (centralTopic: string, contextHint?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/mind-map/create', {
        centralTopic,
        context: contextHint
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create mind map: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMindMap(data.mindMap);
    } catch (error) {
      console.error('Error creating mind map:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const expandTopic = async (topicId: string, contextHint?: string) => {
    if (!mindMap) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/mind-map/expand-topic', {
        mindMap,
        topicId,
        contextHint
      });
      
      if (!response.ok) {
        throw new Error(`Failed to expand topic: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMindMap(data.mindMap);
    } catch (error) {
      console.error('Error expanding topic:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const analyzeConversation = async (messages: any[]): Promise<DetectedContext> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/context/analyze', {
        messages,
        currentGraph: null // We could pass the current knowledge graph here if we have one
      });
      
      if (!response.ok) {
        throw new Error(`Failed to analyze conversation: ${response.statusText}`);
      }
      
      const data = await response.json();
      setContext(data.context);
      return data.context;
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const getResearchInsights = async (ctx: DetectedContext): Promise<ResearchInsight[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/context/insights', {
        context: ctx,
        graph: null // We could pass a knowledge graph here if we have one
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get research insights: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInsights(data.insights);
      return data.insights;
    } catch (error) {
      console.error('Error getting research insights:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  const getSuggestedComponents = async (ctx: DetectedContext): Promise<ResearchComponent[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/context/suggest-components', {
        context: ctx,
        currentGraph: null // We could pass the current knowledge graph here if we have one
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get suggested components: ${response.statusText}`);
      }
      
      const data = await response.json();
      setComponents(data.components);
      return data.components;
    } catch (error) {
      console.error('Error getting suggested components:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  const parseCommand = async (command: string, ctx: DetectedContext): Promise<ParsedCommand> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/context/parse-command', {
        command,
        context: ctx
      });
      
      if (!response.ok) {
        throw new Error(`Failed to parse command: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.parsedCommand;
    } catch (error) {
      console.error('Error parsing command:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MindMapContext.Provider
      value={{
        mindMap,
        loading,
        error,
        context,
        components,
        insights,
        createMindMap,
        expandTopic,
        analyzeConversation,
        getResearchInsights,
        getSuggestedComponents,
        parseCommand
      }}
    >
      {children}
    </MindMapContext.Provider>
  );
};

export const useMindMap = () => {
  const context = useContext(MindMapContext);
  if (!context) {
    throw new Error('useMindMap must be used within a MindMapProvider');
  }
  return context;
};