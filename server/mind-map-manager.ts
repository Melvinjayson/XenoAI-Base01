import OpenAI from "openai";
import { apiQuotaManager } from "./api-quota-manager";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Represents a topic in a mind map
 */
export interface MindMapTopic {
  id: string;
  text: string;
  parentId?: string;
  level: number;
  children: string[];
  attributes?: {
    color?: string;
    icon?: string;
    notes?: string;
    url?: string;
    importance?: number; // 0-1 scale
  };
}

/**
 * Interface for a complete mind map
 */
export interface MindMap {
  id: string;
  title: string;
  centralTopic: MindMapTopic;
  topics: Record<string, MindMapTopic>;
  createdAt: number;
  updatedAt: number;
  userId?: string;
  tags?: string[];
  description?: string;
}

/**
 * Generate a new mind map based on a central topic
 */
export async function generateMindMap(centralTopicText: string, context?: string): Promise<MindMap> {
  // Create a unique ID for the mind map
  const mindMapId = `mindmap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create the central topic
  const centralTopicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const centralTopic: MindMapTopic = {
    id: centralTopicId,
    text: centralTopicText,
    level: 0,
    children: [],
    attributes: {
      color: "#4527A0"
    }
  };
  
  // Initialize the mind map
  const mindMap: MindMap = {
    id: mindMapId,
    title: `Mind Map: ${centralTopicText}`,
    centralTopic,
    topics: {
      [centralTopicId]: centralTopic
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    description: `Mind map exploring ${centralTopicText}`
  };
  
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 800);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified mind map generation");
      return await expandMindMapWithBasicBranches(mindMap);
    }
    
    // Build a comprehensive prompt
    const prompt = `Generate a detailed mind map structure for the central topic "${centralTopicText}".
${context ? `Consider this additional context: ${context}` : ''}

Create a mind map with the following structure:
1. The central topic "${centralTopicText}"
2. 4-6 main branches (Level 1) that represent key aspects or categories of the central topic
3. For each main branch, provide 3-5 subtopics (Level 2) that elaborate on that aspect
4. Optional: For each subtopic, suggest 2-3 further details or examples (Level 3)

Format your response as a JSON object following this exact structure:
{
  "branches": [
    {
      "text": "Main Branch 1",
      "color": "#4527A0",
      "children": [
        {
          "text": "Subtopic 1.1",
          "color": "#7E57C2",
          "children": [
            {
              "text": "Detail 1.1.1",
              "color": "#B39DDB",
              "children": []
            }
          ]
        }
      ]
    }
  ]
}

Use a diverse but coordinated color palette. Main branches should have distinct colors, and subtopics should be lighter shades of their parent's color.`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the most advanced model for best results
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7, // Higher temperature for more diverse mind maps
    });

    // Parse and validate the response
    const content = response.choices[0].message.content || '';
    const parsedResponse = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Process the response into our mind map format
    if (parsedResponse.branches && Array.isArray(parsedResponse.branches)) {
      // Process each main branch (Level 1)
      for (const branch of parsedResponse.branches) {
        const branchId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const branchTopic: MindMapTopic = {
          id: branchId,
          text: branch.text,
          parentId: centralTopicId,
          level: 1,
          children: [],
          attributes: {
            color: branch.color || getRandomColor(),
            importance: 0.8
          }
        };
        
        mindMap.topics[branchId] = branchTopic;
        mindMap.centralTopic.children.push(branchId);
        
        // Process subtopics (Level 2)
        if (branch.children && Array.isArray(branch.children)) {
          for (const subtopic of branch.children) {
            const subtopicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const subtopicTopic: MindMapTopic = {
              id: subtopicId,
              text: subtopic.text,
              parentId: branchId,
              level: 2,
              children: [],
              attributes: {
                color: subtopic.color || lightenColor(branchTopic.attributes?.color || "#000000", 0.2),
                importance: 0.6
              }
            };
            
            mindMap.topics[subtopicId] = subtopicTopic;
            branchTopic.children.push(subtopicId);
            
            // Process details (Level 3)
            if (subtopic.children && Array.isArray(subtopic.children)) {
              for (const detail of subtopic.children) {
                const detailId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const detailTopic: MindMapTopic = {
                  id: detailId,
                  text: detail.text,
                  parentId: subtopicId,
                  level: 3,
                  children: [],
                  attributes: {
                    color: detail.color || lightenColor(subtopicTopic.attributes?.color || "#000000", 0.3),
                    importance: 0.4
                  }
                };
                
                mindMap.topics[detailId] = detailTopic;
                subtopicTopic.children.push(detailId);
              }
            }
          }
        }
      }
    }
    
    return mindMap;
  } catch (error) {
    console.error("Error generating mind map:", error);
    return expandMindMapWithBasicBranches(mindMap);
  }
}

/**
 * Generate a basic mind map with simple branches when AI is not available
 */
async function expandMindMapWithBasicBranches(mindMap: MindMap): Promise<MindMap> {
  const centralTopic = mindMap.centralTopic.text;
  
  // Define some generic branches based on common knowledge structures
  const genericBranches = [
    { text: "Definition", color: "#4527A0" },
    { text: "Key Characteristics", color: "#00897B" },
    { text: "Applications", color: "#F57C00" },
    { text: "History", color: "#C2185B" },
    { text: "Future Directions", color: "#7CB342" }
  ];
  
  // Add the branches to the mind map
  for (const branch of genericBranches) {
    const branchId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const branchTopic: MindMapTopic = {
      id: branchId,
      text: branch.text,
      parentId: mindMap.centralTopic.id,
      level: 1,
      children: [],
      attributes: {
        color: branch.color,
        importance: 0.8
      }
    };
    
    mindMap.topics[branchId] = branchTopic;
    mindMap.centralTopic.children.push(branchId);
    
    // Add some generic subtopics
    const subtopics = getGenericSubtopics(branch.text);
    for (const subtopicText of subtopics) {
      const subtopicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const subtopicTopic: MindMapTopic = {
        id: subtopicId,
        text: subtopicText,
        parentId: branchId,
        level: 2,
        children: [],
        attributes: {
          color: lightenColor(branch.color, 0.2),
          importance: 0.6
        }
      };
      
      mindMap.topics[subtopicId] = subtopicTopic;
      branchTopic.children.push(subtopicId);
    }
  }
  
  return mindMap;
}

/**
 * Get generic subtopics based on the main branch text
 */
function getGenericSubtopics(branchText: string): string[] {
  switch (branchText) {
    case "Definition":
      return ["Formal Definition", "Common Understanding", "Related Terms"];
    case "Key Characteristics":
      return ["Primary Features", "Unique Aspects", "Common Elements"];
    case "Applications":
      return ["Current Uses", "Potential Applications", "Case Studies"];
    case "History":
      return ["Origins", "Key Developments", "Evolution Over Time"];
    case "Future Directions":
      return ["Emerging Trends", "Research Areas", "Predictions"];
    default:
      return ["Aspect 1", "Aspect 2", "Aspect 3"];
  }
}

/**
 * Generate a random color
 */
function getRandomColor(): string {
  const colors = [
    "#4527A0", // Deep Purple
    "#00897B", // Teal
    "#F57C00", // Orange
    "#C2185B", // Pink
    "#7CB342", // Light Green
    "#0288D1", // Light Blue
    "#FFA000", // Amber
    "#D32F2F", // Red
    "#388E3C", // Green
    "#1976D2", // Blue
    "#8D6E63", // Brown
    "#5E35B1"  // Purple
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Lighten a hex color by a certain amount
 */
function lightenColor(hex: string, amount: number): string {
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Parse the hex value to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten the color
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Expand a specific topic in the mind map with subtopics
 */
export async function expandMindMapTopic(
  mindMap: MindMap,
  topicId: string,
  contextHint?: string
): Promise<MindMap> {
  // Find the topic
  const topic = mindMap.topics[topicId];
  if (!topic) {
    throw new Error(`Topic with ID ${topicId} not found in mind map`);
  }
  
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 600);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified topic expansion");
      return expandTopicWithBasicSubtopics(mindMap, topicId);
    }
    
    // Get the full context
    let contextPath = "";
    let currentTopic = topic;
    
    // Build the path from root to this topic
    while (currentTopic.parentId) {
      const parent = mindMap.topics[currentTopic.parentId];
      if (parent) {
        contextPath = `${parent.text} > ${contextPath}`;
        currentTopic = parent;
      } else {
        break;
      }
    }
    
    // Add the central topic
    if (contextPath.length === 0) {
      contextPath = `${mindMap.centralTopic.text} > `;
    }
    
    // Add the current topic
    contextPath += topic.text;
    
    // Build the prompt
    const prompt = `Expand the mind map topic "${topic.text}" with 3-5 detailed subtopics.

Context:
- This topic is part of a mind map about "${mindMap.centralTopic.text}"
- Topic path: ${contextPath}
${contextHint ? `- Additional context: ${contextHint}` : ''}

The subtopics should:
1. Be specific and detailed, not generic
2. Provide meaningful aspects or examples of "${topic.text}"
3. Each have a short, concise label (3-5 words)

Format your response as a JSON array following this exact structure:
[
  {
    "text": "Subtopic 1",
    "importance": 0.8, // Scale from 0.1 to 1.0 indicating relevance
    "notes": "Optional brief explanation of this subtopic's significance"
  }
]`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse and validate the response
    const content = response.choices[0].message.content || '';
    let subtopics = [];
    
    try {
      const parsedResponse = JSON.parse(content);
      if (Array.isArray(parsedResponse)) {
        subtopics = parsedResponse;
      } else if (parsedResponse.subtopics && Array.isArray(parsedResponse.subtopics)) {
        subtopics = parsedResponse.subtopics;
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return expandTopicWithBasicSubtopics(mindMap, topicId);
    }
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Add the subtopics to the mind map
    if (subtopics.length > 0) {
      for (const subtopic of subtopics) {
        const subtopicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const subtopicTopic: MindMapTopic = {
          id: subtopicId,
          text: subtopic.text,
          parentId: topicId,
          level: topic.level + 1,
          children: [],
          attributes: {
            color: lightenColor(topic.attributes?.color || "#000000", 0.15),
            importance: typeof subtopic.importance === 'number' ? 
              Math.max(0.1, Math.min(1.0, subtopic.importance)) : 0.7,
            notes: subtopic.notes
          }
        };
        
        mindMap.topics[subtopicId] = subtopicTopic;
        topic.children.push(subtopicId);
      }
    } else {
      // If no subtopics were generated, fall back to basic expansion
      return expandTopicWithBasicSubtopics(mindMap, topicId);
    }
    
    // Update the mind map
    mindMap.updatedAt = Date.now();
    return mindMap;
  } catch (error) {
    console.error("Error expanding mind map topic:", error);
    return expandTopicWithBasicSubtopics(mindMap, topicId);
  }
}

/**
 * Expand a topic with basic subtopics when AI is not available
 */
function expandTopicWithBasicSubtopics(mindMap: MindMap, topicId: string): MindMap {
  const topic = mindMap.topics[topicId];
  if (!topic) {
    return mindMap;
  }
  
  // Generate generic subtopics based on the topic's text and level
  const genericSubtopics = generateGenericSubtopics(topic.text, topic.level);
  
  // Add the subtopics to the mind map
  for (const subtopicText of genericSubtopics) {
    const subtopicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const subtopicTopic: MindMapTopic = {
      id: subtopicId,
      text: subtopicText,
      parentId: topicId,
      level: topic.level + 1,
      children: [],
      attributes: {
        color: lightenColor(topic.attributes?.color || "#000000", 0.15),
        importance: 0.7
      }
    };
    
    mindMap.topics[subtopicId] = subtopicTopic;
    topic.children.push(subtopicId);
  }
  
  // Update the mind map
  mindMap.updatedAt = Date.now();
  return mindMap;
}

/**
 * Generate generic subtopics based on the topic's text and level
 */
function generateGenericSubtopics(topicText: string, level: number): string[] {
  // General knowledge framework based on topic depth
  if (level === 0) {
    // Central topic - return main categories
    return ["Overview", "Components", "Applications", "History", "Future"];
  } else if (level === 1) {
    // Main branches - return general aspects
    return ["Key Characteristics", "Examples", "Related Concepts", "Significance"];
  } else if (level === 2) {
    // Subtopics - return more specific aspects
    return ["Specific Case", "Detailed Example", "Application"];
  } else {
    // Deep level - return simple details
    return ["Detail 1", "Detail 2", "Example"];
  }
}

/**
 * Merge two mind maps together
 */
export function mergeMindMaps(primaryMap: MindMap, secondaryMap: MindMap): MindMap {
  // Create a new mind map based on the primary one
  const mergedMap: MindMap = {
    ...primaryMap,
    updatedAt: Date.now(),
    topics: { ...primaryMap.topics }
  };
  
  // Function to find matching topics by text similarity
  function findMatchingTopic(text: string, excludeIds: string[] = []): string | null {
    const normalizedText = text.toLowerCase().trim();
    for (const [id, topic] of Object.entries(mergedMap.topics)) {
      if (!excludeIds.includes(id) && topic.text.toLowerCase().trim() === normalizedText) {
        return id;
      }
    }
    return null;
  }
  
  // Process all topics from the secondary mind map except the central topic
  const processedIds = new Set<string>([secondaryMap.centralTopic.id]);
  
  // Helper function to add topics recursively
  function addTopicsRecursively(
    topicId: string, 
    parentId: string | undefined, 
    level: number
  ): void {
    const topic = secondaryMap.topics[topicId];
    if (!topic || processedIds.has(topicId)) return;
    
    processedIds.add(topicId);
    
    // Check if there's a matching topic in the merged map
    const matchingId = findMatchingTopic(topic.text, [topic.id]);
    
    if (matchingId) {
      // If a matching topic exists, add children to the matching topic
      for (const childId of topic.children) {
        addTopicsRecursively(childId, matchingId, mergedMap.topics[matchingId].level + 1);
      }
    } else {
      // Create a new topic in the merged map
      const newId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newTopic: MindMapTopic = {
        id: newId,
        text: topic.text,
        parentId,
        level,
        children: [],
        attributes: { ...topic.attributes }
      };
      
      mergedMap.topics[newId] = newTopic;
      
      // Add to parent's children
      if (parentId && mergedMap.topics[parentId]) {
        mergedMap.topics[parentId].children.push(newId);
      } else if (!parentId) {
        // If no parent (it's a main branch), add to the central topic
        mergedMap.centralTopic.children.push(newId);
      }
      
      // Add children recursively
      for (const childId of topic.children) {
        addTopicsRecursively(childId, newId, level + 1);
      }
    }
  }
  
  // Start with the main branches of the secondary mind map
  for (const branchId of secondaryMap.centralTopic.children) {
    addTopicsRecursively(branchId, undefined, 1);
  }
  
  return mergedMap;
}