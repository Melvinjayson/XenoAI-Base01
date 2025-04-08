/**
 * Decision Framework
 * 
 * This module provides the server-side functionality for the AI-powered decision
 * framework, helping users work through complex choices with guided analysis.
 */

import { Request, Response } from 'express';
import { processWithEnhancedContext } from './context-integration';

interface DecisionAnalysisRequest {
  title: string;
  description: string;
  options: {
    title: string;
    description: string;
    pros: Array<{
      content: string;
      weight: number;
      category: string;
    }>;
    cons: Array<{
      content: string;
      weight: number;
      category: string;
    }>;
  }[];
  reflections?: Array<{
    prompt: string;
    response: string;
  }>;
  stakeholders?: string[];
  context?: string;
}

interface ProConAnalysis {
  content: string;
  weight: number;
  category: string;
  analysis: string;
}

interface OptionAnalysis {
  title: string;
  score: number;
  isRecommended: boolean;
  summary: string;
  prosAnalysis: ProConAnalysis[];
  consAnalysis: ProConAnalysis[];
  tradeoffs: string[];
}

interface InsightAnalysis {
  type: string;
  content: string;
}

interface DecisionAnalysisResponse {
  summary: string;
  optionAnalyses: OptionAnalysis[];
  insights: InsightAnalysis[];
  reflectionPrompts: string[];
  nextSteps: string[];
}

/**
 * Analyze a decision framework with its options and provide AI-powered insights
 */
export async function analyzeDecision(req: Request, res: Response) {
  try {
    const decision: DecisionAnalysisRequest = req.body;
    
    if (!decision.title || !decision.description || !decision.options || !Array.isArray(decision.options)) {
      return res.status(400).json({
        error: 'Decision title, description, and options array are required'
      });
    }
    
    // Format the decision for analysis
    const formattedDecision = formatDecisionForProcessing(decision);
    
    // Create the prompt for the AI model
    const analysisPrompt = `
      You are an AI decision analyst helping a user work through a complex choice.
      
      Analyze the following decision framework in detail:
      
      ${formattedDecision}
      
      Provide a comprehensive analysis including:
      
      1. A general summary of the decision situation (1-2 paragraphs)
      2. An analysis of each option with:
         - A computed score out of 10 based on the weights of pros and cons
         - Whether it is recommended or not
         - A summary of its strengths and weaknesses
         - An analysis of each pro and con with commentary on its significance
         - Key tradeoffs to consider
      3. Overall insights for the decision
      4. Suggested reflection prompts that would help the user gain more clarity
      5. Recommended next steps
      
      Format your response as a JSON object with the following structure:
      {
        "summary": "Overall situation summary...",
        "optionAnalyses": [
          {
            "title": "Option title",
            "score": 7.5,
            "isRecommended": true,
            "summary": "Option summary...",
            "prosAnalysis": [
              {
                "content": "Original pro content",
                "weight": 8,
                "category": "financial",
                "analysis": "Analysis of this pro..."
              }
            ],
            "consAnalysis": [
              {
                "content": "Original con content",
                "weight": 6,
                "category": "emotional",
                "analysis": "Analysis of this con..."
              }
            ],
            "tradeoffs": [
              "Tradeoff 1...",
              "Tradeoff 2..."
            ]
          }
        ],
        "insights": [
          {
            "type": "pattern",
            "content": "Insight about pattern..."
          },
          {
            "type": "blind_spot",
            "content": "Insight about blind spot..."
          }
        ],
        "reflectionPrompts": [
          "Reflection prompt 1...",
          "Reflection prompt 2..."
        ],
        "nextSteps": [
          "Next step 1...",
          "Next step 2..."
        ]
      }
      
      Ensure all fields are properly filled out and the analysis is thorough and insightful.
    `;
    
    // Process with the model
    const modelResponse = await processWithEnhancedContext(analysisPrompt, [], 'decision-framework-analysis', {
      systemPrompt: "You are an expert decision analyst who helps users work through complex choices. Provide detailed, balanced, and insightful analysis of decision frameworks with practical recommendations.",
      temperature: 0.7,
      forceAdvanced: true
    });
    
    // Extract the response text
    const responseText = typeof modelResponse.message === 'string' ? 
      modelResponse.message : 
      (modelResponse as any)?.response?.content || '';
    
    console.log('Raw AI response:', responseText);
    
    try {
      // First try direct JSON parsing
      return res.status(200).json(JSON.parse(responseText));
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', responseText);
        throw new Error('Failed to parse AI response');
      }
      
      const analysisData: DecisionAnalysisResponse = JSON.parse(jsonMatch[0]);
      
      // Return the analysis
      return res.status(200).json(analysisData);
    }
  } catch (error: unknown) {
    console.error('Error analyzing decision:', error);
    return res.status(500).json({
      error: 'Failed to analyze decision',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate guided reflection prompts for a decision
 */
export async function generateReflectionPrompts(req: Request, res: Response) {
  try {
    const { decisionTitle, decisionDescription, category, existingPrompts = [] } = req.body;
    
    if (!decisionTitle || !decisionDescription) {
      return res.status(400).json({
        error: 'Decision title and description are required'
      });
    }
    
    // Create the prompt for the AI model
    const reflectionPrompt = `
      You are a decision coach helping a user work through a complex choice.
      
      Decision: ${decisionTitle}
      Description: ${decisionDescription}
      Category: ${category || 'General'}
      
      ${existingPrompts.length > 0 ? `Existing reflection prompts:\n${existingPrompts.join('\n')}` : ''}
      
      Generate 5 thoughtful reflection prompts that will help the user gain new insights about this decision.
      The prompts should be open-ended, thought-provoking, and relevant to the specific decision context.
      
      Format your response as a JSON array of strings containing only the prompts:
      ["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4", "Prompt 5"]
    `;
    
    // Process with the model
    const modelResponse = await processWithEnhancedContext(reflectionPrompt, [], 'decision-framework-reflection', {
      systemPrompt: "You are a decision coach helping users reflect on complex choices. Generate thoughtful, relevant reflection prompts tailored to specific decisions.",
      temperature: 0.8,
      forceAdvanced: false
    });
    
    // Extract the response text
    const responseText = typeof modelResponse.message === 'string' ? 
      modelResponse.message : 
      (modelResponse as any)?.response?.content || '';
    
    console.log('Raw Reflection Response:', responseText);
    console.log('Model Response Object:', JSON.stringify(modelResponse, null, 2));
    
    try {
      // First try direct JSON parsing
      const reflectionPrompts = JSON.parse(responseText);
      return res.status(200).json({ reflectionPrompts });
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON array
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', responseText);
        throw new Error('Failed to parse AI response');
      }
      
      const reflectionPrompts = JSON.parse(jsonMatch[0]);
      
      // Return the reflection prompts
      return res.status(200).json({ reflectionPrompts });
    }
  } catch (error: unknown) {
    console.error('Error generating reflection prompts:', error);
    return res.status(500).json({
      error: 'Failed to generate reflection prompts',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate insights for a decision based on the current state
 */
export async function generateInsights(req: Request, res: Response) {
  try {
    const { decision, options, reflections } = req.body;
    
    if (!decision || !options) {
      return res.status(400).json({
        error: 'Decision and options data are required'
      });
    }
    
    // Format the data for the AI model
    const formattedData = `
      Decision: ${decision.title}
      Description: ${decision.description}
      
      Options:
      ${options.map((option: any, index: number) => `
        Option ${index + 1}: ${option.title}
        Description: ${option.description}
        
        Pros:
        ${option.pros.map((pro: any) => `- ${pro.content} (Weight: ${pro.weight}/10, Category: ${pro.category})`).join('\n')}
        
        Cons:
        ${option.cons.map((con: any) => `- ${con.content} (Weight: ${con.weight}/10, Category: ${con.category})`).join('\n')}
      `).join('\n')}
      
      ${reflections && reflections.length > 0 ? `
        Reflections:
        ${reflections.map((r: any) => `
          Q: ${r.prompt}
          A: ${r.response}
        `).join('\n')}
      ` : ''}
    `;
    
    // Create the prompt for the AI model
    const insightPrompt = `
      You are an AI decision insights analyst helping a user work through a complex choice.
      
      Analyze the following decision framework and generate 5 insightful observations:
      
      ${formattedData}
      
      Provide 5 unique insights that might help the user make a better decision. Each insight should be of one of these types:
      - pattern (Pattern recognition)
      - perspective (Alternative perspective)
      - blind_spot (Something being overlooked)
      - synthesis (Synthesis of various factors)
      - suggestion (Suggested action or approach)
      - risk (Potential risk identification)
      - opportunity (Potential opportunity identification)
      - clarification (Clarification of an ambiguous point)
      
      Format your response as a JSON array containing objects with type and content fields:
      [
        {"type": "pattern", "content": "Insight about pattern..."},
        {"type": "blind_spot", "content": "Insight about blind spot..."}
      ]
      
      Ensure your insights are specific, actionable, and directly relevant to this particular decision.
    `;
    
    // Process with the model
    const modelResponse = await processWithEnhancedContext(insightPrompt, [], 'decision-framework-insights', {
      systemPrompt: "You are an expert at identifying patterns, blind spots, and opportunities in decision-making scenarios. Provide concise, relevant insights that help users make better decisions.",
      temperature: 0.7,
      forceAdvanced: true
    });
    
    // Extract the response text
    const responseText = typeof modelResponse.message === 'string' ? 
      modelResponse.message : 
      (modelResponse as any)?.response?.content || '';
    
    console.log('Raw Insights Response:', responseText);
    
    try {
      // First try direct JSON parsing
      const insights = JSON.parse(responseText);
      return res.status(200).json({ insights });
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON array
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', responseText);
        throw new Error('Failed to parse AI response');
      }
      
      const insights = JSON.parse(jsonMatch[0]);
      
      // Return the insights
      return res.status(200).json({ insights });
    }
  } catch (error: unknown) {
    console.error('Error generating insights:', error);
    return res.status(500).json({
      error: 'Failed to generate insights',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Format a decision request object into a string for processing
 */
function formatDecisionForProcessing(decision: DecisionAnalysisRequest): string {
  let formattedDecision = `
    Decision: ${decision.title}
    Description: ${decision.description}
    ${decision.stakeholders && decision.stakeholders.length > 0 ? 
      `Stakeholders: ${decision.stakeholders.join(', ')}` : ''}
    ${decision.context ? `Additional Context: ${decision.context}` : ''}
    
    Options:
  `;
  
  decision.options.forEach((option: any, index: number) => {
    formattedDecision += `
      Option ${index + 1}: ${option.title}
      Description: ${option.description}
      
      Pros:
      ${option.pros.map((pro: any) => `- ${pro.content} (Weight: ${pro.weight}/10, Category: ${pro.category})`).join('\n')}
      
      Cons:
      ${option.cons.map((con: any) => `- ${con.content} (Weight: ${con.weight}/10, Category: ${con.category})`).join('\n')}
    `;
  });
  
  if (decision.reflections && decision.reflections.length > 0) {
    formattedDecision += `
      User Reflections:
      ${decision.reflections.map((r: any) => `
        Q: ${r.prompt}
        A: ${r.response}
      `).join('\n')}
    `;
  }
  
  return formattedDecision;
}