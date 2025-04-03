import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-your-api-key', 
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  sources?: {
    name: string;
    value: string;
  }[];
}

// Add a system message to guide the AI's behavior
const systemMessage: ChatMessage = {
  role: "system",
  content: `You are a helpful AI assistant with search capabilities. 
  Respond in a conversational but concise manner.
  When providing information that comes from a specific source, include that source.
  Remember the context of the conversation to answer follow-up questions appropriately.
  Current date: ${new Date().toISOString().split('T')[0]}
  Current time: ${new Date().toLocaleTimeString()}`
};

export async function chat(userMessage: string, history: ChatMessage[]): Promise<ChatResponse> {
  try {
    // Create the messages array with the system message and conversation history
    const messages: ChatMessage[] = [
      systemMessage,
      ...history,
      { role: "user", content: userMessage }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract the response text
    const responseText = response.choices[0].message.content || "I'm not sure how to respond to that.";
    
    // Parse sources if any (assuming the model might include them in a structured format)
    const sources: { name: string; value: string }[] = [];
    
    // For demonstration, add a mock weather source if the message is about weather
    if (userMessage.toLowerCase().includes("weather")) {
      sources.push({ 
        name: "Weather data source", 
        value: "Weather.gov" 
      });
    }

    return {
      message: responseText,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get response from AI service");
  }
}
