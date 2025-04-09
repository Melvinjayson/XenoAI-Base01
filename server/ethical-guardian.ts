/**
 * Ethical Guardian Framework
 * 
 * This module provides ethical oversight for the AI system, ensuring responses
 * adhere to responsible AI principles, detect potential issues, and maintain
 * alignment with human values.
 */

import { OpenAI } from "openai";
import { apiQuotaManager, ApiService } from "./api-quota-manager";
import { storage } from "./storage";
import { ChatMessage } from "./types";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for ethical evaluation
export interface EthicalEvaluation {
  isApproved: boolean;
  reason?: string;
  concerns: EthicalConcern[];
  contentModified: boolean;
  modifiedContent?: string;
  guardrailsTriggered: string[];
  confidence: number;
}

export interface EthicalConcern {
  type: EthicalConcernType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation?: string;
}

export type EthicalConcernType = 
  | 'harmful_content'
  | 'misinformation' 
  | 'bias'
  | 'privacy_violation'
  | 'copyright_infringement'
  | 'harmful_advice'
  | 'user_manipulation'
  | 'output_reliability'
  | 'other';

interface EthicalGuardrail {
  id: string;
  name: string;
  description: string;
  concernType: EthicalConcernType;
  priority: number; // 1-10, higher is more important
  patternMatchers?: RegExp[];
  evaluationFunction?: (content: string, context: any) => Promise<{
    triggered: boolean;
    severity?: 'low' | 'medium' | 'high';
    description?: string;
  }>;
}

interface EthicalLog {
  timestamp: Date;
  sessionId: string;
  context: any;
  evaluation: EthicalEvaluation;
  originalContent: string;
  finalContent: string;
}

/**
 * Ethical Guardian class
 */
export class EthicalGuardian {
  private static instance: EthicalGuardian;
  
  // Guardrails configuration
  private guardrails: EthicalGuardrail[] = [];
  
  // Logging system
  private ethicalLogs: EthicalLog[] = [];
  private maxLogsRetained: number = 1000;
  
  // Statistics
  private totalEvaluations: number = 0;
  private guardrailsTriggered: Map<string, number> = new Map();
  
  private constructor() {
    // Initialize guardrails
    this.initializeGuardrails();
    console.log('Ethical Guardian framework initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): EthicalGuardian {
    if (!EthicalGuardian.instance) {
      EthicalGuardian.instance = new EthicalGuardian();
    }
    return EthicalGuardian.instance;
  }
  
  /**
   * Initialize ethical guardrails
   */
  private initializeGuardrails(): void {
    // Core guardrails for content safety
    this.guardrails = [
      {
        id: 'harmful_content_detection',
        name: 'Harmful Content Filter',
        description: 'Detects and prevents harmful content like violence, self-harm instructions, or illegal activities',
        concernType: 'harmful_content',
        priority: 10,
        patternMatchers: [
          /\b(how to|instructions for|steps to|guide to) (make|create|build|produce) (bombs?|explosives?|weapons?|poisons?)/i,
          /\b(how to|instructions for|steps to|guide to) (harm|hurt|injure|kill)/i,
          /\b(how to|ways to) commit (suicide|self-harm)/i,
          /\b(detailed instructions|step by step|tutorial) (for|on) (hacking|stealing|fraud)/i
        ]
      },
      {
        id: 'misinformation_detection',
        name: 'Misinformation Detection',
        description: 'Identifies potential misinformation or unverified claims presented as facts',
        concernType: 'misinformation',
        priority: 8,
        patternMatchers: [
          /\b(proven fact|scientific consensus|all experts agree|studies conclusively show|definitely|absolutely|undeniably) that\b/i,
          /\b(causes|cures|prevents|guaranteed to|proven to) (cancer|autism|all diseases|any illness)\b/i,
          /\b(government|scientists|doctors|experts) (hiding|concealing|suppressing|covering up)\b/i,
          /\b(miracle|revolutionary|breakthrough) (cure|solution|treatment|product)\b/i
        ]
      },
      {
        id: 'bias_detection',
        name: 'Bias Detection',
        description: 'Identifies potential bias in responses related to race, gender, religion, and other protected attributes',
        concernType: 'bias',
        priority: 7,
        patternMatchers: [
          /\ball (men|women|people of color|members of religious group) are\b/i,
          /\b(men|women) (always|never|inherently|naturally|typically|generally) (are|do|want|need|prefer)\b/i,
          /\b(superior|inferior|better|worse) (race|gender|religion|culture|country)\b/i,
          /\b(racial|ethnic|gender|religious) (stereotypes|generalizations)\b/i
        ]
      },
      {
        id: 'privacy_protection',
        name: 'Privacy Protection',
        description: 'Ensures responses do not reveal or request private information',
        concernType: 'privacy_violation',
        priority: 9,
        patternMatchers: [
          /\b(your|user's) (address|phone number|email|credit card|social security|personal identification|password)\b/i,
          /\b(tell me|share|what is) your (home address|personal email|phone number|full name|exact location)\b/i,
          /\bI('ve| have) stored your (conversation|personal details|information|data)\b/i,
          /\bI can access your (files|photos|contacts|calendar|browsing history)\b/i
        ]
      },
      {
        id: 'copyright_respect',
        name: 'Copyright Respect',
        description: 'Prevents generation of complete copyrighted content or code',
        concernType: 'copyright_infringement',
        priority: 6,
        patternMatchers: [
          /\b(full|complete|exact|verbatim) (text|code|implementation|lyrics|script) of\b/i,
          /\b(copy|reproduce|duplicate|replicate) (the entire|the complete|the full|all of the)\b/i,
          /\b(download|access|get) (paid|premium|subscription|licensed) content (for free|without paying)\b/i
        ]
      },
      {
        id: 'harmful_advice_prevention',
        name: 'Harmful Advice Prevention',
        description: 'Prevents giving advice that could lead to harm or illegal activities',
        concernType: 'harmful_advice',
        priority: 9,
        patternMatchers: [
          /\b(how to|best way to|steps for) (avoid|evade|bypass|get around) (taxes|law enforcement|security|legal requirements)\b/i,
          /\b(recommend|suggest|advise) (not getting vaccinated|avoiding medical treatment|ignoring doctor|stopping medication)\b/i,
          /\b(best|easiest|quickest|most effective) way to (steal|shoplift|cheat|defraud|plagiarize)\b/i
        ]
      },
      {
        id: 'manipulation_prevention',
        name: 'User Manipulation Prevention',
        description: 'Prevents responses that could manipulate users emotionally or financially',
        concernType: 'user_manipulation',
        priority: 8,
        patternMatchers: [
          /\b(urgent|limited time|act now|last chance) (offer|opportunity|deal)\b/i,
          /\b(guaranteed|promised|certain) (return|profit|benefit|reward)\b/i,
          /\b(everyone|all successful people|smart individuals|intelligent users) (invest in|buy|purchase|subscribe to)\b/i,
          /\b(you need|you must|you should|you have to) (pay|invest|spend|subscribe)\b/i
        ]
      },
      {
        id: 'output_reliability',
        name: 'Output Reliability Guardrail',
        description: 'Ensures outputs are reliable, consistent, and not hallucinated',
        concernType: 'output_reliability',
        priority: 7,
        evaluationFunction: async (content: string, context: any) => {
          // Check for markers of uncertainty presented as certainty
          const uncertaintyMarkers = [
            /\bI am (completely certain|100% sure|absolutely confident)\b/i,
            /\bThere is no doubt\b/i,
            /\bIt is (definitely|absolutely|undeniably)\b/i,
            /\bAll experts agree\b/i
          ];
          
          const containsOverconfidence = uncertaintyMarkers.some(pattern => pattern.test(content));
          
          if (containsOverconfidence) {
            return {
              triggered: true,
              severity: 'medium',
              description: 'Response contains overconfident assertions that might not be reliable'
            };
          }
          
          // Check for highly specific statistics without sources
          const unsourcedStatisticsPattern = /\b(\d{1,2}|\d{1,2}\.\d+)% of|(\d+) (out of|of) (\d+) people|studies show that \b(?!.*\bcitation\b|.*\bsource\b|.*\breference\b)/i;
          
          if (unsourcedStatisticsPattern.test(content)) {
            return {
              triggered: true,
              severity: 'low',
              description: 'Response contains specific statistics without attribution to sources'
            };
          }
          
          // Check for made-up "facts" about named entities
          if (context && context.entities && context.entities.length > 0) {
            for (const entity of context.entities) {
              // Look for very specific claims about the entity that may be hallucinated
              const entityName = entity.name;
              const specificClaimPattern = new RegExp(`\\b${entityName} (was born in|died in|invented|discovered|wrote|created|founded|established) [\\w\\s]+ in (\\d{4})\\b`, 'i');
              
              if (specificClaimPattern.test(content)) {
                return {
                  triggered: true,
                  severity: 'medium',
                  description: `Response contains specific historical claims about ${entityName} that may need verification`
                };
              }
            }
          }
          
          return { triggered: false };
        }
      }
    ];
    
    // Log the initialized guardrails
    console.log(`Initialized ${this.guardrails.length} ethical guardrails`);
  }
  
  /**
   * Evaluate content for ethical concerns
   * @param content Content to evaluate
   * @param context Context of the content
   * @param sessionId User session ID
   * @returns Ethical evaluation results
   */
  public async evaluateContent(
    content: string,
    context: any = {},
    sessionId: string = 'anonymous'
  ): Promise<EthicalEvaluation> {
    try {
      this.totalEvaluations++;
      
      // Initialize evaluation result
      const evaluation: EthicalEvaluation = {
        isApproved: true,
        concerns: [],
        contentModified: false,
        guardrailsTriggered: [],
        confidence: 1.0
      };
      
      // Check against all guardrails
      for (const guardrail of this.guardrails) {
        const result = await this.checkGuardrail(guardrail, content, context);
        
        if (result.triggered) {
          evaluation.isApproved = false;
          evaluation.guardrailsTriggered.push(guardrail.id);
          
          // Increment counter for this guardrail
          const currentCount = this.guardrailsTriggered.get(guardrail.id) || 0;
          this.guardrailsTriggered.set(guardrail.id, currentCount + 1);
          
          // Add concern
          evaluation.concerns.push({
            type: guardrail.concernType,
            severity: result.severity || 'medium',
            description: result.description || `Triggered guardrail: ${guardrail.name}`
          });
        }
      }
      
      // If any concerns were found, try to modify the content
      if (evaluation.concerns.length > 0) {
        const modifiedContent = await this.modifyContent(content, evaluation.concerns);
        
        if (modifiedContent && modifiedContent !== content) {
          evaluation.contentModified = true;
          evaluation.modifiedContent = modifiedContent;
          evaluation.isApproved = true; // Approve the modified content
        }
      }
      
      // Log the evaluation
      const logEntry: EthicalLog = {
        timestamp: new Date(),
        sessionId,
        context,
        evaluation: { ...evaluation },
        originalContent: content,
        finalContent: evaluation.modifiedContent || content
      };
      
      this.addToEthicalLog(logEntry);
      
      return evaluation;
    } catch (error) {
      console.error('Error in ethical evaluation:', error);
      
      // Return a default evaluation that approves the content but with low confidence
      return {
        isApproved: true,
        concerns: [{
          type: 'other',
          severity: 'low',
          description: 'Error during ethical evaluation process'
        }],
        contentModified: false,
        guardrailsTriggered: [],
        confidence: 0.5
      };
    }
  }
  
  /**
   * Check content against a specific guardrail
   * @param guardrail Guardrail to check
   * @param content Content to check
   * @param context Content context
   * @returns Whether the guardrail was triggered
   */
  private async checkGuardrail(
    guardrail: EthicalGuardrail,
    content: string,
    context: any
  ): Promise<{
    triggered: boolean;
    severity?: 'low' | 'medium' | 'high';
    description?: string;
  }> {
    try {
      // If the guardrail has pattern matchers, check them first
      if (guardrail.patternMatchers && guardrail.patternMatchers.length > 0) {
        for (const pattern of guardrail.patternMatchers) {
          if (pattern.test(content)) {
            return {
              triggered: true,
              severity: 'medium',
              description: `Content matched pattern for ${guardrail.name}`
            };
          }
        }
      }
      
      // If the guardrail has a custom evaluation function, use it
      if (guardrail.evaluationFunction) {
        return await guardrail.evaluationFunction(content, context);
      }
      
      // If neither patterns nor evaluation function, guardrail isn't triggered
      return { triggered: false };
    } catch (error) {
      console.error(`Error checking guardrail ${guardrail.id}:`, error);
      return { triggered: false };
    }
  }
  
  /**
   * Modify content to address ethical concerns
   * @param content Original content
   * @param concerns Ethical concerns
   * @returns Modified content or undefined if not modifiable
   */
  private async modifyContent(
    content: string,
    concerns: EthicalConcern[]
  ): Promise<string | undefined> {
    try {
      // Use OpenAI to modify content if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Format concerns for the prompt
        const concernsText = concerns.map(concern => 
          `- ${concern.type} (${concern.severity}): ${concern.description}`
        ).join('\n');
        
        const modificationPrompt = `
          I need to modify the following content to address these ethical concerns:
          
          CONCERNS:
          ${concernsText}
          
          ORIGINAL CONTENT:
          "${content}"
          
          Please rewrite the content to:
          1. Remove or address all the identified concerns
          2. Maintain the helpful intent of the original response
          3. Add appropriate caveats, nuance, or clarity where needed
          4. Provide similar information but in a more responsible way
          
          Only output the revised content, without explanations or comments.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: modificationPrompt }],
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            return openaiResponse.choices[0].message.content.trim();
          }
        } catch (error) {
          console.error('Error modifying content with OpenAI:', error);
        }
      }
      
      // Fallback approach - simple modifications based on concern types
      let modifiedContent = content;
      
      for (const concern of concerns) {
        switch (concern.type) {
          case 'harmful_content':
          case 'harmful_advice':
            // For harmful content, add a disclaimer
            modifiedContent = `I'm unable to provide that specific information as it may potentially be harmful. Instead, I'd be happy to discuss this topic more generally or suggest alternative approaches that are safe and constructive.\n\n${modifiedContent}`;
            break;
            
          case 'misinformation':
          case 'output_reliability':
            // For potential misinformation, add uncertainty markers
            modifiedContent = modifiedContent.replace(
              /(is|are|was|were|will be|has been|have been) (certainly|definitely|absolutely|undoubtedly|undeniably)/gi,
              '$1 possibly'
            );
            modifiedContent = `Note that I can provide general information, but you should verify specific details with authoritative sources. \n\n${modifiedContent}`;
            break;
            
          case 'bias':
            // For bias, try to make language more neutral
            modifiedContent = `I aim to provide balanced information free from bias. Different perspectives exist on this topic. \n\n${modifiedContent}`;
            break;
            
          case 'privacy_violation':
            // For privacy concerns, remove or redact
            modifiedContent = `I'm committed to protecting privacy and cannot access or share personal information. \n\n${modifiedContent}`;
            break;
            
          case 'copyright_infringement':
            // For copyright concerns
            modifiedContent = `I can provide general information about this topic, but cannot reproduce copyrighted content in full. \n\n${modifiedContent}`;
            break;
            
          case 'user_manipulation':
            // For manipulation concerns
            modifiedContent = `My goal is to provide helpful information without pressure or manipulation. Any decisions you make should be based on careful consideration. \n\n${modifiedContent}`;
            break;
            
          default:
            // For other concerns, add a general note
            modifiedContent = `Note: This information is provided for general purposes only. \n\n${modifiedContent}`;
        }
      }
      
      return modifiedContent;
    } catch (error) {
      console.error('Error modifying content:', error);
      return undefined;
    }
  }
  
  /**
   * Add an entry to the ethical log
   * @param logEntry Log entry to add
   */
  private addToEthicalLog(logEntry: EthicalLog): void {
    this.ethicalLogs.push(logEntry);
    
    // Trim logs if exceeding maximum
    if (this.ethicalLogs.length > this.maxLogsRetained) {
      this.ethicalLogs = this.ethicalLogs.slice(-this.maxLogsRetained);
    }
    
    // If this is a significant concern, save to persistent storage
    const hasSeriousConcern = logEntry.evaluation.concerns.some(c => 
      c.severity === 'high' || 
      c.type === 'harmful_content' || 
      c.type === 'harmful_advice'
    );
    
    if (hasSeriousConcern && storage && typeof storage.saveEthicalLogEntry === 'function') {
      storage.saveEthicalLogEntry(logEntry)
        .catch(error => console.error('Error saving ethical log to storage:', error));
    }
  }
  
  /**
   * Get statistics about guardrail triggers
   * @returns Statistics about guardrail triggers
   */
  public getGuardrailStats(): {
    totalEvaluations: number;
    guardrailTriggers: { id: string; name: string; count: number; percentage: number }[];
  } {
    const stats = Array.from(this.guardrailsTriggered.entries()).map(([id, count]) => {
      const guardrail = this.guardrails.find(g => g.id === id);
      return {
        id,
        name: guardrail?.name || id,
        count,
        percentage: this.totalEvaluations > 0 ? (count / this.totalEvaluations) * 100 : 0
      };
    });
    
    return {
      totalEvaluations: this.totalEvaluations,
      guardrailTriggers: stats.sort((a, b) => b.count - a.count)
    };
  }
  
  /**
   * Get recent ethical logs
   * @param limit Maximum number of logs to retrieve
   * @returns Recent ethical logs
   */
  public getRecentLogs(limit: number = 20): EthicalLog[] {
    return this.ethicalLogs.slice(-limit);
  }
  
  /**
   * Add a custom guardrail
   * @param guardrail Guardrail to add
   */
  public addGuardrail(guardrail: EthicalGuardrail): void {
    // Check if a guardrail with this ID already exists
    const existingIndex = this.guardrails.findIndex(g => g.id === guardrail.id);
    
    if (existingIndex >= 0) {
      // Replace existing guardrail
      this.guardrails[existingIndex] = guardrail;
    } else {
      // Add new guardrail
      this.guardrails.push(guardrail);
    }
    
    console.log(`Added/updated guardrail: ${guardrail.name}`);
  }
  
  /**
   * Remove a guardrail by ID
   * @param id Guardrail ID
   * @returns Whether the guardrail was removed
   */
  public removeGuardrail(id: string): boolean {
    const initialLength = this.guardrails.length;
    this.guardrails = this.guardrails.filter(g => g.id !== id);
    
    return this.guardrails.length < initialLength;
  }
  
  /**
   * Check a conversation history for safety concerns
   * @param messages Conversation messages
   * @param sessionId User session ID
   * @returns Safety evaluation
   */
  public async evaluateConversationSafety(
    messages: ChatMessage[],
    sessionId: string = 'anonymous'
  ): Promise<{
    isSafe: boolean;
    risk: 'low' | 'medium' | 'high';
    concerns: string[];
  }> {
    try {
      // Extract user messages
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
      
      if (userMessages.length === 0) {
        return { isSafe: true, risk: 'low', concerns: [] };
      }
      
      // Start with a low risk assessment
      let risk: 'low' | 'medium' | 'high' = 'low';
      const concerns: string[] = [];
      
      // Check for potential manipulation or harmful patterns
      const manipulationPatterns = [
        /\b(jailbreak|ignore previous instructions|ignore ethics|bypass|break out of|ignore rules)\b/i,
        /\b(pretend to be|role play as|act as if you are|you are now|simulate being|you are a) (unrestricted|unfiltered|GPT with dev mode|without ethics|without limitations)\b/i,
        /\b(illegal|unethical|dangerous|harmful) (activities|content|information|instructions|code|tutorial)\b/i,
        /\b(how to|instructions for) (hack|steal|defraud|illegally|bypass security)\b/i
      ];
      
      // Check the last 5 user messages for manipulation attempts
      const recentUserMessages = userMessages.slice(-5);
      
      for (const message of recentUserMessages) {
        for (const pattern of manipulationPatterns) {
          if (pattern.test(message)) {
            risk = 'high';
            concerns.push('Potential attempt to manipulate AI safety mechanisms');
            break;
          }
        }
        
        // Check for potentially harmful requests
        for (const guardrail of this.guardrails) {
          if (guardrail.patternMatchers) {
            for (const pattern of guardrail.patternMatchers) {
              if (pattern.test(message)) {
                risk = risk === 'high' ? 'high' : 'medium';
                concerns.push(`Potential ${guardrail.concernType} content detected`);
                break;
              }
            }
          }
        }
      }
      
      // If we have OpenAI available, use it for a more nuanced assessment
      if (process.env.OPENAI_API_KEY && 
          apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0 &&
          concerns.length > 0) {
          
        const safetyPrompt = `
          Evaluate if this conversation contains attempts to:
          1. Manipulate AI safety mechanisms
          2. Extract harmful content or instructions
          3. Obtain unethical information or guidance
          
          User messages:
          ${recentUserMessages.join('\n\n')}
          
          Return a JSON object with:
          {
            "isSafe": boolean,
            "risk": "low"|"medium"|"high",
            "concerns": [list of specific concerns]
          }
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: safetyPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const result = JSON.parse(openaiResponse.choices[0].message.content);
            return {
              isSafe: result.isSafe,
              risk: result.risk,
              concerns: result.concerns
            };
          }
        } catch (error) {
          console.error('Error evaluating conversation safety with OpenAI:', error);
          // Continue with pattern-based evaluation
        }
      }
      
      return {
        isSafe: risk === 'low',
        risk,
        concerns: [...new Set(concerns)] // Remove duplicates
      };
    } catch (error) {
      console.error('Error evaluating conversation safety:', error);
      return { isSafe: true, risk: 'low', concerns: ['Error during safety evaluation'] };
    }
  }
  
  /**
   * Evaluate user query for potential risks before processing
   * @param query User query 
   * @param sessionId User session ID
   * @param conversationHistory Conversation history
   * @returns Risk assessment
   */
  public async evaluateQuery(
    query: string,
    sessionId: string = 'anonymous',
    conversationHistory: ChatMessage[] = []
  ): Promise<{
    isSafe: boolean;
    risk: 'low' | 'medium' | 'high';
    concerns: string[];
    modifiedQuery?: string;
  }> {
    try {
      // Pattern check for immediate high-risk concerns
      const highRiskPatterns = [
        /\b(how to|instructions for|steps to|guide to) (make|create|build|produce) (bombs?|explosives?|weapons?|poisons?)/i,
        /\b(how to|instructions for|steps to|guide to) (hack|steal|defraud|launder money|bypass security)\b/i,
        /\b(jailbreak|ignore previous instructions|ignore ethical guidelines|dev mode|ignore safety)\b/i
      ];
      
      for (const pattern of highRiskPatterns) {
        if (pattern.test(query)) {
          return {
            isSafe: false,
            risk: 'high',
            concerns: ['Query contains potentially harmful content or manipulation attempt']
          };
        }
      }
      
      // Check for medium risk patterns
      const mediumRiskPatterns = [
        /\b(illegal|unethical|dangerous) (activities|content|information)\b/i,
        /\b(access|distribute|share) (pirated|illegal|copyright|proprietary) (content|material|software)\b/i,
        /\b(pretend to be|act as if you are|you are now) (without|ignoring|bypassing) (limitations|guidelines|restrictions)\b/i
      ];
      
      for (const pattern of mediumRiskPatterns) {
        if (pattern.test(query)) {
          return {
            isSafe: false,
            risk: 'medium',
            concerns: ['Query contains potentially problematic requests']
          };
        }
      }
      
      // If conversation history exists, check for escalating patterns
      if (conversationHistory.length > 0) {
        const safety = await this.evaluateConversationSafety(
          [...conversationHistory, { role: 'user', content: query }],
          sessionId
        );
        
        if (safety.risk !== 'low') {
          return safety;
        }
      }
      
      // If no immediate risks identified, the query is likely safe
      return {
        isSafe: true,
        risk: 'low',
        concerns: []
      };
    } catch (error) {
      console.error('Error evaluating query safety:', error);
      return { isSafe: true, risk: 'low', concerns: [] };
    }
  }
}

// Export singleton instance
export const ethicalGuardian = EthicalGuardian.getInstance();