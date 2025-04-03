import { 
  ChatOpenAI, 
  OpenAIEmbeddings
} from "@langchain/openai";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SearchResult, SearchSource, AssetData } from "./types";
import axios from "axios";
import * as cheerio from "cheerio";

// Initialize our OpenAI model
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  temperature: 0.5,
});

// Define the search function using axios for web requests
async function webSearch(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    // Use DuckDuckGo as our search engine through a simple HTML scraping approach
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Parse the HTML
    const $ = cheerio.load(response.data);
    const results: { title: string; link: string; snippet: string }[] = [];

    // Extract search results
    $('.result').each((i, element) => {
      if (i < 5) { // Limit to top 5 results
        const titleElement = $(element).find('.result__title a');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href') || '';
        const snippet = $(element).find('.result__snippet').text().trim();
        
        // Clean the URL if it's a redirect URL from DuckDuckGo
        let cleanLink = link;
        if (link.includes('/d.js?')) {
          const urlMatch = link.match(/uddg=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            cleanLink = decodeURIComponent(urlMatch[1]);
          }
        }

        results.push({
          title,
          link: cleanLink,
          snippet
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error in web search:', error);
    return [];
  }
}

// Fetch HTML content from a URL
async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000 // 5 second timeout
    });

    // Parse HTML and extract main content
    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, and hidden elements
    $('script, style, meta, link, [hidden], .hidden, header, footer, nav, aside').remove();
    
    // Extract text content from main content areas
    let content = '';
    $('main, article, .content, .main, #content, #main').each((_, element) => {
      content += $(element).text().trim() + '\n';
    });

    // If no content found in main areas, extract from body
    if (!content) {
      content = $('body').text();
    }

    // Clean up the content
    return content
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit to 8000 chars
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return '';
  }
}

// Extract publish date from HTML or URL
function extractPublishDate(html: string, url: string): string | null {
  try {
    const $ = cheerio.load(html);
    
    // Try to find date in meta tags
    const metaDate = $('meta[property="article:published_time"], meta[name="publication-date"], meta[name="date"]').attr('content');
    if (metaDate) return metaDate;
    
    // Try to find date in common date elements
    const dateElements = $('.date, .published, .post-date, time[datetime]');
    if (dateElements.length > 0) {
      const dateText = dateElements.first().attr('datetime') || dateElements.first().text();
      return dateText.trim();
    }
    
    // Try to extract date from URL
    const dateRegex = /\/(20\d{2})[\/\-_](0[1-9]|1[0-2])[\/\-_](0[1-9]|[12][0-9]|3[01])\//;
    const match = url.match(dateRegex);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting publish date:', error);
    return null;
  }
}

// Extract thumbnail image from HTML
function extractThumbnail(html: string, url: string): string | null {
  try {
    const $ = cheerio.load(html);
    
    // Try to find image in meta tags
    const metaImage = $('meta[property="og:image"], meta[name="twitter:image"]').attr('content');
    if (metaImage) {
      // Convert relative URLs to absolute
      return metaImage.startsWith('http') ? metaImage : new URL(metaImage, url).toString();
    }
    
    // Try to find the first significant image (filtered by size)
    const images = $('img[src]').map((_, img) => {
      const src = $(img).attr('src') || '';
      const width = parseInt($(img).attr('width') || '0', 10);
      const height = parseInt($(img).attr('height') || '0', 10);
      
      // Filter out small icons and spacer images
      if ((width > 100 && height > 100) || (!width && !height)) {
        return src.startsWith('http') ? src : new URL(src, url).toString();
      }
      return null;
    }).get().filter(Boolean);
    
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('Error extracting thumbnail:', error);
    return null;
  }
}

// Define the structure for our search assistant response
const searchResponseSchema = StructuredOutputParser.fromZodSchema(
  z.object({
    content: z.string().describe("The main answer to the user's query, formatted with markdown. Should be comprehensive but concise."),
    sources: z.array(
      z.object({
        name: z.string(),
        url: z.string(),
        snippet: z.string().optional()
      })
    ).describe("List of sources used to answer the query"),
    relatedQueries: z.array(z.string()).describe("List of 3-5 related follow-up questions the user might ask"),
    assets: z.array(
      z.object({
        type: z.enum(["image", "chart", "table", "code"]),
        title: z.string().optional(),
        content: z.any()
      })
    ).describe("Any visual assets to include with the response").optional()
  })
);

// Create a search prompt template
const searchPrompt = PromptTemplate.fromTemplate(`
You are a helpful AI research assistant. Your task is to provide accurate information in response to the user's query.

USER QUERY: {query}

SEARCH RESULTS:
{searchResults}

WEB CONTENT:
{webContent}

Please analyze the search results and web content to provide a comprehensive and accurate response. 
Format your answer using markdown for better readability.
Include relevant sources with proper citations.
Suggest 3-5 related follow-up questions the user might be interested in.

{format_instructions}
`);

// Export the enhanced search function
export async function enhancedSearch(query: string): Promise<SearchResult> {
  try {
    console.log('Starting enhanced search for query:', query);
    
    // Step 1: Perform web search
    const searchResults = await webSearch(query);
    console.log(`Found ${searchResults.length} search results`);
    
    if (searchResults.length === 0) {
      throw new Error('No search results found');
    }
    
    // Step 2: Fetch content from top 2-3 sources
    const contentPromises = searchResults.slice(0, 3).map(async (result) => {
      const content = await fetchWebContent(result.link);
      const publishDate = extractPublishDate(content, result.link);
      const thumbnail = extractThumbnail(content, result.link);
      
      return {
        ...result,
        fullContent: content,
        publishDate,
        thumbnail
      };
    });
    
    const contentResults = await Promise.all(contentPromises);
    
    // Step 3: Format search results for the prompt
    const formattedSearchResults = searchResults.map((result, index) => 
      `[${index + 1}] "${result.title}"\n${result.link}\n${result.snippet}\n`
    ).join('\n');
    
    // Step 4: Format web content for the prompt
    const formattedWebContent = contentResults.map((result, index) => 
      `[${index + 1}] CONTENT FROM: ${result.title} (${result.link})\n${result.fullContent.substring(0, 2000)}\n`
    ).join('\n');
    
    // Step 5: Use LangChain to generate a response
    const chain = RunnableSequence.from([
      {
        query: (input: { query: string }) => input.query,
        searchResults: (input: { query: string }) => formattedSearchResults,
        webContent: (input: { query: string }) => formattedWebContent,
        format_instructions: () => searchResponseSchema.getFormatInstructions()
      },
      searchPrompt,
      model,
      new StringOutputParser(),
      searchResponseSchema
    ]);
    
    const response = await chain.invoke({
      query: query
    });
    
    // Step 6: Create the formatted result
    const sources: SearchSource[] = contentResults.map((result, index) => ({
      name: result.title,
      url: result.link,
      value: result.link, // Add value property to match expected type
      snippet: result.snippet,
      thumbnail: result.thumbnail,
      publishDate: result.publishDate
    }));
    
    return {
      content: response.content,
      sources: sources,
      relatedQueries: response.relatedQueries,
      assets: response.assets as AssetData[]
    };
    
  } catch (error) {
    console.error('Error in enhanced search:', error);
    
    // Fallback to a simpler response
    return {
      content: `I couldn't find specific information about "${query}". This could be due to network issues or the specific query. Could you try rephrasing your question?`,
      sources: []
    };
  }
}

// Create a memory-based conversation chain
const conversationPrompt = PromptTemplate.fromTemplate(`
You are a helpful, friendly AI assistant designed for mobile interfaces. 
Your responses should be concise but complete, formatted with markdown for readability on small screens.

CONVERSATION HISTORY:
{chatHistory}

USER QUERY: {query}

Please respond to the user's most recent query, taking into account the conversation history if relevant.
If the query seems to be a follow-up question, be sure to maintain context from previous exchanges.
Format your response using markdown for better readability on mobile.

{format_instructions}
`);

// Export the conversation function to handle chat with history 
export async function conversationalResponse(
  query: string, 
  chatHistory: string[]
): Promise<{ message: string; relatedQueries?: string[] }> {
  try {
    // Format the chat history
    const formattedHistory = chatHistory.join('\n');
    
    // Set up the output parser for a simpler response
    const outputParser = StructuredOutputParser.fromZodSchema(
      z.object({
        message: z.string().describe("The response to the user's query, formatted in markdown"),
        relatedQueries: z.array(z.string()).describe("3-5 potential follow-up questions the user might ask next").optional()
      })
    );
    
    // Create and run the chain
    const chain = RunnableSequence.from([
      {
        query: (input: { query: string; chatHistory: string[] }) => input.query,
        chatHistory: (input: { query: string; chatHistory: string[] }) => formattedHistory,
        format_instructions: () => outputParser.getFormatInstructions()
      },
      conversationPrompt,
      model,
      new StringOutputParser(),
      outputParser
    ]);
    
    const response = await chain.invoke({
      query,
      chatHistory
    });
    
    return {
      message: response.message,
      relatedQueries: response.relatedQueries
    };
  } catch (error) {
    console.error('Error in conversational response:', error);
    return {
      message: "I'm having trouble processing your request right now. Could you try again?"
    };
  }
}