import { 
  users, messages, sessions, bookmarks, files, insights, preferences, canvases, canvasElements,
  type User, type InsertUser, 
  type Message, type InsertMessage, 
  type Session, type InsertSession,
  type Bookmark, type InsertBookmark,
  type File, type InsertFile,
  type Insight, type InsertInsight,
  type Preference, type InsertPreference,
  type Canvas, type InsertCanvas,
  type CanvasElement, type InsertCanvasElement
} from "@shared/schema";

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
  
  // Bookmark methods
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  getBookmarks(userId?: string): Promise<Bookmark[]>;
  getBookmarkById(bookmarkId: number): Promise<Bookmark | undefined>;
  updateBookmark(bookmarkId: number, data: Partial<InsertBookmark>): Promise<Bookmark | undefined>;
  deleteBookmark(bookmarkId: number): Promise<boolean>;
  
  // File methods
  createFile(file: InsertFile): Promise<File>;
  getFiles(userId?: string, sessionId?: string): Promise<File[]>;
  getFileById(fileId: number): Promise<File | undefined>;
  updateFileAnalysis(fileId: number, analysis: any): Promise<File | undefined>;
  deleteFile(fileId: number): Promise<boolean>;
  
  // Insight methods
  createInsight(insight: InsertInsight): Promise<Insight>;
  getInsights(userId?: string, sessionId?: string): Promise<Insight[]>;
  getInsightById(insightId: number): Promise<Insight | undefined>;
  deleteInsight(insightId: number): Promise<boolean>;
  
  // Preference methods
  savePreference(preference: InsertPreference): Promise<Preference>;
  getPreferencesByUserId(userId: string): Promise<Preference[]>;
  getPreferenceByKey(userId: string, key: string): Promise<Preference | undefined>;
  
  // Memory methods (legacy)
  saveUserPreference(userId: string, key: string, value: string): Promise<UserPreference>;
  getUserPreferences(userId: string): Promise<UserPreference[]>;
  createConversationMemory(memory: ConversationMemory): Promise<ConversationMemory>;
  getConversationMemories(userId: string, limit?: number): Promise<ConversationMemory[]>;
  updateConversationSummary(sessionId: string, summary: string, topics: string[]): Promise<ConversationSummary>;
  
  // Canvas methods
  createCanvas(canvas: InsertCanvas): Promise<Canvas>;
  getCanvases(userId?: string, sessionId?: string): Promise<Canvas[]>;
  getCanvasById(canvasId: number): Promise<Canvas | undefined>;
  updateCanvas(canvasId: number, data: Partial<InsertCanvas>): Promise<Canvas | undefined>;
  deleteCanvas(canvasId: number): Promise<boolean>;
  
  // Canvas element methods
  createCanvasElement(element: InsertCanvasElement): Promise<CanvasElement>;
  getCanvasElements(canvasId: number): Promise<CanvasElement[]>;
  getCanvasElementById(elementId: number): Promise<CanvasElement | undefined>;
  updateCanvasElement(elementId: number, data: Partial<InsertCanvasElement>): Promise<CanvasElement | undefined>;
  deleteCanvasElement(elementId: number): Promise<boolean>;
  deleteCanvasElements(canvasId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private messages: Map<string, Message[]>;
  private userPreferences: Map<string, UserPreference[]>;
  private conversationMemories: Map<string, ConversationMemory[]>;
  private conversationSummaries: Map<string, ConversationSummary>;
  
  // New storage maps for new features
  private bookmarks: Map<number, Bookmark>;
  private files: Map<number, File>;
  private insights: Map<number, Insight>;
  private preferences: Map<string, Preference[]>; // Key is userId
  private canvases: Map<number, Canvas>;
  private canvasElements: Map<number, CanvasElement[]>; // Key is canvasId
  
  private userCurrentId: number;
  private messageCurrentId: number;
  private sessionCurrentId: number;
  private bookmarkCurrentId: number;
  private fileCurrentId: number;
  private insightCurrentId: number;
  private preferenceCurrentId: number;
  private canvasCurrentId: number;
  private canvasElementCurrentId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.userPreferences = new Map();
    this.conversationMemories = new Map();
    this.conversationSummaries = new Map();
    
    // Initialize new maps
    this.bookmarks = new Map();
    this.files = new Map();
    this.insights = new Map();
    this.preferences = new Map();
    this.canvases = new Map();
    this.canvasElements = new Map();
    
    this.userCurrentId = 1;
    this.messageCurrentId = 1;
    this.sessionCurrentId = 1;
    this.bookmarkCurrentId = 1;
    this.fileCurrentId = 1;
    this.insightCurrentId = 1;
    this.preferenceCurrentId = 1;
    this.canvasCurrentId = 1;
    this.canvasElementCurrentId = 1;
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

  // Bookmark methods
  async createBookmark(bookmark: InsertBookmark): Promise<Bookmark> {
    const id = this.bookmarkCurrentId++;
    const now = new Date();
    
    // Handle tags to ensure it's a string array or null
    let processedTags: string[] | null = null;
    if (bookmark.tags) {
      if (Array.isArray(bookmark.tags)) {
        processedTags = bookmark.tags.map(tag => String(tag));
      } else {
        processedTags = [String(bookmark.tags)];
      }
    }
    
    const newBookmark: Bookmark = {
      id,
      sessionId: bookmark.sessionId,
      title: bookmark.title,
      userId: bookmark.userId || null,
      description: bookmark.description || null,
      snippet: bookmark.snippet || null,
      tags: processedTags,
      isFavorite: bookmark.isFavorite || false,
      createdAt: now,
      updatedAt: now,
      knowledgeGraphSnapshot: bookmark.knowledgeGraphSnapshot || null
    };
    
    this.bookmarks.set(id, newBookmark);
    return newBookmark;
  }
  
  async getBookmarks(userId?: string): Promise<Bookmark[]> {
    const allBookmarks = Array.from(this.bookmarks.values());
    
    if (userId) {
      return allBookmarks.filter(bookmark => bookmark.userId === userId);
    }
    
    return allBookmarks;
  }
  
  async getBookmarkById(bookmarkId: number): Promise<Bookmark | undefined> {
    return this.bookmarks.get(bookmarkId);
  }
  
  async updateBookmark(bookmarkId: number, data: Partial<InsertBookmark>): Promise<Bookmark | undefined> {
    const bookmark = this.bookmarks.get(bookmarkId);
    
    if (!bookmark) {
      return undefined;
    }
    
    // Process tags if present
    let processedTags: string[] | null = bookmark.tags;
    if (data.tags !== undefined) {
      if (data.tags === null) {
        processedTags = null;
      } else if (Array.isArray(data.tags)) {
        processedTags = data.tags.map(tag => String(tag));
      } else if (data.tags) {
        processedTags = [String(data.tags)];
      }
    }
    
    // Create a properly typed updated bookmark
    const updatedBookmark: Bookmark = {
      id: bookmark.id,
      sessionId: data.sessionId || bookmark.sessionId,
      title: data.title || bookmark.title,
      userId: data.userId || bookmark.userId,
      description: data.description !== undefined ? data.description : bookmark.description,
      snippet: data.snippet !== undefined ? data.snippet : bookmark.snippet,
      tags: processedTags,
      isFavorite: data.isFavorite !== undefined ? data.isFavorite : bookmark.isFavorite,
      createdAt: bookmark.createdAt,
      updatedAt: new Date(),
      knowledgeGraphSnapshot: data.knowledgeGraphSnapshot || bookmark.knowledgeGraphSnapshot
    };
    
    this.bookmarks.set(bookmarkId, updatedBookmark);
    return updatedBookmark;
  }
  
  async deleteBookmark(bookmarkId: number): Promise<boolean> {
    return this.bookmarks.delete(bookmarkId);
  }
  
  // File methods
  async createFile(file: InsertFile): Promise<File> {
    const id = this.fileCurrentId++;
    const now = new Date();
    
    // Create properly typed analysis object with correct properties
    let typedAnalysis: { summary?: string; entities?: any[]; keywords?: string[] } | null = null;
    if (file.analysis) {
      typedAnalysis = {
        summary: typeof file.analysis.summary === 'string' ? file.analysis.summary : undefined,
        entities: Array.isArray(file.analysis.entities) ? file.analysis.entities : undefined,
        keywords: Array.isArray(file.analysis.keywords) ? file.analysis.keywords.map((k: any) => String(k)) : undefined
      };
    }
    
    const newFile: File = {
      id,
      path: file.path,
      sessionId: file.sessionId || null,
      userId: file.userId || null,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: now,
      analysis: typedAnalysis
    };
    
    this.files.set(id, newFile);
    return newFile;
  }
  
  async getFiles(userId?: string, sessionId?: string): Promise<File[]> {
    const allFiles = Array.from(this.files.values());
    
    if (userId && sessionId) {
      return allFiles.filter(file => file.userId === userId && file.sessionId === sessionId);
    } else if (userId) {
      return allFiles.filter(file => file.userId === userId);
    } else if (sessionId) {
      return allFiles.filter(file => file.sessionId === sessionId);
    }
    
    return allFiles;
  }
  
  async getFileById(fileId: number): Promise<File | undefined> {
    return this.files.get(fileId);
  }
  
  async updateFileAnalysis(fileId: number, analysis: any): Promise<File | undefined> {
    const file = this.files.get(fileId);
    
    if (!file) {
      return undefined;
    }
    
    // Create properly typed analysis object with correct properties
    let typedAnalysis: { summary?: string; entities?: any[]; keywords?: string[] } | null = null;
    if (analysis) {
      typedAnalysis = {
        summary: typeof analysis.summary === 'string' ? analysis.summary : undefined,
        entities: Array.isArray(analysis.entities) ? analysis.entities : undefined,
        keywords: Array.isArray(analysis.keywords) ? analysis.keywords.map((k: any) => String(k)) : undefined
      };
    }
    
    const updatedFile: File = {
      ...file,
      analysis: typedAnalysis
    };
    
    this.files.set(fileId, updatedFile);
    return updatedFile;
  }
  
  async deleteFile(fileId: number): Promise<boolean> {
    return this.files.delete(fileId);
  }
  
  // Insight methods
  async createInsight(insight: InsertInsight): Promise<Insight> {
    const id = this.insightCurrentId++;
    const now = new Date();
    
    // Process nodeIds if present
    let processedNodeIds: string[] | null = null;
    if (insight.nodeIds) {
      if (Array.isArray(insight.nodeIds)) {
        processedNodeIds = insight.nodeIds.map(id => String(id));
      } else {
        processedNodeIds = [String(insight.nodeIds)];
      }
    }
    
    // Process edgeIds if present
    let processedEdgeIds: string[] | null = null;
    if (insight.edgeIds) {
      if (Array.isArray(insight.edgeIds)) {
        processedEdgeIds = insight.edgeIds.map(id => String(id));
      } else {
        processedEdgeIds = [String(insight.edgeIds)];
      }
    }
    
    const newInsight: Insight = {
      id,
      type: insight.type,
      sessionId: insight.sessionId,
      userId: insight.userId || null,
      description: insight.description,
      knowledgeGraphSnapshot: insight.knowledgeGraphSnapshot || null,
      relevance: insight.relevance,
      confidence: insight.confidence || null,
      nodeIds: processedNodeIds,
      edgeIds: processedEdgeIds,
      createdAt: now
    };
    
    this.insights.set(id, newInsight);
    return newInsight;
  }
  
  async getInsights(userId?: string, sessionId?: string): Promise<Insight[]> {
    const allInsights = Array.from(this.insights.values());
    
    if (userId && sessionId) {
      return allInsights.filter(insight => insight.userId === userId && insight.sessionId === sessionId);
    } else if (userId) {
      return allInsights.filter(insight => insight.userId === userId);
    } else if (sessionId) {
      return allInsights.filter(insight => insight.sessionId === sessionId);
    }
    
    return allInsights;
  }
  
  async getInsightById(insightId: number): Promise<Insight | undefined> {
    return this.insights.get(insightId);
  }
  
  async deleteInsight(insightId: number): Promise<boolean> {
    return this.insights.delete(insightId);
  }
  
  // Preference methods
  async savePreference(preference: InsertPreference): Promise<Preference> {
    const id = this.preferenceCurrentId++;
    const now = new Date();
    
    const newPreference: Preference = {
      ...preference,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    const userPreferences = this.preferences.get(preference.userId) || [];
    
    // Update existing preference if it exists
    const existingIndex = userPreferences.findIndex(p => p.key === preference.key);
    if (existingIndex >= 0) {
      userPreferences[existingIndex] = newPreference;
    } else {
      userPreferences.push(newPreference);
    }
    
    this.preferences.set(preference.userId, userPreferences);
    return newPreference;
  }
  
  async getPreferencesByUserId(userId: string): Promise<Preference[]> {
    return this.preferences.get(userId) || [];
  }
  
  async getPreferenceByKey(userId: string, key: string): Promise<Preference | undefined> {
    const userPreferences = this.preferences.get(userId) || [];
    return userPreferences.find(p => p.key === key);
  }
  
  // Canvas methods
  async createCanvas(canvas: InsertCanvas): Promise<Canvas> {
    const id = this.canvasCurrentId++;
    const now = new Date();
    
    const newCanvas: Canvas = {
      id,
      userId: canvas.userId || null,
      sessionId: canvas.sessionId,
      title: canvas.title,
      thumbnail: canvas.thumbnail || null,
      isPublic: canvas.isPublic || false,
      lastModified: now,
      createdAt: now
    };
    
    this.canvases.set(id, newCanvas);
    this.canvasElements.set(id, []); // Initialize empty elements array for this canvas
    return newCanvas;
  }
  
  async getCanvases(userId?: string, sessionId?: string): Promise<Canvas[]> {
    const allCanvases = Array.from(this.canvases.values());
    
    if (userId && sessionId) {
      return allCanvases.filter(canvas => canvas.userId === userId && canvas.sessionId === sessionId);
    } else if (userId) {
      return allCanvases.filter(canvas => canvas.userId === userId);
    } else if (sessionId) {
      return allCanvases.filter(canvas => canvas.sessionId === sessionId);
    }
    
    return allCanvases;
  }
  
  async getCanvasById(canvasId: number): Promise<Canvas | undefined> {
    return this.canvases.get(canvasId);
  }
  
  async updateCanvas(canvasId: number, data: Partial<InsertCanvas>): Promise<Canvas | undefined> {
    const canvas = this.canvases.get(canvasId);
    
    if (!canvas) {
      return undefined;
    }
    
    const updatedCanvas: Canvas = {
      ...canvas,
      userId: data.userId || canvas.userId,
      sessionId: data.sessionId || canvas.sessionId,
      title: data.title || canvas.title,
      thumbnail: data.thumbnail !== undefined ? data.thumbnail : canvas.thumbnail,
      isPublic: data.isPublic !== undefined ? data.isPublic : canvas.isPublic,
      lastModified: new Date(),
      createdAt: canvas.createdAt
    };
    
    this.canvases.set(canvasId, updatedCanvas);
    return updatedCanvas;
  }
  
  async deleteCanvas(canvasId: number): Promise<boolean> {
    // Also delete all associated elements
    this.canvasElements.delete(canvasId);
    return this.canvases.delete(canvasId);
  }
  
  // Canvas element methods
  async createCanvasElement(element: InsertCanvasElement): Promise<CanvasElement> {
    const id = this.canvasElementCurrentId++;
    const now = new Date();
    
    const newElement: CanvasElement = {
      id,
      canvasId: element.canvasId,
      type: element.type,
      content: element.content || null,
      x: element.x,
      y: element.y,
      width: element.width || null,
      height: element.height || null,
      zIndex: element.zIndex || 0,
      style: element.style || null,
      metadata: element.metadata || null,
      createdAt: now
    };
    
    const canvasElements = this.canvasElements.get(element.canvasId) || [];
    canvasElements.push(newElement);
    this.canvasElements.set(element.canvasId, canvasElements);
    
    // Update lastModified on the canvas
    const canvas = this.canvases.get(element.canvasId);
    if (canvas) {
      canvas.lastModified = now;
      this.canvases.set(element.canvasId, canvas);
    }
    
    return newElement;
  }
  
  async getCanvasElements(canvasId: number): Promise<CanvasElement[]> {
    return this.canvasElements.get(canvasId) || [];
  }
  
  async getCanvasElementById(elementId: number): Promise<CanvasElement | undefined> {
    // Since elements are stored by canvasId, we need to search all canvas elements
    for (const elements of this.canvasElements.values()) {
      const element = elements.find(e => e.id === elementId);
      if (element) {
        return element;
      }
    }
    return undefined;
  }
  
  async updateCanvasElement(elementId: number, data: Partial<InsertCanvasElement>): Promise<CanvasElement | undefined> {
    // Find the element across all canvases
    let targetCanvasId: number | null = null;
    let targetElement: CanvasElement | undefined;
    let targetIndex: number = -1;
    
    for (const [canvasId, elements] of this.canvasElements.entries()) {
      const index = elements.findIndex(e => e.id === elementId);
      if (index !== -1) {
        targetCanvasId = canvasId;
        targetElement = elements[index];
        targetIndex = index;
        break;
      }
    }
    
    if (!targetElement || targetCanvasId === null || targetIndex === -1) {
      return undefined;
    }
    
    const now = new Date();
    
    // Handle style updates
    let updatedStyle = targetElement.style;
    if (data.style) {
      updatedStyle = {
        ...updatedStyle,
        ...data.style
      };
    }
    
    // Handle metadata updates
    let updatedMetadata = targetElement.metadata;
    if (data.metadata) {
      updatedMetadata = {
        ...updatedMetadata,
        ...data.metadata
      };
    }
    
    const updatedElement: CanvasElement = {
      ...targetElement,
      type: data.type || targetElement.type,
      content: data.content !== undefined ? data.content : targetElement.content,
      x: data.x !== undefined ? data.x : targetElement.x,
      y: data.y !== undefined ? data.y : targetElement.y,
      width: data.width !== undefined ? data.width : targetElement.width,
      height: data.height !== undefined ? data.height : targetElement.height,
      zIndex: data.zIndex !== undefined ? data.zIndex : targetElement.zIndex,
      style: updatedStyle,
      metadata: updatedMetadata
    };
    
    // If canvasId is changing, move the element
    if (data.canvasId !== undefined && data.canvasId !== targetCanvasId) {
      // Remove from old canvas
      const oldElements = this.canvasElements.get(targetCanvasId) || [];
      const filteredOldElements = oldElements.filter(e => e.id !== elementId);
      this.canvasElements.set(targetCanvasId, filteredOldElements);
      
      // Add to new canvas
      const newElements = this.canvasElements.get(data.canvasId) || [];
      updatedElement.canvasId = data.canvasId;
      newElements.push(updatedElement);
      this.canvasElements.set(data.canvasId, newElements);
      
      // Update lastModified on both canvases
      const oldCanvas = this.canvases.get(targetCanvasId);
      if (oldCanvas) {
        oldCanvas.lastModified = now;
        this.canvases.set(targetCanvasId, oldCanvas);
      }
      
      const newCanvas = this.canvases.get(data.canvasId);
      if (newCanvas) {
        newCanvas.lastModified = now;
        this.canvases.set(data.canvasId, newCanvas);
      }
    } else {
      // Just update in place
      const elements = this.canvasElements.get(targetCanvasId) || [];
      elements[targetIndex] = updatedElement;
      this.canvasElements.set(targetCanvasId, elements);
      
      // Update lastModified on the canvas
      const canvas = this.canvases.get(targetCanvasId);
      if (canvas) {
        canvas.lastModified = now;
        this.canvases.set(targetCanvasId, canvas);
      }
    }
    
    return updatedElement;
  }
  
  async deleteCanvasElement(elementId: number): Promise<boolean> {
    // Find the element across all canvases
    let targetCanvasId: number | null = null;
    let found = false;
    
    for (const [canvasId, elements] of this.canvasElements.entries()) {
      const index = elements.findIndex(e => e.id === elementId);
      if (index !== -1) {
        targetCanvasId = canvasId;
        // Remove the element
        elements.splice(index, 1);
        this.canvasElements.set(canvasId, elements);
        found = true;
        
        // Update lastModified on the canvas
        const canvas = this.canvases.get(canvasId);
        if (canvas) {
          canvas.lastModified = new Date();
          this.canvases.set(canvasId, canvas);
        }
        
        break;
      }
    }
    
    return found;
  }
  
  async deleteCanvasElements(canvasId: number): Promise<boolean> {
    // Just clear the elements array for this canvas
    const exists = this.canvasElements.has(canvasId);
    if (exists) {
      this.canvasElements.set(canvasId, []);
      
      // Update lastModified on the canvas
      const canvas = this.canvases.get(canvasId);
      if (canvas) {
        canvas.lastModified = new Date();
        this.canvases.set(canvasId, canvas);
      }
    }
    return exists;
  }
}

export const storage = new MemStorage();
