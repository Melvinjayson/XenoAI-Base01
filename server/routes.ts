import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chat } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
