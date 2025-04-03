import { users, messages, sessions, type User, type InsertUser, type Message, type InsertMessage, type Session, type InsertSession } from "@shared/schema";

// Memory types for enhanced context awareness
export interface UserPreference {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMemory {
  id: string;
  summary: string;
  topics: string[];
  entities: string[];
  sessionId: string;
  createdAt: Date;
  lastActive: Date;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  summary: string;
  mainTopics: string[];
  createdAt: Date;
}

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session methods
  createSession(sessionId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  updateSessionActivity(sessionId: string): Promise<void>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySession(sessionId: string, limit?: number): Promise<Message[]>;
  
  // Memory methods
  saveUserPreference(userId: string, key: string, value: string): Promise<UserPreference>;
  getUserPreferences(userId: string): Promise<UserPreference[]>;
  createConversationMemory(memory: ConversationMemory): Promise<ConversationMemory>;
  getConversationMemories(userId: string, limit?: number): Promise<ConversationMemory[]>;
  updateConversationSummary(sessionId: string, summary: string, topics: string[]): Promise<ConversationSummary>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private messages: Map<string, Message[]>;
  private userPreferences: Map<string, UserPreference[]>;
  private conversationMemories: Map<string, ConversationMemory[]>;
  private conversationSummaries: Map<string, ConversationSummary>;
  
  private userCurrentId: number;
  private messageCurrentId: number;
  private sessionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.userPreferences = new Map();
    this.conversationMemories = new Map();
    this.conversationSummaries = new Map();
    
    this.userCurrentId = 1;
    this.messageCurrentId = 1;
    this.sessionCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Session methods
  async createSession(sessionId: string): Promise<Session> {
    const id = this.sessionCurrentId++;
    const now = new Date();
    const session: Session = {
      id,
      sessionId,
      createdAt: now,
      lastActive: now
    };
    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return session;
  }
  
  async getSession(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId);
  }
  
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = new Date();
      this.sessions.set(sessionId, session);
    }
  }
  
  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const now = new Date();
    
    // Ensure sources is properly formatted if present
    let formattedSources: {name: string, value: string}[] | null = null;
    if (insertMessage.sources) {
      if (Array.isArray(insertMessage.sources)) {
        // Extract only the name and value properties from each source
        formattedSources = insertMessage.sources.map(source => {
          // Safely access properties using type assertions
          const sourceObj = source as any;
          const name = typeof sourceObj.name === 'string' ? sourceObj.name : '';
          const value = typeof sourceObj.value === 'string' ? sourceObj.value : 
                       (typeof sourceObj.url === 'string' ? sourceObj.url : '');
          return { name, value };
        });
      } else {
        // Convert single object to array
        const sourceObj = insertMessage.sources as any;
        if (typeof sourceObj === 'object' && sourceObj !== null) {
          const name = typeof sourceObj.name === 'string' ? sourceObj.name : '';
          const value = typeof sourceObj.value === 'string' ? sourceObj.value : 
                       (typeof sourceObj.url === 'string' ? sourceObj.url : '');
          formattedSources = [{ name, value }];
        }
      }
    }
    
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: now,
      sources: formattedSources,
      userId: insertMessage.userId || null
    };
    
    const sessionMessages = this.messages.get(insertMessage.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(insertMessage.sessionId, sessionMessages);
    
    await this.updateSessionActivity(insertMessage.sessionId);
    return message;
  }
  
  async getMessagesBySession(sessionId: string, limit?: number): Promise<Message[]> {
    const sessionMessages = this.messages.get(sessionId) || [];
    if (limit) {
      return [...sessionMessages].reverse().slice(0, limit).reverse();
    }
    return sessionMessages;
  }
  
  // Memory methods
  async saveUserPreference(userId: string, key: string, value: string): Promise<UserPreference> {
    const now = new Date();
    const preference: UserPreference = {
      id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      key,
      value,
      createdAt: now,
      updatedAt: now
    };
    
    const userPrefs = this.userPreferences.get(userId) || [];
    
    // Update if exists, otherwise add
    const existingIndex = userPrefs.findIndex(p => p.key === key);
    if (existingIndex >= 0) {
      userPrefs[existingIndex] = preference;
    } else {
      userPrefs.push(preference);
    }
    
    this.userPreferences.set(userId, userPrefs);
    return preference;
  }
  
  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    return this.userPreferences.get(userId) || [];
  }
  
  async createConversationMemory(memory: ConversationMemory): Promise<ConversationMemory> {
    const userMemories = this.conversationMemories.get(memory.sessionId) || [];
    userMemories.push(memory);
    this.conversationMemories.set(memory.sessionId, userMemories);
    return memory;
  }
  
  async getConversationMemories(userId: string, limit?: number): Promise<ConversationMemory[]> {
    const memories = this.conversationMemories.get(userId) || [];
    if (limit) {
      return memories.slice(-limit);
    }
    return memories;
  }
  
  async updateConversationSummary(sessionId: string, summary: string, topics: string[]): Promise<ConversationSummary> {
    const now = new Date();
    const conversationSummary: ConversationSummary = {
      id: `summary-${Date.now()}`,
      sessionId,
      summary,
      mainTopics: topics,
      createdAt: now
    };
    
    this.conversationSummaries.set(sessionId, conversationSummary);
    return conversationSummary;
  }
}

export const storage = new MemStorage();
