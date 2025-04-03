import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chat } from "./openai";
import { webSearch, getSuggestions } from "./search";
import { synthesizeSpeech } from "./voice";
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

  const httpServer = createServer(app);
  return httpServer;
}
