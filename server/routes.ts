import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chat } from "./openai";
import { webSearch, getSuggestions } from "./search";
import { synthesizeSpeech } from "./voice";
import { createKnowledgeGraphFromSearch, expandGraphNode, analyzeKnowledgeGraph } from "./knowledge-graph";
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

  const httpServer = createServer(app);
  return httpServer;
}
