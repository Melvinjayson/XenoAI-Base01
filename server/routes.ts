import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chat } from "./openai";
import { webSearch, getSuggestions } from "./search";
import { openSearch, openConversationalResponse } from "./open-search";
import { synthesizeSpeech } from "./voice";
import { createKnowledgeGraphFromSearch, expandGraphNode, analyzeKnowledgeGraph, type NodeType } from "./knowledge-graph";
import { WebSocketServer } from "ws";
import path from "path";

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
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await chat(message, history || []);
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
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const result = await createKnowledgeGraphFromSearch(query);
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
        const preference = await storage.saveUserPreference(
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
      const preferences = await storage.getUserPreferences(sessionId);
      return res.json({ preferences });
    } catch (error) {
      console.error("Get preferences API error:", error);
      return res.status(500).json({ 
        error: "Failed to get preferences", 
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
