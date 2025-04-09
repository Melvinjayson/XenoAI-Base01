/**
 * Ethical Guardian Module
 * 
 * This module provides ethical oversight for AI operations by:
 * - Evaluating actions and content against ethical principles
 * - Ensuring transparency in AI decision-making
 * - Providing ethical justifications for decisions
 * - Managing content filtering and guidelines enforcement
 */

import { generateStructuredCompletion } from './ai-service';

/**
 * Ethical principles that guide the system
 */
export enum EthicalPrinciple {
  BENEFICENCE = 'beneficence',
  NONMALEFICENCE = 'nonmaleficence',
  AUTONOMY = 'autonomy',
  JUSTICE = 'justice',
  EXPLICABILITY = 'explicability',
  PRIVACY = 'privacy',
  SECURITY = 'security',
  INCLUSIVITY = 'inclusivity'
}

/**
 * Result of an ethical evaluation
 */
export interface EthicalEvaluation {
  approved: boolean;
  score: number;
  principles: {
    [key in EthicalPrinciple]?: {
      score: number;
      justification: string;
    }
  };
  explanation: string;
  concerns: string[];
  recommendations: string[];
}

/**
 * Interface for transparent AI decision-making
 */
export interface DecisionExplanation {
  decision: string;
  reasoning: string[];
  alternatives: string[];
  limitations: string[];
  confidence: number;
  dataConsiderations: string[];
}

/**
 * Evaluate content against ethical principles
 */
export async function evaluateContent(
  content: string,
  context: string = '',
  principles: EthicalPrinciple[] = Object.values(EthicalPrinciple)
): Promise<EthicalEvaluation> {
  try {
    const prompt = `
      Evaluate the following content against ethical principles: ${principles.join(', ')}.
      
      Content: "${content}"
      ${context ? `Context: ${context}` : ''}
      
      Provide an in-depth ethical analysis.
    `;

    const systemPrompt = `
      You are an ethical AI guardian responsible for evaluating content against key ethical principles.
      Analyze the content thoroughly and provide a structured ethical evaluation.
      Your evaluation should include:
      - An overall approval decision (true/false)
      - A numerical score from 0-100 representing ethical acceptability
      - Individual scores and justifications for each applicable principle
      - A clear explanation of your evaluation
      - Specific ethical concerns if any
      - Recommendations for addressing ethical issues
      
      Be balanced, nuanced, and fair in your assessment.
    `;

    interface EvaluationResponse {
      approved: boolean;
      score: number;
      principles: {
        [key: string]: {
          score: number;
          justification: string;
        }
      };
      explanation: string;
      concerns: string[];
      recommendations: string[];
    }

    const evaluation = await generateStructuredCompletion<EvaluationResponse>(
      prompt,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );

    return evaluation as EthicalEvaluation;
  } catch (error) {
    console.error('Error evaluating content:', error);
    
    // Return a fallback evaluation when AI evaluation fails
    return {
      approved: false,
      score: 0,
      principles: {},
      explanation: 'Failed to perform ethical evaluation due to a system error.',
      concerns: ['System was unable to properly evaluate ethical implications'],
      recommendations: ['Manual review is recommended', 'Retry evaluation']
    };
  }
}

/**
 * Provide an explanation for an AI decision to ensure transparency
 */
export async function explainDecision(
  decision: string,
  context: string = '',
  factors: string[] = []
): Promise<DecisionExplanation> {
  try {
    const prompt = `
      Explain the following AI decision in a transparent manner:
      
      Decision: "${decision}"
      ${context ? `Context: ${context}` : ''}
      ${factors.length > 0 ? `Relevant factors: ${factors.join(', ')}` : ''}
      
      Provide a comprehensive explanation of how this decision was reached.
    `;
    
    const systemPrompt = `
      You are a transparency expert responsible for explaining AI decisions.
      Create an explanation that helps users understand the decision process.
      Your explanation should include:
      - The decision itself
      - Step-by-step reasoning behind the decision
      - Alternative options that were considered
      - Limitations and uncertainties in the decision-making process
      - A confidence assessment (0-100)
      - Data considerations that influenced the decision
      
      Be clear, thorough, and focus on explainability.
    `;

    interface ExplanationResponse {
      decision: string;
      reasoning: string[];
      alternatives: string[];
      limitations: string[];
      confidence: number;
      dataConsiderations: string[];
    }

    const explanation = await generateStructuredCompletion<ExplanationResponse>(
      prompt,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );

    return explanation;
  } catch (error) {
    console.error('Error explaining decision:', error);
    
    // Return a fallback explanation when AI explanation fails
    return {
      decision: decision,
      reasoning: ['Unable to provide detailed reasoning due to a system error'],
      alternatives: ['Alternatives could not be determined'],
      limitations: ['System was unable to properly analyze limitations'],
      confidence: 0,
      dataConsiderations: ['Data considerations could not be evaluated']
    };
  }
}

/**
 * Check if a proposed action complies with ethical guidelines
 */
export async function checkActionCompliance(
  action: string,
  guidelines: string[] = []
): Promise<{
  compliant: boolean;
  explanation: string;
  suggestedAlternatives?: string[];
}> {
  try {
    const defaultGuidelines = [
      'Do not generate harmful, illegal, unethical or deceptive content',
      'Respect user privacy and confidentiality',
      'Provide balanced and fair responses',
      'Acknowledge limitations and uncertainties',
      'Be transparent about being an AI system',
      'Do not impersonate specific individuals',
      'Do not generate content that could be used to exploit or harm vulnerable populations'
    ];
    
    const allGuidelines = [...defaultGuidelines, ...guidelines];
    
    const prompt = `
      Evaluate if the following action complies with the provided guidelines:
      
      Action: "${action}"
      
      Guidelines:
      ${allGuidelines.map(g => `- ${g}`).join('\n')}
      
      Determine if this action is compliant and explain why.
    `;
    
    const systemPrompt = `
      You are an AI ethics compliance system.
      Evaluate the proposed action against the provided guidelines.
      Your assessment should include:
      - A binary compliance decision (true/false)
      - A detailed explanation of your evaluation
      - If non-compliant, provide suggested alternatives that would comply
      
      Be rigorous, fair, and thorough in your assessment.
    `;

    interface ComplianceResponse {
      compliant: boolean;
      explanation: string;
      suggestedAlternatives?: string[];
    }

    const compliance = await generateStructuredCompletion<ComplianceResponse>(
      prompt,
      'gpt-4o',
      0.7,
      1500,
      systemPrompt
    );

    return compliance;
  } catch (error) {
    console.error('Error checking action compliance:', error);
    
    // Return a conservative fallback when compliance check fails
    return {
      compliant: false,
      explanation: 'Unable to verify compliance due to a system error. Taking a cautious approach.',
      suggestedAlternatives: ['Consider a simpler action', 'Try again with more specific details']
    };
  }
}

/**
 * Generate an ethical reflection for a particular situation or decision
 */
export async function generateEthicalReflection(
  situation: string,
  stakeholders: string[] = []
): Promise<{
  reflection: string;
  considerations: string[];
  tradeoffs: { option: string; pros: string[]; cons: string[] }[];
}> {
  try {
    const prompt = `
      Generate an ethical reflection for the following situation:
      
      Situation: "${situation}"
      ${stakeholders.length > 0 ? `Stakeholders: ${stakeholders.join(', ')}` : ''}
      
      Provide a thoughtful ethical reflection addressing multiple perspectives.
    `;
    
    const systemPrompt = `
      You are an AI ethics specialist focused on ethical reflection.
      Create a balanced ethical reflection that considers multiple dimensions.
      Your reflection should include:
      - A nuanced analysis of the ethical aspects of the situation
      - Key ethical considerations for different stakeholders
      - Analysis of potential ethical tradeoffs
      
      Be thoughtful, balanced, and consider diverse perspectives.
    `;

    interface ReflectionResponse {
      reflection: string;
      considerations: string[];
      tradeoffs: { option: string; pros: string[]; cons: string[] }[];
    }

    const reflection = await generateStructuredCompletion<ReflectionResponse>(
      prompt,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );

    return reflection;
  } catch (error) {
    console.error('Error generating ethical reflection:', error);
    
    // Return a fallback reflection when AI reflection fails
    return {
      reflection: 'Unable to generate a complete ethical reflection due to a system error.',
      considerations: ['System limitations prevented detailed analysis'],
      tradeoffs: [
        {
          option: 'Default option',
          pros: ['Unknown due to system limitations'],
          cons: ['Unknown due to system limitations']
        }
      ]
    };
  }
}

/**
 * Filter sensitive information from content
 */
export function filterSensitiveContent(
  content: string,
  sensitivePatterns: { type: string; pattern: RegExp }[] = []
): {
  filteredContent: string;
  removedItems: { type: string; value: string }[];
} {
  const defaultPatterns = [
    { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { type: 'phone', pattern: /\b(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g },
    { type: 'ssn', pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g },
    { type: 'creditcard', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
    { type: 'apikey', pattern: /\b[A-Za-z0-9_-]{20,}\b/g },
  ];

  const allPatterns = [...defaultPatterns, ...sensitivePatterns];
  let filteredContent = content;
  const removedItems: { type: string; value: string }[] = [];

  // Process each pattern
  allPatterns.forEach(({ type, pattern }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        filteredContent = filteredContent.replace(match, `[REDACTED ${type}]`);
        removedItems.push({ type, value: match });
      });
    }
  });

  return { filteredContent, removedItems };
}