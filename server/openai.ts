import { ChatMessage, ChatResponse } from './types';
import OpenAI from 'openai';

// System message for the OpenAI API
const systemMessage: ChatMessage = {
  role: "system",
  content: `You are a helpful mobile AI assistant. Provide concise, accurate responses that work well on mobile devices.
  
  - Focus on answering the user's question directly.
  - When relevant, provide sources for your information.
  - Keep responses brief but comprehensive.
  - Format content to be easily readable on mobile screens.
  - Use natural, conversational language.
  - Avoid unnecessarily technical terms unless directly relevant.`
};

type OpenAIRole = "system" | "user" | "assistant";

// Function to handle chat with OpenAI
export async function chat(userMessage: string, history: ChatMessage[]): Promise<ChatResponse> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Prepare messages for the API with explicit typing
    const messages: {role: OpenAIRole, content: string}[] = [
      { role: "system", content: systemMessage.content }
    ];
    
    // Add history messages with proper type checking
    for (const msg of history) {
      if (msg.role === "system" || msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // Add the current user message
    messages.push({ role: "user", content: userMessage });
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // Extract the assistant's message
    const assistantMessage = response.choices[0].message.content;
    
    if (!assistantMessage) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Extract any sources from the response if provided
    // Assume sources are mentioned in the format [source: URL]
    const sourceRegex = /\[source: (.+?)\]/g;
    let match;
    const sources = [];
    let sourceIndex = 1;
    
    // Use a loop instead of matchAll for better compatibility
    while ((match = sourceRegex.exec(assistantMessage)) !== null) {
      sources.push({
        name: `Source ${sourceIndex++}`,
        value: match[1]
      });
    }
    
    // Remove source annotations from the response text
    let cleanMessage = assistantMessage.replace(sourceRegex, '').trim();
    
    return {
      message: cleanMessage,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      message: 'I apologize, but I encountered an issue while processing your request. Please try again later.'
    };
  }
}