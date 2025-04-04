import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, IStorage, MemStorage } from "./storage";
import { chat } from "./openai";
import { webSearch, getSuggestions } from "./search";
import { openSearch, openConversationalResponse } from "./open-search";
import { synthesizeSpeech } from "./voice";
import { speechToText } from "./speech-to-text";
import { createKnowledgeGraphFromSearch, expandGraphNode, analyzeKnowledgeGraph, type NodeType } from "./knowledge-graph";
import { WebSocketServer } from "ws";
import path from "path";
import multer from "multer";

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
      const { message, history, filters } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Pass filters to chat function for advanced search
      const response = await chat(message, history || [], filters);
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
      const { text, voiceId } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await synthesizeSpeech({ text, voiceId });
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

  // API health check endpoint
  app.get("/api/health", (_req, res) => {
    const openaiApiKey = process.env.OPENAI_API_KEY ? "✓" : "✗";
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ? "✓" : "✗";
    
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        openai: openaiApiKey,
        elevenlabs: elevenLabsApiKey
      }
    });
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
  const upload = multer({ 
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // limit to 10MB
    } 
  });

  // Speech to text API endpoint
  app.post("/api/speech-to-text", upload.single('audio'), async (req, res) => {
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
