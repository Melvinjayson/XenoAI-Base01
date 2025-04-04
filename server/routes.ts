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
import { apiQuotaManager } from "./api-quota-manager";
import { 
  InsertFile, 
  InsertCanvas, 
  insertCanvasSchema, 
  InsertCanvasElement, 
  insertCanvasElementSchema 
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
      
      // Pass language parameter to synthesizeSpeech for language-specific voices
      const result = await synthesizeSpeech({ 
        text, 
        voiceId,
        language: language || 'en' // Default to English if no language specified
      });
      
      return res.json(result);
    } catch (error) {
      console.error("Voice synthesis API error:", error);
      return res.status(500).json({ 
        error: "Failed to synthesize speech", 
        details: error instanceof Error ? error.message : "Unknown error" 
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
      return await speechToText(req, res);
    } catch (error) {
      console.error("Speech-to-text API error:", error);
      return res.status(500).json({ 
        error: "Failed to process speech to text", 
        details: error instanceof Error ? error.message : "Unknown error" 
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
  
  // API endpoint to serve uploaded files from public directory
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public', 'uploads', path.basename(req.url));
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
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
