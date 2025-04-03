import { storage, ConversationMemory, ConversationSummary, UserPreference } from "./storage";
import OpenAI from "openai";
import { ChatMessage } from "./types";

// Extend ChatMessage to include optional sources
interface ExtendedChatMessage extends ChatMessage {
  sources?: any;
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MemoryOptions {
  maxTokens?: number;
  recency?: "recent" | "all";
  relevance?: "high" | "medium" | "low";
  summarize?: boolean;
}

// Memory manager class with different memory types
export class MemoryManager {
  // Default session ID for anonymous users
  private static readonly DEFAULT_SESSION = "anonymous-session";

  // Memory types
  private shortTermMemory: Map<string, ExtendedChatMessage[]> = new Map();
  private workingMemory: Map<string, { 
    topics: Set<string>, 
    entities: Set<string>,
    userPreferences: Map<string, string>,
    recentSummary: string | null
  }> = new Map();

  constructor() {
    // Initialize working memory for default session
    this.ensureWorkingMemory(MemoryManager.DEFAULT_SESSION);
  }

  private ensureWorkingMemory(sessionId: string) {
    if (!this.workingMemory.has(sessionId)) {
      this.workingMemory.set(sessionId, {
        topics: new Set<string>(),
        entities: new Set<string>(),
        userPreferences: new Map<string, string>(),
        recentSummary: null
      });
    }
  }

  // Add a message to short-term memory
  async addMessage(message: ExtendedChatMessage, sessionId: string = MemoryManager.DEFAULT_SESSION): Promise<void> {
    // Ensure session exists
    let session = await storage.getSession(sessionId);
    if (!session) {
      session = await storage.createSession(sessionId);
    }

    // Add to short-term memory
    const shortTerm = this.shortTermMemory.get(sessionId) || [];
    shortTerm.push(message);
    this.shortTermMemory.set(sessionId, shortTerm);

    // Limit short-term memory to last 10 messages
    if (shortTerm.length > 10) {
      this.shortTermMemory.set(sessionId, shortTerm.slice(-10));
    }

    // Persist to storage
    await storage.createMessage({
      role: message.role,
      content: message.content,
      sessionId,
      userId: null, // For now, we don't have user authentication
      sources: message.sources || null
    });

    // Extract entities and topics to update working memory when assistant responds
    if (message.role === "assistant") {
      this.updateWorkingMemory(message, sessionId);
    }

    // If we have enough messages, create a summary
    const shouldSummarize = (
      shortTerm.length >= 6 && 
      shortTerm.filter(m => m.role === "assistant").length >= 3
    );

    if (shouldSummarize) {
      this.summarizeConversation(sessionId);
    }
  }

  // Get messages from memory with flexible options
  async getMessages(
    sessionId: string = MemoryManager.DEFAULT_SESSION,
    options: MemoryOptions = {}
  ): Promise<ChatMessage[]> {
    const {
      maxTokens = 2000,
      recency = "recent",
      relevance = "high"
    } = options;

    // First, get short-term memory (most recent messages)
    const shortTerm = this.shortTermMemory.get(sessionId) || [];
    
    // For simple recent conversations, just return short-term memory
    if (recency === "recent" && shortTerm.length > 0) {
      return shortTerm;
    }

    // For more context, get from persistent storage with limits
    let persistedMessages: ChatMessage[] = [];
    
    try {
      const messages = await storage.getMessagesBySession(
        sessionId, 
        relevance === "high" ? 5 : relevance === "medium" ? 10 : 20
      );
      
      persistedMessages = messages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        sources: m.sources as any || undefined
      }));
    } catch (error) {
      console.error("Error retrieving persisted messages:", error);
    }
    
    // If we have a summary in working memory, use it as context
    const workingMem = this.workingMemory.get(sessionId);
    
    if (workingMem?.recentSummary && relevance !== "low") {
      return [
        {
          role: "system",
          content: `Previous conversation summary: ${workingMem.recentSummary}`
        },
        ...shortTerm
      ];
    }
    
    // Combine and return messages
    return [
      ...persistedMessages.filter(
        m => !shortTerm.some(stm => stm.content === m.content)
      ),
      ...shortTerm
    ];
  }

  // Extract topics and entities to update working memory
  private async updateWorkingMemory(message: ExtendedChatMessage, sessionId: string) {
    this.ensureWorkingMemory(sessionId);
    const workingMem = this.workingMemory.get(sessionId)!;
    
    try {
      // Use OpenAI to extract entities and topics
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract key topics, entities, and potential user preferences from this message. Format your response as JSON with these keys: topics (array of strings), entities (array of strings), and preferences (array of objects with key and value properties)."
          },
          { role: "user", content: message.content }
        ],
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Update working memory
      if (result.topics && Array.isArray(result.topics)) {
        result.topics.forEach((topic: string) => workingMem.topics.add(topic.toLowerCase()));
      }
      
      if (result.entities && Array.isArray(result.entities)) {
        result.entities.forEach((entity: string) => workingMem.entities.add(entity));
      }
      
      if (result.preferences && Array.isArray(result.preferences)) {
        result.preferences.forEach((pref: {key: string, value: string}) => {
          workingMem.userPreferences.set(pref.key, pref.value);
          // Also store in long-term memory
          storage.saveUserPreference(sessionId, pref.key, pref.value);
        });
      }
      
      this.workingMemory.set(sessionId, workingMem);
    } catch (error) {
      console.error("Error updating working memory:", error);
    }
  }

  // Create a summary of the conversation for long-term memory
  private async summarizeConversation(sessionId: string) {
    try {
      const messages = await this.getMessages(sessionId, { recency: "all" });
      
      if (messages.length < 3) return; // Not enough messages to summarize
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Summarize this conversation in a concise paragraph. Then list the 3-5 main topics discussed. Format your response as JSON with these keys: summary (string) and topics (array of strings)."
          },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Update working memory with summary
      this.ensureWorkingMemory(sessionId);
      const workingMem = this.workingMemory.get(sessionId)!;
      workingMem.recentSummary = result.summary || "Conversation about various topics";
      this.workingMemory.set(sessionId, workingMem);
      
      // Persist summary to long-term memory
      await storage.updateConversationSummary(
        sessionId,
        result.summary || "Conversation about various topics",
        Array.isArray(result.topics) ? result.topics : []
      );
      
      // Create conversation memory
      const memory: ConversationMemory = {
        id: `mem-${Date.now()}`,
        sessionId,
        summary: result.summary || "Conversation about various topics",
        topics: Array.isArray(result.topics) ? result.topics : [],
        entities: Array.from(workingMem.entities),
        createdAt: new Date(),
        lastActive: new Date()
      };
      
      await storage.createConversationMemory(memory);
      
      console.log("Created conversation summary");
    } catch (error) {
      console.error("Error summarizing conversation:", error);
    }
  }

  // Get relevant context based on the current query and conversation history
  async getRelevantContext(
    query: string,
    sessionId: string = MemoryManager.DEFAULT_SESSION
  ): Promise<string> {
    try {
      // Get user preferences that might be relevant
      const preferences = await storage.getUserPreferences(sessionId);
      
      // Get conversation memories
      const memories = await storage.getConversationMemories(sessionId, 5);
      
      // If we don't have memories or preferences, return empty context
      if (preferences.length === 0 && memories.length === 0) {
        return "";
      }
      
      // Format the context from memories and preferences
      let context = "Previous conversation context:\n";
      
      if (memories.length > 0) {
        context += "Conversation summaries:\n";
        memories.forEach(memory => {
          context += `- ${memory.summary}\n`;
          context += `  Topics: ${memory.topics.join(", ")}\n`;
        });
      }
      
      if (preferences.length > 0) {
        context += "\nUser preferences:\n";
        preferences.forEach(pref => {
          context += `- ${pref.key}: ${pref.value}\n`;
        });
      }
      
      return context;
    } catch (error) {
      console.error("Error getting relevant context:", error);
      return "";
    }
  }

  // Store user preference in both working and long-term memory
  async storeUserPreference(
    key: string,
    value: string,
    sessionId: string = MemoryManager.DEFAULT_SESSION
  ): Promise<void> {
    // Update working memory
    this.ensureWorkingMemory(sessionId);
    const workingMem = this.workingMemory.get(sessionId)!;
    workingMem.userPreferences.set(key, value);
    this.workingMemory.set(sessionId, workingMem);
    
    // Store in long-term memory
    await storage.saveUserPreference(sessionId, key, value);
  }
}

// Export a singleton instance
export const memoryManager = new MemoryManager();