import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, IStorage } from "./storage";
import { chat, prepareGreeting } from "./openai";
import { webSearch, getSuggestions } from "./search";
import { openSearch, openConversationalResponse } from "./open-search";
import { synthesizeSpeech } from "./voice";
import { speechToText } from "./speech-to-text";
import { queryPerplexity, perplexitySearchConversation } from "./perplexity";
import { uploadAndAnalyzeImage, extractColorsFromUrl } from "./color-analyzer";
import { hexToRgb, rgbToHex } from "../client/src/lib/color-utils";
import { apiQuotaManager } from "./api-quota-manager";
import { 
  analyzeConversationContext, 
  suggestResearchComponents,
  generateResearchInsights,
  parseNaturalLanguageCommand,
  type DetectedContext
} from "./context-agent";
import {
  generateMindMap,
  expandMindMapTopic,
  mergeMindMaps,
  type MindMap
} from "./mind-map-manager";
import { 
  InsertFile, 
  InsertCanvas, 
  insertCanvasSchema, 
  InsertCanvasElement, 
  insertCanvasElementSchema,
  InsertColorPalette,
  // Project Management schema imports
  InsertProject,
  insertProjectSchema,
  InsertMilestone,
  insertMilestoneSchema,
  InsertTask,
  insertTaskSchema,
  InsertResearchInsight,
  insertResearchInsightSchema,
  InsertInsightTaskRelation,
  insertInsightTaskRelationSchema,
  InsertProjectComment,
  insertProjectCommentSchema,
  InsertTaskComment,
  insertTaskCommentSchema
} from "../shared/schema";
import { 
  createKnowledgeGraphFromSearch, 
  expandGraphNode, 
  analyzeKnowledgeGraph, 
  updateGraphWithFeedback,
  enhanceGraphWithAI,
  type NodeType 
} from "./knowledge-graph";
import { selectModel, models } from "./model-selector";
import { WebSocketServer } from "ws";
import path from "path";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";

// Helper functions for color palette generation
function adjustBrightness(hex: string, amount: number): string {
  if (!hex) return '#FFFFFF';
  
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb;
  
  // Adjust brightness
  const adjustedR = Math.min(Math.max(Math.round(r + r * amount), 0), 255);
  const adjustedG = Math.min(Math.max(Math.round(g + g * amount), 0), 255);
  const adjustedB = Math.min(Math.max(Math.round(b + b * amount), 0), 255);
  
  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

function adjustHue(hex: string, degrees: number): string {
  if (!hex) return '#FFFFFF';
  
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb;
  
  // Convert RGB to HSL
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
      case g1: h = (b1 - r1) / d + 2; break;
      case b1: h = (r1 - g1) / d + 4; break;
    }
    
    h = h / 6;
  }
  
  // Adjust hue
  h = (h * 360 + degrees) % 360;
  if (h < 0) h += 360;
  h = h / 360;
  
  // Convert back to RGB
  let r2, g2, b2;
  
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }
  
  // Convert back to 0-255 range
  const adjustedR = Math.round(r2 * 255);
  const adjustedG = Math.round(g2 * 255);
  const adjustedB = Math.round(b2 * 255);
  
  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static audio files
  app.use('/audio', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public', req.url);
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });

  // API endpoint for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, filters, forceAdvancedModel, isVoiceResponse } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Log the model preference for debugging
      if (forceAdvancedModel) {
        console.log("Chat request with forced advanced model");
      }
      
      if (isVoiceResponse) {
        console.log("Preparing chat for voice response");
      }

      // Pass filters and model preferences to chat function
      const response = await chat(
        message, 
        history || [], 
        filters, 
        forceAdvancedModel || false,
        isVoiceResponse || false
      );
      
      return res.json(response);
    } catch (error) {
      console.error("Chat API error:", error);
      return res.status(500).json({ 
        error: "Failed to process your request", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for web search
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const result = await webSearch(query);
      return res.json(result);
    } catch (error) {
      console.error("Search API error:", error);
      return res.status(500).json({ 
        error: "Failed to perform search", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for search suggestions
  app.get("/api/suggestions", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const suggestions = await getSuggestions(query);
      return res.json({ suggestions });
    } catch (error) {
      console.error("Suggestions API error:", error);
      return res.status(500).json({ 
        error: "Failed to get suggestions", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for voice synthesis
  app.post("/api/synthesize", async (req, res) => {
    try {
      const { text, voiceId, language } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Check if we have either ElevenLabs or OpenAI API keys for speech synthesis
      if (!process.env.ELEVENLABS_API_KEY && !process.env.OPENAI_API_KEY) {
        console.warn("Neither ELEVENLABS_API_KEY nor OPENAI_API_KEY are set for speech synthesis");
      }
      
      // Pass language parameter to synthesizeSpeech for language-specific voices
      const result = await synthesizeSpeech({ 
        text, 
        voiceId,
        language: language || 'en' // Default to English if no language specified
      });
      
      // Make sure we return absolute URLs for the audio files
      if (result.audioUrl) {
        if (!result.audioUrl.startsWith('http') && !result.audioUrl.startsWith('/')) {
          result.audioUrl = '/' + result.audioUrl;
        }
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Voice synthesis API error:", error);
      return res.status(500).json({ 
        error: "Failed to synthesize speech", 
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      });
    }
  });
  
  // API endpoint for knowledge graph search
  app.post("/api/knowledge-graph/search", async (req, res) => {
    try {
      const { query, chatContext } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Use chat context to enhance the search if provided
      let enhancedQuery = query;
      let relatedTerms: string[] = [];
      
      if (chatContext && Array.isArray(chatContext) && chatContext.length > 0) {
        console.log("Enhancing search with chat context");
        
        // Extract key phrases from the chat context
        const contextText = chatContext
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => msg.content)
          .join(" ");
        
        // Extract keywords and related phrases (simple implementation)
        const words = contextText.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3 && !['this', 'that', 'what', 'when', 'where', 'which', 'with', 'would', 'could', 'should'].includes(word));
        
        // Create a frequency map
        const wordFreq = words.reduce((acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Get top related terms (excluding words already in the query)
        const queryTerms = query.toLowerCase().split(/\s+/);
        
        relatedTerms = Object.entries(wordFreq)
          .filter(([word]) => !queryTerms.includes(word))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);
        
        // Only enhance if we found good related terms
        if (relatedTerms.length > 0) {
          enhancedQuery = `${query} related to ${relatedTerms.join(', ')}`;
          console.log(`Enhanced query: ${enhancedQuery}`);
        }
      }

      const result = await createKnowledgeGraphFromSearch(enhancedQuery);
      
      // Add the related terms as nodes if they don't exist yet
      if (relatedTerms.length > 0) {
        // Find the query node (first node)
        const queryNode = result.graph.nodes.find(node => node.type === 'query');
        
        if (queryNode) {
          for (const term of relatedTerms) {
            const termId = `related-term-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            // Check if a similar node already exists
            const existingNode = result.graph.nodes.find(
              node => node.label.toLowerCase() === term.toLowerCase()
            );
            
            if (!existingNode) {
              // Add the related term node
              const termNode = {
                id: termId,
                label: term,
                type: 'concept' as NodeType,
                description: `Related term from conversation context`,
                score: 0.7,
                createdAt: Date.now()
              };
              
              result.graph.nodes.push(termNode);
              
              // Connect to the query node
              result.graph.edges.push({
                id: `edge-query-related-${Math.random().toString(36).substring(7)}`,
                source: queryNode.id,
                target: termId,
                type: 'conceptually_related',
                weight: 0.7
              });
            }
          }
          
          // Re-analyze the enhanced graph
          result.insights = await analyzeKnowledgeGraph(result.graph);
        }
      }

      return res.json(result);
    } catch (error) {
      console.error("Knowledge graph search API error:", error);
      return res.status(500).json({ 
        error: "Failed to build knowledge graph", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for expanding a node in the knowledge graph
  app.post("/api/knowledge-graph/expand", async (req, res) => {
    try {
      const { nodeId, nodeType, label } = req.body;
      
      if (!nodeId || !nodeType || !label) {
        return res.status(400).json({ error: "nodeId, nodeType, and label are required" });
      }

      const graph = await expandGraphNode(nodeId, nodeType, label);
      return res.json({ graph });
    } catch (error) {
      console.error("Knowledge graph expand API error:", error);
      return res.status(500).json({ 
        error: "Failed to expand knowledge graph node", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for analyzing a knowledge graph
  app.post("/api/knowledge-graph/analyze", async (req, res) => {
    try {
      const { graph } = req.body;
      
      if (!graph || !graph.nodes || !graph.edges) {
        return res.status(400).json({ error: "Valid graph object with nodes and edges is required" });
      }

      const insights = await analyzeKnowledgeGraph(graph);
      return res.json({ insights });
    } catch (error) {
      console.error("Knowledge graph analysis API error:", error);
      return res.status(500).json({ 
        error: "Failed to analyze knowledge graph", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for creating a knowledge graph from conversation context
  app.post("/api/knowledge-graph/from-conversation", async (req, res) => {
    try {
      const { messages, searchResults } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Valid message history array is required" });
      }
      
      // Extract conversation text to create a query
      const conversationText = messages
        .map(m => m.content)
        .join(" ");
      
      // Create a more focused query by extracting key topics
      let query = conversationText;
      if (conversationText.length > 200) {
        // If the conversation is long, try to extract the main topics
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content;
        if (lastUserMessage) {
          query = lastUserMessage; // Use the last user message as primary query
        }
      }
      
      console.log(`Creating knowledge graph from conversation with query: ${query}`);
      
      // Create knowledge graph from the conversation
      const result = await createKnowledgeGraphFromSearch(query);
      
      // If there are search results provided, enrich the graph with those
      if (searchResults && searchResults.sources && searchResults.sources.length > 0) {
        // Add search results as source nodes if they don't exist
        for (const source of searchResults.sources) {
          const sourceId = `source-context-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          // Check if a similar source already exists
          const existingSource = result.graph.nodes.find(
            node => node.type === 'document' && 
            node.label.toLowerCase() === source.name.toLowerCase()
          );
          
          if (!existingSource) {
            // Add the source node
            const sourceNode = {
              id: sourceId,
              label: source.name,
              type: 'document' as NodeType,
              description: source.snippet,
              score: 0.9,
              createdAt: Date.now(),
              data: { url: source.url }
            };
            
            result.graph.nodes.push(sourceNode);
            
            // Connect to the query node (first node)
            const queryNodeId = result.graph.nodes[0].id;
            result.graph.edges.push({
              id: `edge-query-context-${Math.random().toString(36).substring(7)}`,
              source: queryNodeId,
              target: sourceId,
              type: 'context_source',
              weight: 0.85
            });
          }
        }
        
        // Re-analyze the enhanced graph
        result.insights = await analyzeKnowledgeGraph(result.graph);
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Knowledge graph from conversation API error:", error);
      return res.status(500).json({ 
        error: "Failed to build knowledge graph from conversation", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for getting a dynamic greeting
  app.get("/api/greeting", (_req, res) => {
    try {
      const greeting = prepareGreeting();
      return res.json({ greeting });
    } catch (error) {
      console.error("Greeting API error:", error);
      return res.status(500).json({ 
        error: "Failed to generate greeting", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for API quota status
  app.get("/api/quota-status", (_req, res) => {
    try {
      const quotaStatus = apiQuotaManager.getUsageSummary();
      return res.json({ 
        status: quotaStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("API quota status error:", error);
      return res.status(500).json({ 
        error: "Failed to get API quota status", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for adjusting API quotas
  app.post("/api/quota-adjust", (req, res) => {
    try {
      const { service, dailyQuota, hourlyQuota } = req.body;
      
      if (!service || dailyQuota === undefined || hourlyQuota === undefined) {
        return res.status(400).json({ error: "service, dailyQuota, and hourlyQuota are required" });
      }
      
      apiQuotaManager.adjustQuota(service, dailyQuota, hourlyQuota);
      
      return res.json({ 
        success: true,
        message: `Quota for ${service} adjusted to ${dailyQuota} daily, ${hourlyQuota} hourly`,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("API quota adjustment error:", error);
      return res.status(500).json({ 
        error: "Failed to adjust API quota", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for available models
  app.get("/api/models", (_req, res) => {
    try {
      // Define models directly in the endpoint for simplicity
      const availableModels = {
        'gpt-4o': {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          description: 'Advanced model with strong reasoning and knowledge graph capabilities',
          maxTokens: 4096,
          isLightweight: false,
          contextWindow: 8192,
          cost: 'high',
          capabilities: ['chat', 'search', 'knowledge', 'voice']
        },
        'gpt-3.5-turbo': {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          description: 'Fast, efficient model for basic conversations and simple tasks',
          maxTokens: 4096,
          isLightweight: true,
          contextWindow: 4096,
          cost: 'low',
          capabilities: ['chat', 'search']
        },
        'enhanced-search': {
          id: 'enhanced-search',
          name: 'Enhanced Search (Open Source)',
          provider: 'xeno',
          description: 'Open-source search enhancement with web content analysis and citations',
          maxTokens: 4096,
          isLightweight: true,
          contextWindow: 8192,
          cost: 'low',
          capabilities: ['chat', 'search', 'knowledge', 'citations']
        }
      };
      
      return res.json({ 
        models: availableModels,
        defaultModel: 'gpt-3.5-turbo'
      });
    } catch (error) {
      console.error("Models API error:", error);
      return res.status(500).json({ 
        error: "Failed to get models information", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for Enhanced Search (open-source alternative to Perplexity)
  app.post("/api/perplexity/search", async (req, res) => {
    try {
      const { query, sessionId = "default", options = {} } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      
      // Use our open-source alternative implementation
      const result = await perplexitySearchConversation(query, sessionId, options);
      return res.json(result);
    } catch (error) {
      console.error("Enhanced search API error:", error);
      return res.status(500).json({ 
        error: "Failed to perform enhanced search", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for Enhanced Chat completions (open-source alternative to Perplexity)
  app.post("/api/perplexity/chat", async (req, res) => {
    try {
      const { prompt, history = [], options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      // Use our open-source alternative implementation
      const result = await queryPerplexity(prompt, history, options);
      return res.json(result);
    } catch (error) {
      console.error("Enhanced chat API error:", error);
      return res.status(500).json({ 
        error: "Failed to complete enhanced chat", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API health check endpoint
  app.get("/api/health", (_req, res) => {
    const openaiApiKey = process.env.OPENAI_API_KEY ? "✓" : "✗";
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ? "✓" : "✗";
    
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        openai: openaiApiKey,
        elevenlabs: elevenLabsApiKey,
        enhancedSearch: "✓" // Our open-source search alternative is always available
      }
    });
  });
  
  // API endpoint for API quota status
  app.get("/api/quota-status", (_req, res) => {
    try {
      const quotaStatus = apiQuotaManager.getUsageSummary();
      return res.json({ 
        status: quotaStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("API quota status error:", error);
      return res.status(500).json({ 
        error: "Failed to get API quota status", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for adjusting API quotas
  app.post("/api/quota-adjust", (req, res) => {
    try {
      const { service, dailyQuota, hourlyQuota } = req.body;
      
      if (!service || dailyQuota === undefined || hourlyQuota === undefined) {
        return res.status(400).json({ error: "service, dailyQuota, and hourlyQuota are required" });
      }
      
      apiQuotaManager.adjustQuota(service, dailyQuota, hourlyQuota);
      
      return res.json({ 
        success: true,
        message: `Quota for ${service} adjusted to ${dailyQuota} daily, ${hourlyQuota} hourly`,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("API quota adjustment error:", error);
      return res.status(500).json({ 
        error: "Failed to adjust API quota", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for open source search
  app.post("/api/opensearch", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const result = await openSearch(query);
      return res.json(result);
    } catch (error) {
      console.error("Open search API error:", error);
      return res.status(500).json({ 
        error: "Failed to perform open search", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for open source conversational search
  app.post("/api/opensearch/conversational", async (req, res) => {
    try {
      const { query, sessionId = "default" } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const response = await openConversationalResponse(query, sessionId);
      return res.json(response);
    } catch (error) {
      console.error("Open conversational search API error:", error);
      return res.status(500).json({ 
        error: "Failed to process conversational search", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // API endpoint for user preferences
  app.post("/api/user/preferences", async (req, res) => {
    try {
      const { preferences, sessionId = "default" } = req.body;
      
      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ error: "Valid preferences object is required" });
      }

      // Store each preference
      const savedPreferences = [];
      for (const [key, value] of Object.entries(preferences)) {
        const preference = await (storage as IStorage).saveUserPreference(
          sessionId,
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        );
        savedPreferences.push(preference);
      }

      return res.json({ preferences: savedPreferences });
    } catch (error) {
      console.error("User preferences API error:", error);
      return res.status(500).json({ 
        error: "Failed to save preferences", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/user/preferences", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || "default";
      const preferences = await (storage as IStorage).getUserPreferences(sessionId);
      return res.json({ preferences });
    } catch (error) {
      console.error("Get preferences API error:", error);
      return res.status(500).json({ 
        error: "Failed to get preferences", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Color Palette API endpoints
  app.post("/api/color-palettes", async (req, res) => {
    try {
      const { userId, name, colors, description } = req.body;
      
      if (!colors || !Array.isArray(colors) || colors.length === 0) {
        return res.status(400).json({ error: "Colors array is required" });
      }
      
      const palette = await storage.createColorPalette({
        userId: userId || null,
        name: name || "Untitled Palette",
        colors,
        description: description || "",
        isDefault: false
      });
      
      return res.status(201).json(palette);
    } catch (error) {
      console.error("Create color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to create color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/color-palettes", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const palettes = await storage.getColorPalettes(userId);
      return res.json(palettes);
    } catch (error) {
      console.error("Get color palettes API error:", error);
      return res.status(500).json({ 
        error: "Failed to get color palettes", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/color-palettes/:id", async (req, res) => {
    try {
      const paletteId = parseInt(req.params.id);
      if (isNaN(paletteId)) {
        return res.status(400).json({ error: "Invalid palette ID" });
      }
      
      const palette = await storage.getColorPaletteById(paletteId);
      if (!palette) {
        return res.status(404).json({ error: "Color palette not found" });
      }
      
      return res.json(palette);
    } catch (error) {
      console.error("Get color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to get color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.patch("/api/color-palettes/:id", async (req, res) => {
    try {
      const paletteId = parseInt(req.params.id);
      if (isNaN(paletteId)) {
        return res.status(400).json({ error: "Invalid palette ID" });
      }
      
      const updateData = req.body;
      const updatedPalette = await storage.updateColorPalette(paletteId, updateData);
      
      if (!updatedPalette) {
        return res.status(404).json({ error: "Color palette not found" });
      }
      
      return res.json(updatedPalette);
    } catch (error) {
      console.error("Update color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to update color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/color-palettes/:id", async (req, res) => {
    try {
      const paletteId = parseInt(req.params.id);
      if (isNaN(paletteId)) {
        return res.status(400).json({ error: "Invalid palette ID" });
      }
      
      const success = await storage.deleteColorPalette(paletteId);
      if (!success) {
        return res.status(404).json({ error: "Color palette not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Delete color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to delete color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.post("/api/color-palettes/:id/set-default", async (req, res) => {
    try {
      const paletteId = parseInt(req.params.id);
      if (isNaN(paletteId)) {
        return res.status(400).json({ error: "Invalid palette ID" });
      }
      
      const updatedPalette = await storage.setDefaultColorPalette(paletteId);
      if (!updatedPalette) {
        return res.status(404).json({ error: "Color palette not found" });
      }
      
      return res.json(updatedPalette);
    } catch (error) {
      console.error("Set default color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to set default color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/color-palettes/default", async (req, res) => {
    try {
      const defaultPalette = await storage.getDefaultColorPalette();
      
      if (!defaultPalette) {
        return res.status(404).json({ error: "No default color palette found" });
      }
      
      return res.json(defaultPalette);
    } catch (error) {
      console.error("Get default color palette API error:", error);
      return res.status(500).json({ 
        error: "Failed to get default color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Configure multer for memory storage (file uploads)
  const multerStorage = multer.memoryStorage();
  const uploadMemory = multer({ 
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // limit to 10MB
    } 
  });

  // Speech to text API endpoint
  app.post("/api/speech-to-text", uploadMemory.single('audio'), async (req, res) => {
    try {
      // Make sure we have the OpenAI API key for speech transcription
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not set for speech-to-text functionality");
      }
      
      return await speechToText(req, res);
    } catch (error) {
      console.error("Speech-to-text API error:", error);
      return res.status(500).json({ 
        error: "Failed to process speech to text", 
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      });
    }
  });

  // API endpoint for exporting knowledge graph insights
  app.post("/api/knowledge-graph/export", async (req, res) => {
    try {
      const { insights, format = 'json' } = req.body;
      
      if (!insights || !Array.isArray(insights)) {
        return res.status(400).json({ error: "Valid insights array is required" });
      }
      
      let contentType = 'application/json';
      let content = '';
      
      if (format === 'json') {
        content = JSON.stringify(insights, null, 2);
      } else if (format === 'csv') {
        contentType = 'text/csv';
        // Create CSV header
        const headers = ['type', 'description', 'relevance', 'confidence', 'rationale'];
        content = headers.join(',') + '\n';
        
        // Add each insight as a row
        insights.forEach((insight: any) => {
          const row = [
            insight.type || '',
            `"${(insight.description || '').replace(/"/g, '""')}"`, // Escape quotes
            insight.relevance || '',
            insight.confidence || '',
            `"${(insight.rationale || '').replace(/"/g, '""')}"` // Escape quotes
          ];
          content += row.join(',') + '\n';
        });
      } else if (format === 'txt') {
        contentType = 'text/plain';
        insights.forEach((insight: any, index: number) => {
          content += `Insight ${index + 1}:\n`;
          content += `Type: ${insight.type || 'N/A'}\n`;
          content += `Description: ${insight.description || 'N/A'}\n`;
          content += `Relevance: ${insight.relevance || 'N/A'}\n`;
          content += `Confidence: ${insight.confidence || 'N/A'}\n`;
          content += `Rationale: ${insight.rationale || 'N/A'}\n`;
          content += '\n';
        });
      } else {
        return res.status(400).json({ error: "Unsupported format. Use json, csv, or txt." });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="xeno-insights.${format}"`);
      
      res.send(content);
    } catch (error) {
      console.error("Knowledge graph export API error:", error);
      return res.status(500).json({ 
        error: "Failed to export knowledge graph insights", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for updating the knowledge graph with user feedback
  app.post("/api/knowledge-graph/feedback", async (req, res) => {
    try {
      const { graph, feedback } = req.body;
      
      if (!graph || !feedback) {
        return res.status(400).json({ error: "Graph and feedback are required" });
      }
      
      if (!feedback.content || !feedback.type) {
        return res.status(400).json({ error: "Feedback must include content and type" });
      }
      
      // Valid feedback types
      const validTypes = ['correction', 'enhancement', 'contradiction', 'confirmation'];
      if (!validTypes.includes(feedback.type)) {
        return res.status(400).json({ 
          error: `Invalid feedback type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
      
      // Update the graph with feedback
      const updatedGraph = await updateGraphWithFeedback(graph, feedback);
      
      // Re-analyze for new insights
      const insights = await analyzeKnowledgeGraph(updatedGraph);
      
      res.json({
        graph: updatedGraph,
        insights,
        feedback: {
          status: 'success',
          message: `Graph updated with ${feedback.type} feedback`
        }
      });
    } catch (error) {
      console.error("Error updating graph with feedback:", error);
      return res.status(500).json({ 
        error: "Failed to update graph with feedback", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint for AI to enhance knowledge graph based on conversation
  app.post("/api/knowledge-graph/enhance-with-ai", async (req, res) => {
    try {
      const { graph, conversationHistory, searchResults } = req.body;
      
      if (!graph || !conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ error: "Graph and conversationHistory array are required" });
      }
      
      // Enhance graph with AI analysis of conversation
      const enhancedGraph = await enhanceGraphWithAI(graph, conversationHistory, searchResults);
      
      // Generate insights based on enhanced graph
      const insights = await analyzeKnowledgeGraph(enhancedGraph);
      
      res.json({
        graph: enhancedGraph,
        insights,
        enhancement: {
          status: 'success',
          nodeCountBefore: graph.nodes.length,
          nodeCountAfter: enhancedGraph.nodes.length,
          edgeCountBefore: graph.edges.length,
          edgeCountAfter: enhancedGraph.edges.length
        }
      });
    } catch (error) {
      console.error("Error enhancing graph with AI:", error);
      return res.status(500).json({ 
        error: "Failed to enhance graph with AI", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Bookmark API routes
  app.post("/api/bookmarks", async (req, res) => {
    try {
      const bookmarkData = req.body;
      
      if (!bookmarkData.sessionId || !bookmarkData.title) {
        return res.status(400).json({ error: "SessionId and title are required" });
      }
      
      const bookmark = await storage.createBookmark(bookmarkData);
      return res.status(201).json(bookmark);
    } catch (error) {
      console.error("Create bookmark error:", error);
      return res.status(500).json({ 
        error: "Failed to create bookmark", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      
      const bookmarks = await storage.getBookmarks(userId);
      return res.json(bookmarks);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      return res.status(500).json({ 
        error: "Failed to get bookmarks", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/bookmarks/:id", async (req, res) => {
    try {
      const bookmarkId = parseInt(req.params.id);
      
      if (isNaN(bookmarkId)) {
        return res.status(400).json({ error: "Invalid bookmark ID" });
      }
      
      const bookmark = await storage.getBookmarkById(bookmarkId);
      
      if (!bookmark) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      
      return res.json(bookmark);
    } catch (error) {
      console.error("Get bookmark error:", error);
      return res.status(500).json({ 
        error: "Failed to get bookmark", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.patch("/api/bookmarks/:id", async (req, res) => {
    try {
      const bookmarkId = parseInt(req.params.id);
      const updateData = req.body;
      
      if (isNaN(bookmarkId)) {
        return res.status(400).json({ error: "Invalid bookmark ID" });
      }
      
      const bookmark = await storage.updateBookmark(bookmarkId, updateData);
      
      if (!bookmark) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      
      return res.json(bookmark);
    } catch (error) {
      console.error("Update bookmark error:", error);
      return res.status(500).json({ 
        error: "Failed to update bookmark", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/bookmarks/:id", async (req, res) => {
    try {
      const bookmarkId = parseInt(req.params.id);
      
      if (isNaN(bookmarkId)) {
        return res.status(400).json({ error: "Invalid bookmark ID" });
      }
      
      const success = await storage.deleteBookmark(bookmarkId);
      
      if (!success) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete bookmark error:", error);
      return res.status(500).json({ 
        error: "Failed to delete bookmark", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Set up file upload storage
  const uploadDir = path.join(process.cwd(), 'temp');
  
  // Create upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const storage_config = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // Generate a unique filename with original extension
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueId}${ext}`);
    }
  });
  
  const uploadDisk = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    } 
  });
  
  // File API routes
  app.post("/api/files/upload", uploadDisk.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { sessionId, userId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "SessionId is required" });
      }
      
      const fileData: InsertFile = {
        path: req.file.path,
        sessionId,
        userId: userId || null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      };
      
      const file = await storage.createFile(fileData);
      return res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      return res.status(500).json({ 
        error: "Failed to upload file", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/files", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const sessionId = req.query.sessionId as string | undefined;
      
      const files = await storage.getFiles(userId, sessionId);
      return res.json(files);
    } catch (error) {
      console.error("Get files error:", error);
      return res.status(500).json({ 
        error: "Failed to get files", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/files/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      const file = await storage.getFileById(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      return res.json(file);
    } catch (error) {
      console.error("Get file error:", error);
      return res.status(500).json({ 
        error: "Failed to get file", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.patch("/api/files/:id/analysis", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const analysis = req.body;
      
      if (isNaN(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      const file = await storage.updateFileAnalysis(fileId, analysis);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      return res.json(file);
    } catch (error) {
      console.error("Update file analysis error:", error);
      return res.status(500).json({ 
        error: "Failed to update file analysis", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/files/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      // Get file info before deleting from database
      const file = await storage.getFileById(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Delete from database
      const success = await storage.deleteFile(fileId);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete file from database" });
      }
      
      // Delete the actual file from disk
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (fsError) {
        console.error("Failed to delete file from disk:", fsError);
        // Continue with success response even if file deletion fails
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete file error:", error);
      return res.status(500).json({ 
        error: "Failed to delete file", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Canvas API routes
  app.post("/api/canvases", async (req, res) => {
    try {
      // Validate the request body
      const parseResult = insertCanvasSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid canvas data", 
          details: parseResult.error.format() 
        });
      }
      
      const canvasData = parseResult.data;
      
      // Create the canvas
      const canvas = await storage.createCanvas(canvasData);
      return res.status(201).json(canvas);
    } catch (error) {
      console.error("Create canvas error:", error);
      return res.status(500).json({ 
        error: "Failed to create canvas", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/canvases", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const sessionId = req.query.sessionId as string | undefined;
      
      const canvases = await storage.getCanvases(userId, sessionId);
      return res.json(canvases);
    } catch (error) {
      console.error("Get canvases error:", error);
      return res.status(500).json({ 
        error: "Failed to get canvases", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/canvases/:id", async (req, res) => {
    try {
      const canvasId = parseInt(req.params.id);
      
      if (isNaN(canvasId)) {
        return res.status(400).json({ error: "Invalid canvas ID" });
      }
      
      const canvas = await storage.getCanvasById(canvasId);
      
      if (!canvas) {
        return res.status(404).json({ error: "Canvas not found" });
      }
      
      return res.json(canvas);
    } catch (error) {
      console.error("Get canvas error:", error);
      return res.status(500).json({ 
        error: "Failed to get canvas", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.patch("/api/canvases/:id", async (req, res) => {
    try {
      const canvasId = parseInt(req.params.id);
      
      if (isNaN(canvasId)) {
        return res.status(400).json({ error: "Invalid canvas ID" });
      }
      
      const canvasData = req.body;
      const canvas = await storage.updateCanvas(canvasId, canvasData);
      
      if (!canvas) {
        return res.status(404).json({ error: "Canvas not found" });
      }
      
      return res.json(canvas);
    } catch (error) {
      console.error("Update canvas error:", error);
      return res.status(500).json({ 
        error: "Failed to update canvas", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/canvases/:id", async (req, res) => {
    try {
      const canvasId = parseInt(req.params.id);
      
      if (isNaN(canvasId)) {
        return res.status(400).json({ error: "Invalid canvas ID" });
      }
      
      // Delete all canvas elements first
      await storage.deleteCanvasElements(canvasId);
      
      // Then delete the canvas
      const success = await storage.deleteCanvas(canvasId);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete canvas" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete canvas error:", error);
      return res.status(500).json({ 
        error: "Failed to delete canvas", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Canvas Element API routes
  app.post("/api/canvas-elements", async (req, res) => {
    try {
      // Validate the request body
      const parseResult = insertCanvasElementSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid canvas element data", 
          details: parseResult.error.format() 
        });
      }
      
      const elementData = parseResult.data;
      
      // Verify canvas exists
      const canvas = await storage.getCanvasById(elementData.canvasId);
      if (!canvas) {
        return res.status(404).json({ error: "Canvas not found" });
      }
      
      // Create the canvas element
      const element = await storage.createCanvasElement(elementData);
      return res.status(201).json(element);
    } catch (error) {
      console.error("Create canvas element error:", error);
      return res.status(500).json({ 
        error: "Failed to create canvas element", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/canvas-elements", async (req, res) => {
    try {
      const canvasId = parseInt(req.query.canvasId as string);
      
      if (isNaN(canvasId)) {
        return res.status(400).json({ error: "Valid canvasId query parameter is required" });
      }
      
      const elements = await storage.getCanvasElements(canvasId);
      return res.json(elements);
    } catch (error) {
      console.error("Get canvas elements error:", error);
      return res.status(500).json({ 
        error: "Failed to get canvas elements", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/canvas-elements/:id", async (req, res) => {
    try {
      const elementId = parseInt(req.params.id);
      
      if (isNaN(elementId)) {
        return res.status(400).json({ error: "Invalid canvas element ID" });
      }
      
      const element = await storage.getCanvasElementById(elementId);
      
      if (!element) {
        return res.status(404).json({ error: "Canvas element not found" });
      }
      
      return res.json(element);
    } catch (error) {
      console.error("Get canvas element error:", error);
      return res.status(500).json({ 
        error: "Failed to get canvas element", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.patch("/api/canvas-elements/:id", async (req, res) => {
    try {
      const elementId = parseInt(req.params.id);
      
      if (isNaN(elementId)) {
        return res.status(400).json({ error: "Invalid canvas element ID" });
      }
      
      const elementData = req.body;
      const element = await storage.updateCanvasElement(elementId, elementData);
      
      if (!element) {
        return res.status(404).json({ error: "Canvas element not found" });
      }
      
      return res.json(element);
    } catch (error) {
      console.error("Update canvas element error:", error);
      return res.status(500).json({ 
        error: "Failed to update canvas element", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/canvas-elements/:id", async (req, res) => {
    try {
      const elementId = parseInt(req.params.id);
      
      if (isNaN(elementId)) {
        return res.status(400).json({ error: "Invalid canvas element ID" });
      }
      
      const success = await storage.deleteCanvasElement(elementId);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete canvas element" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete canvas element error:", error);
      return res.status(500).json({ 
        error: "Failed to delete canvas element", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Insight API routes
  app.post("/api/insights", async (req, res) => {
    try {
      const insightData = req.body;
      
      if (!insightData.sessionId || !insightData.type || !insightData.description) {
        return res.status(400).json({ error: "SessionId, type, and description are required" });
      }
      
      const insight = await storage.createInsight(insightData);
      return res.status(201).json(insight);
    } catch (error) {
      console.error("Create insight error:", error);
      return res.status(500).json({ 
        error: "Failed to create insight", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/insights", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const sessionId = req.query.sessionId as string | undefined;
      
      const insights = await storage.getInsights(userId, sessionId);
      return res.json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      return res.status(500).json({ 
        error: "Failed to get insights", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/insights/:id", async (req, res) => {
    try {
      const insightId = parseInt(req.params.id);
      
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      const insight = await storage.getInsightById(insightId);
      
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }
      
      return res.json(insight);
    } catch (error) {
      console.error("Get insight error:", error);
      return res.status(500).json({ 
        error: "Failed to get insight", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.delete("/api/insights/:id", async (req, res) => {
    try {
      const insightId = parseInt(req.params.id);
      
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      const success = await storage.deleteInsight(insightId);
      
      if (!success) {
        return res.status(404).json({ error: "Insight not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete insight error:", error);
      return res.status(500).json({ 
        error: "Failed to delete insight", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Sync endpoint for offline data
  app.post('/api/sync', async (req, res) => {
    try {
      const { type } = req.body;
      
      // Mock success for now - in a real app, this would trigger background syncing
      // based on the type (messages, canvas, all, etc.)
      const count = Math.floor(Math.random() * 5); // Simulate 0-4 synced items
      
      // This would register a background sync with the service worker in a real implementation
      if (type) {
        console.log(`Sync request received for type: ${type}`);
      }
      
      // Return success
      return res.json({ 
        success: true, 
        count,
        message: count > 0 ? `Successfully synced ${count} items` : 'Nothing to sync'
      });
    } catch (error) {
      console.error('Error in sync endpoint:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync data'
      });
    }
  });

  // Endpoint to test offline functionality
  app.get('/api/test-data', (req, res) => {
    return res.json({
      timestamp: Date.now(),
      message: 'This is test data that can be cached for offline use',
      randomValue: Math.random()
    });
  });
  
  // API endpoint for uploading and analyzing image colors
  app.post("/api/colors/upload", uploadAndAnalyzeImage);
  
  // API endpoint for extracting colors from image URL or data URL
  app.post("/api/colors/extract", async (req, res) => {
    try {
      await extractColorsFromUrl(req, res);
    } catch (error) {
      console.error("Color extraction API error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to extract colors from image",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Create a color palette from extracted colors
  app.post("/api/colors/generate-palette", async (req, res) => {
    try {
      const { colors, name, userId, description } = req.body;
      
      if (!colors || !Array.isArray(colors) || colors.length < 2) {
        return res.status(400).json({ 
          success: false,
          message: "At least 2 colors are required"
        });
      }
      
      // Extract primary color (usually the first one from analyzer)
      const primary = colors[0];
      
      // Generate a palette with these colors
      const palette: InsertColorPalette = {
        userId: userId || null,
        name: name || "Generated Palette",
        description: description || null,
        primary,
        primaryLight: adjustBrightness(primary, 0.15),
        primaryDark: adjustBrightness(primary, -0.15),
        secondary: colors[1],
        secondaryLight: adjustBrightness(colors[1], 0.15),
        secondaryDark: adjustBrightness(colors[1], -0.15),
        accent: colors.length > 2 ? colors[2] : adjustHue(primary, 180),
        background: "#FFFFFF",
        surface: "#F8F9FA",
        text: "#1A1A1A",
        textSecondary: "#757575",
        success: "#00C853",
        warning: "#FFC107",
        error: "#F44336",
        sourceType: "image",
        sourceImage: null,
        isDefault: false,
        metadata: {
          theme: "generated",
          tags: ["generated", "adaptive", "image-based"],
          harmony: "complementary",
          colorSpace: "rgb"
        }
      };
      
      // Save the palette
      const savedPalette = await storage.createColorPalette(palette);
      
      return res.status(201).json({
        success: true,
        palette: savedPalette,
        message: "Color palette generated and saved successfully"
      });
    } catch (error) {
      console.error("Generate color palette error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to generate color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get color palettes
  app.get("/api/colors/palettes", async (req, res) => {
    try {
      // Get userId from query if provided
      const userId = req.query.userId as string | undefined;
      
      // Get the palettes
      const palettes = await storage.getColorPalettes(userId);
      
      return res.json({
        success: true,
        palettes,
        count: palettes.length,
      });
    } catch (error) {
      console.error("Get color palettes error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to get color palettes", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get default color palette (for app theme)
  app.get("/api/colors/default-palette", async (_req, res) => {
    try {
      const defaultPalette = await storage.getDefaultColorPalette();
      
      if (!defaultPalette) {
        // If no default palette exists, return a standard one
        return res.status(404).json({
          success: false,
          message: "No default palette found",
          palette: {
            name: "Default",
            primary: "#6B4BFF",
            primaryLight: "#9C85FF",
            primaryDark: "#4935CC",
            secondary: "#F0F3FF",
            secondaryLight: "#FFFFFF", 
            secondaryDark: "#D6DEFF",
            accent: "#00C2FF",
            background: "#FFFFFF",
            surface: "#F8F9FA",
            text: "#1A1A1A",
            textSecondary: "#757575",
            success: "#00C853",
            warning: "#FFC107",
            error: "#F44336",
          }
        });
      }
      
      return res.json({
        success: true,
        palette: defaultPalette
      });
    } catch (error) {
      console.error("Get default color palette error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to get default color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Set a color palette as default
  app.post("/api/colors/set-default", async (req, res) => {
    try {
      const { paletteId } = req.body;
      
      if (!paletteId) {
        return res.status(400).json({ 
          success: false,
          message: "Palette ID is required"
        });
      }
      
      const updatedPalette = await storage.setDefaultColorPalette(paletteId);
      
      if (!updatedPalette) {
        return res.status(404).json({
          success: false,
          message: "Palette not found"
        });
      }
      
      return res.json({
        success: true,
        palette: updatedPalette,
        message: "Default palette updated successfully"
      });
    } catch (error) {
      console.error("Set default color palette error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to set default color palette", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // API endpoint to serve uploaded files from public directory
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public', 'uploads', path.basename(req.url));
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });
  
  // Project Management API Routes
  
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const projects = await storage.getProjects(userId);
      return res.json(projects);
    } catch (error) {
      console.error("Projects API error:", error);
      return res.status(500).json({
        error: "Failed to get projects",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      return res.json(project);
    } catch (error) {
      console.error("Project detail API error:", error);
      return res.status(500).json({
        error: "Failed to get project details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = req.body;
      const validatedData = insertProjectSchema.parse(projectData);
      
      const project = await storage.createProject(validatedData);
      return res.status(201).json(project);
    } catch (error) {
      console.error("Create project API error:", error);
      return res.status(400).json({
        error: "Failed to create project",
        details: error instanceof Error ? error.message : "Invalid project data"
      });
    }
  });
  
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const projectData = req.body;
      const project = await storage.updateProject(projectId, projectData);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      return res.json(project);
    } catch (error) {
      console.error("Update project API error:", error);
      return res.status(400).json({
        error: "Failed to update project",
        details: error instanceof Error ? error.message : "Invalid project data"
      });
    }
  });
  
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const success = await storage.deleteProject(projectId);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete project API error:", error);
      return res.status(500).json({
        error: "Failed to delete project",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/projects/:id/progress", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const progress = await storage.getProjectProgress(projectId);
      return res.json({ progress });
    } catch (error) {
      console.error("Project progress API error:", error);
      return res.status(500).json({
        error: "Failed to get project progress",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Milestones
  app.get("/api/projects/:projectId/milestones", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const milestones = await storage.getMilestones(projectId);
      return res.json(milestones);
    } catch (error) {
      console.error("Milestones API error:", error);
      return res.status(500).json({
        error: "Failed to get milestones",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: "Invalid milestone ID" });
      }
      
      const milestone = await storage.getMilestoneById(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      return res.json(milestone);
    } catch (error) {
      console.error("Milestone detail API error:", error);
      return res.status(500).json({
        error: "Failed to get milestone details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/milestones", async (req, res) => {
    try {
      const milestoneData = req.body;
      const validatedData = insertMilestoneSchema.parse(milestoneData);
      
      const milestone = await storage.createMilestone(validatedData);
      return res.status(201).json(milestone);
    } catch (error) {
      console.error("Create milestone API error:", error);
      return res.status(400).json({
        error: "Failed to create milestone",
        details: error instanceof Error ? error.message : "Invalid milestone data"
      });
    }
  });
  
  app.patch("/api/milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: "Invalid milestone ID" });
      }
      
      const milestoneData = req.body;
      const milestone = await storage.updateMilestone(milestoneId, milestoneData);
      
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      return res.json(milestone);
    } catch (error) {
      console.error("Update milestone API error:", error);
      return res.status(400).json({
        error: "Failed to update milestone",
        details: error instanceof Error ? error.message : "Invalid milestone data"
      });
    }
  });
  
  app.delete("/api/milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: "Invalid milestone ID" });
      }
      
      const success = await storage.deleteMilestone(milestoneId);
      if (!success) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete milestone API error:", error);
      return res.status(500).json({
        error: "Failed to delete milestone",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const milestoneId = req.query.milestoneId ? parseInt(req.query.milestoneId as string) : undefined;
      
      if (projectId && isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      if (milestoneId && isNaN(milestoneId)) {
        return res.status(400).json({ error: "Invalid milestone ID" });
      }
      
      const tasks = await storage.getTasks(projectId, milestoneId);
      return res.json(tasks);
    } catch (error) {
      console.error("Tasks API error:", error);
      return res.status(500).json({
        error: "Failed to get tasks",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      return res.json(task);
    } catch (error) {
      console.error("Task detail API error:", error);
      return res.status(500).json({
        error: "Failed to get task details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = req.body;
      const validatedData = insertTaskSchema.parse(taskData);
      
      const task = await storage.createTask(validatedData);
      return res.status(201).json(task);
    } catch (error) {
      console.error("Create task API error:", error);
      return res.status(400).json({
        error: "Failed to create task",
        details: error instanceof Error ? error.message : "Invalid task data"
      });
    }
  });
  
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const taskData = req.body;
      const task = await storage.updateTask(taskId, taskData);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      return res.json(task);
    } catch (error) {
      console.error("Update task API error:", error);
      return res.status(400).json({
        error: "Failed to update task",
        details: error instanceof Error ? error.message : "Invalid task data"
      });
    }
  });
  
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const success = await storage.deleteTask(taskId);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete task API error:", error);
      return res.status(500).json({
        error: "Failed to delete task",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Research Insights
  app.get("/api/projects/:projectId/insights", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const insights = await storage.getResearchInsights(projectId);
      return res.json(insights);
    } catch (error) {
      console.error("Research insights API error:", error);
      return res.status(500).json({
        error: "Failed to get research insights",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/research-insights/:id", async (req, res) => {
    try {
      const insightId = parseInt(req.params.id);
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      const insight = await storage.getResearchInsightById(insightId);
      if (!insight) {
        return res.status(404).json({ error: "Research insight not found" });
      }
      
      return res.json(insight);
    } catch (error) {
      console.error("Research insight detail API error:", error);
      return res.status(500).json({
        error: "Failed to get research insight details",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/research-insights", async (req, res) => {
    try {
      const insightData = req.body;
      const validatedData = insertResearchInsightSchema.parse(insightData);
      
      const insight = await storage.createResearchInsight(validatedData);
      return res.status(201).json(insight);
    } catch (error) {
      console.error("Create research insight API error:", error);
      return res.status(400).json({
        error: "Failed to create research insight",
        details: error instanceof Error ? error.message : "Invalid insight data"
      });
    }
  });
  
  app.patch("/api/research-insights/:id", async (req, res) => {
    try {
      const insightId = parseInt(req.params.id);
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      const insightData = req.body;
      const insight = await storage.updateResearchInsight(insightId, insightData);
      
      if (!insight) {
        return res.status(404).json({ error: "Research insight not found" });
      }
      
      return res.json(insight);
    } catch (error) {
      console.error("Update research insight API error:", error);
      return res.status(400).json({
        error: "Failed to update research insight",
        details: error instanceof Error ? error.message : "Invalid insight data"
      });
    }
  });
  
  app.delete("/api/research-insights/:id", async (req, res) => {
    try {
      const insightId = parseInt(req.params.id);
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      const success = await storage.deleteResearchInsight(insightId);
      if (!success) {
        return res.status(404).json({ error: "Research insight not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete research insight API error:", error);
      return res.status(500).json({
        error: "Failed to delete research insight",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Insight-Task Relations
  app.get("/api/insight-task-relations", async (req, res) => {
    try {
      const insightId = req.query.insightId ? parseInt(req.query.insightId as string) : undefined;
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      
      if (insightId && isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }
      
      if (taskId && isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const relations = await storage.getInsightTaskRelations(insightId, taskId);
      return res.json(relations);
    } catch (error) {
      console.error("Insight-task relations API error:", error);
      return res.status(500).json({
        error: "Failed to get insight-task relations",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/insight-task-relations", async (req, res) => {
    try {
      const relationData = req.body;
      const validatedData = insertInsightTaskRelationSchema.parse(relationData);
      
      const relation = await storage.createInsightTaskRelation(validatedData);
      return res.status(201).json(relation);
    } catch (error) {
      console.error("Create insight-task relation API error:", error);
      return res.status(400).json({
        error: "Failed to create insight-task relation",
        details: error instanceof Error ? error.message : "Invalid relation data"
      });
    }
  });
  
  app.delete("/api/insight-task-relations/:id", async (req, res) => {
    try {
      const relationId = parseInt(req.params.id);
      if (isNaN(relationId)) {
        return res.status(400).json({ error: "Invalid relation ID" });
      }
      
      const success = await storage.deleteInsightTaskRelation(relationId);
      if (!success) {
        return res.status(404).json({ error: "Insight-task relation not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete insight-task relation API error:", error);
      return res.status(500).json({
        error: "Failed to delete insight-task relation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Project Comments
  app.get("/api/projects/:projectId/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const comments = await storage.getProjectComments(projectId);
      return res.json(comments);
    } catch (error) {
      console.error("Project comments API error:", error);
      return res.status(500).json({
        error: "Failed to get project comments",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/project-comments", async (req, res) => {
    try {
      const commentData = req.body;
      const validatedData = insertProjectCommentSchema.parse(commentData);
      
      const comment = await storage.createProjectComment(validatedData);
      return res.status(201).json(comment);
    } catch (error) {
      console.error("Create project comment API error:", error);
      return res.status(400).json({
        error: "Failed to create project comment",
        details: error instanceof Error ? error.message : "Invalid comment data"
      });
    }
  });
  
  app.delete("/api/project-comments/:id", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }
      
      const success = await storage.deleteProjectComment(commentId);
      if (!success) {
        return res.status(404).json({ error: "Project comment not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete project comment API error:", error);
      return res.status(500).json({
        error: "Failed to delete project comment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Task Comments
  app.get("/api/tasks/:taskId/comments", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const comments = await storage.getTaskComments(taskId);
      return res.json(comments);
    } catch (error) {
      console.error("Task comments API error:", error);
      return res.status(500).json({
        error: "Failed to get task comments",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/task-comments", async (req, res) => {
    try {
      const commentData = req.body;
      const validatedData = insertTaskCommentSchema.parse(commentData);
      
      const comment = await storage.createTaskComment(validatedData);
      return res.status(201).json(comment);
    } catch (error) {
      console.error("Create task comment API error:", error);
      return res.status(400).json({
        error: "Failed to create task comment",
        details: error instanceof Error ? error.message : "Invalid comment data"
      });
    }
  });
  
  app.delete("/api/task-comments/:id", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }
      
      const success = await storage.deleteTaskComment(commentId);
      if (!success) {
        return res.status(404).json({ error: "Task comment not found" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete task comment API error:", error);
      return res.status(500).json({
        error: "Failed to delete task comment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to AI Assistant WebSocket server'
    }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
        else if (data.type === 'onboarding_progress') {
          // Echo back onboarding progress to confirm receipt
          ws.send(JSON.stringify({
            type: 'onboarding_update',
            data: data.data
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
