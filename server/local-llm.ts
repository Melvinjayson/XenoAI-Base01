/**
 * Local LLM Module — powered by Groq (Llama 3.3 70B)
 *
 * Provides fast, real local-model responses via Groq's inference API.
 * Maintains full session context, entity/topic tracking, and web-search integration.
 */

import Groq from 'groq-sdk';
import { LocalModelStatus, ChatMessage, Entity } from './types';
import { enhancedSearch } from './web-search';

// ---------------------------------------------------------------------------
// Groq client (lazy-initialised so missing key doesn't crash at import time)
// ---------------------------------------------------------------------------
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// The model we use on Groq — fast, capable, free-tier friendly
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ---------------------------------------------------------------------------
// Model status
// ---------------------------------------------------------------------------
let modelStatus: LocalModelStatus = {
  loaded: false,
  model: null,
  memory: null,
  quantization: null,
  contextLength: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Session context store
// ---------------------------------------------------------------------------
interface LocalContext {
  entities: Entity[];
  topics: string[];
  recentInteractions: { message: string; response: string; timestamp: number }[];
  userPreferences: Record<string, string>;
  sessionData: Map<string, any>;
  webSearchResults?: {
    query: string;
    results: { title: string; link: string; snippet: string; content?: string }[];
    timestamp: number;
  };
}

const localContextStore = new Map<string, LocalContext>();

// Web search config
const WEB_SEARCH_CONFIG = {
  maxCacheAge: 5 * 60 * 1000,
  searchConfidenceThreshold: 0.7,
  currentInfoTerms: ['latest', 'recent', 'current', 'today', 'news', 'update', 'newest', 'trend'],
  onlineInfoTerms: ['website', 'online', 'internet', 'search', 'web', 'find', 'link', 'url'],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function initializeLocalLLM(): Promise<boolean> {
  console.log('Initializing local language model...');
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    // Verify connectivity with a minimal request
    const client = getGroqClient();
    await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5,
    });

    modelStatus = {
      loaded: true,
      model: GROQ_MODEL,
      memory: 0,       // cloud inference — no local RAM usage
      quantization: 'BF16',
      contextLength: 128000,
      error: null,
    };

    console.log(`Groq LLM (${GROQ_MODEL}) initialized successfully.`);
    return true;
  } catch (err: any) {
    modelStatus = { ...modelStatus, loaded: false, error: err.message };
    console.error('Failed to initialize Groq LLM:', err.message);
    return false;
  }
}

export function isLocalLLMAvailable(): boolean {
  return modelStatus.loaded;
}

export function getLocalLLMStatus(): LocalModelStatus {
  return { ...modelStatus };
}

export async function processWithLocalLLM(
  message: string,
  history: ChatMessage[] = [],
  systemPrompt = 'You are a helpful assistant.',
  sessionId = 'default-session',
  entities: Entity[] = [],
  topics: string[] = [],
): Promise<string> {
  if (!modelStatus.loaded) {
    throw new Error('Local language model is not loaded. Please initialize it first.');
  }

  // ------ Session context ------
  let ctx = localContextStore.get(sessionId);
  if (!ctx) {
    ctx = {
      entities: [],
      topics: [],
      recentInteractions: [],
      userPreferences: {},
      sessionData: new Map(),
    };
    localContextStore.set(sessionId, ctx);
  }

  // Merge entities & topics
  for (const e of entities) {
    if (!ctx.entities.some(x => x.value.toLowerCase() === e.value.toLowerCase())) {
      ctx.entities.push(e);
    }
  }
  for (const t of topics) {
    if (!ctx.topics.includes(t)) ctx.topics.push(t);
  }
  if (ctx.entities.length > 20) ctx.entities = ctx.entities.slice(-20);
  if (ctx.topics.length > 10) ctx.topics = ctx.topics.slice(-10);

  // ------ Web search if needed ------
  const { shouldSearch, searchQuery } = await shouldUseWebSearch(message, ctx);
  if (shouldSearch) {
    try {
      const searchResult = await enhancedSearch(searchQuery);
      ctx.webSearchResults = {
        query: searchQuery,
        results: searchResult.results.map(r => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          content: r.content || '',
        })),
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error('Web search error (non-fatal):', err);
    }
  }

  // ------ Build system prompt with context ------
  const enrichedSystem = buildSystemPrompt(systemPrompt, ctx);

  // ------ Build message array for Groq ------
  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: enrichedSystem },
  ];

  // Add history (last 20 turns to stay within context)
  const trimmedHistory = history.slice(-20);
  for (const h of trimmedHistory) {
    if (h.role === 'user' || h.role === 'assistant') {
      groqMessages.push({ role: h.role, content: h.content });
    }
  }
  groqMessages.push({ role: 'user', content: message });

  // ------ Call Groq ------
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: groqMessages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  const response = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

  // ------ Store interaction ------
  ctx.recentInteractions.push({ message, response, timestamp: Date.now() });
  if (ctx.recentInteractions.length > 15) {
    ctx.recentInteractions = ctx.recentInteractions.slice(-15);
  }

  // Extract topics from message
  const newTopics = extractTopicsFromMessage(message);
  for (const t of newTopics) {
    if (!ctx.topics.includes(t)) ctx.topics.push(t);
  }
  if (ctx.topics.length > 15) ctx.topics = ctx.topics.slice(-15);

  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(base: string, ctx: LocalContext): string {
  let prompt = base;

  if (ctx.entities.length > 0) {
    prompt += `\n\nKnown entities from this conversation: ${ctx.entities.map(e => `${e.value} (${e.type})`).join(', ')}.`;
  }
  if (ctx.topics.length > 0) {
    prompt += `\n\nConversation topics so far: ${ctx.topics.join(', ')}.`;
  }
  if (Object.keys(ctx.userPreferences).length > 0) {
    const prefs = Object.entries(ctx.userPreferences)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    prompt += `\n\nUser preferences detected: ${prefs}.`;
  }
  if (ctx.webSearchResults) {
    const ageMin = Math.floor((Date.now() - ctx.webSearchResults.timestamp) / 60000);
    prompt += `\n\nWeb search results for "${ctx.webSearchResults.query}" (${ageMin} min ago):`;
    for (const [i, r] of ctx.webSearchResults.results.entries()) {
      prompt += `\n\n[${i + 1}] ${r.title}\n${r.link}\n${r.content || r.snippet}`;
    }
    prompt += '\n\nCite sources where relevant.';
  }

  return prompt;
}

async function shouldUseWebSearch(
  query: string,
  ctx: LocalContext,
): Promise<{ shouldSearch: boolean; searchQuery: string; confidence: number }> {
  const q = query.toLowerCase().trim();

  const basicConvo = ['how are you', 'what is your name', 'who are you', 'hello', 'hi', 'thanks', 'thank you'];
  if (basicConvo.some(p => q.includes(p) && q.split(' ').length < 7)) {
    return { shouldSearch: false, searchQuery: query, confidence: 0 };
  }

  // Explicit search intent
  const explicitPrefixes = ['search for', 'find information about', 'look up', 'search the web for'];
  for (const prefix of explicitPrefixes) {
    if (q.startsWith(prefix) || q.includes(prefix)) {
      const searchQuery = query.substring(query.toLowerCase().indexOf(prefix) + prefix.length).trim().replace(/[?.!,;]$/, '');
      return { shouldSearch: true, searchQuery, confidence: 0.95 };
    }
  }

  let confidence = 0;
  if (WEB_SEARCH_CONFIG.currentInfoTerms.some(t => q.includes(t))) confidence += 0.4;
  if (WEB_SEARCH_CONFIG.onlineInfoTerms.some(t => q.includes(t))) confidence += 0.3;
  if (/^(what|how|why|when|who|where|is|are|can|could|would|should|will|has|have|do|does|did|was|were)[^a-z]/.test(q)) confidence += 0.2;

  // Check cache freshness
  if (
    confidence >= WEB_SEARCH_CONFIG.searchConfidenceThreshold &&
    ctx.webSearchResults &&
    ctx.webSearchResults.query.toLowerCase() === query.toLowerCase() &&
    Date.now() - ctx.webSearchResults.timestamp < WEB_SEARCH_CONFIG.maxCacheAge
  ) {
    return { shouldSearch: false, searchQuery: query, confidence };
  }

  return {
    shouldSearch: confidence >= WEB_SEARCH_CONFIG.searchConfidenceThreshold,
    searchQuery: query,
    confidence,
  };
}

function extractTopicsFromMessage(message: string): string[] {
  const stopWords = new Set([
    'a','about','above','after','all','am','an','and','any','are','as','at',
    'be','because','been','before','being','between','but','by','can','did',
    'do','does','doing','down','each','for','from','had','has','have','having',
    'he','her','here','him','his','how','i','if','in','into','is','it','its',
    'just','me','more','most','my','no','nor','not','now','of','off','on',
    'or','other','our','out','own','same','she','should','so','some','such',
    'than','that','the','their','them','then','there','these','they','this',
    'those','through','to','too','under','until','up','very','was','we',
    'were','what','when','where','which','while','who','will','with','would',
    'you','your',
  ]);

  return message
    .toLowerCase()
    .replace(/[,.?!;:()"']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5);
}
