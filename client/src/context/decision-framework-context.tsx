import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Decision,
  DecisionOption,
  ProCon,
  GuidedReflection,
  DecisionInsight,
  DecisionFramework,
} from '@/types/decision-framework';

// Interface for the context state
interface DecisionFrameworkState {
  decisions: Decision[];
  options: DecisionOption[];
  reflections: GuidedReflection[];
  insights: DecisionInsight[];
  frameworks: DecisionFramework[];
  loading: boolean;
  currentDecisionId: string | null;
  error: string | null;
}

// Initial state
const initialState: DecisionFrameworkState = {
  decisions: [],
  options: [],
  reflections: [],
  insights: [],
  frameworks: [],
  loading: false,
  currentDecisionId: null,
  error: null,
};

// Action types
type DecisionFrameworkAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DECISIONS'; payload: Decision[] }
  | { type: 'ADD_DECISION'; payload: Decision }
  | { type: 'UPDATE_DECISION'; payload: Decision }
  | { type: 'DELETE_DECISION'; payload: string }
  | { type: 'SET_CURRENT_DECISION'; payload: string | null }
  | { type: 'SET_OPTIONS'; payload: DecisionOption[] }
  | { type: 'ADD_OPTION'; payload: DecisionOption }
  | { type: 'UPDATE_OPTION'; payload: DecisionOption }
  | { type: 'DELETE_OPTION'; payload: string }
  | { type: 'SET_REFLECTIONS'; payload: GuidedReflection[] }
  | { type: 'ADD_REFLECTION'; payload: GuidedReflection }
  | { type: 'UPDATE_REFLECTION'; payload: GuidedReflection }
  | { type: 'SET_INSIGHTS'; payload: DecisionInsight[] }
  | { type: 'ADD_INSIGHT'; payload: DecisionInsight }
  | { type: 'SET_FRAMEWORKS'; payload: DecisionFramework[] };

// Reducer function
function decisionFrameworkReducer(
  state: DecisionFrameworkState,
  action: DecisionFrameworkAction
): DecisionFrameworkState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DECISIONS':
      return { ...state, decisions: action.payload };
    case 'ADD_DECISION':
      return { ...state, decisions: [...state.decisions, action.payload] };
    case 'UPDATE_DECISION':
      return {
        ...state,
        decisions: state.decisions.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'DELETE_DECISION':
      return {
        ...state,
        decisions: state.decisions.filter((d) => d.id !== action.payload),
        currentDecisionId:
          state.currentDecisionId === action.payload
            ? null
            : state.currentDecisionId,
      };
    case 'SET_CURRENT_DECISION':
      return { ...state, currentDecisionId: action.payload };
    case 'SET_OPTIONS':
      return { ...state, options: action.payload };
    case 'ADD_OPTION':
      return { ...state, options: [...state.options, action.payload] };
    case 'UPDATE_OPTION':
      return {
        ...state,
        options: state.options.map((o) =>
          o.id === action.payload.id ? action.payload : o
        ),
      };
    case 'DELETE_OPTION':
      return {
        ...state,
        options: state.options.filter((o) => o.id !== action.payload),
      };
    case 'SET_REFLECTIONS':
      return { ...state, reflections: action.payload };
    case 'ADD_REFLECTION':
      return { ...state, reflections: [...state.reflections, action.payload] };
    case 'UPDATE_REFLECTION':
      return {
        ...state,
        reflections: state.reflections.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload };
    case 'ADD_INSIGHT':
      return { ...state, insights: [...state.insights, action.payload] };
    case 'SET_FRAMEWORKS':
      return { ...state, frameworks: action.payload };
    default:
      return state;
  }
}

// Create the context
interface DecisionFrameworkContextProps {
  state: DecisionFrameworkState;
  createDecision: (decision: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDecision: (decision: Partial<Decision> & { id: string }) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  setCurrentDecision: (id: string | null) => void;
  createOption: (option: Omit<DecisionOption, 'id' | 'createdAt' | 'updatedAt' | 'pros' | 'cons'>) => Promise<void>;
  updateOption: (option: Partial<DecisionOption> & { id: string }) => Promise<void>;
  deleteOption: (id: string) => Promise<void>;
  addProCon: (optionId: string, proCon: Omit<ProCon, 'id' | 'createdAt'>, isPro: boolean) => Promise<void>;
  removeProCon: (optionId: string, proConId: string, isPro: boolean) => Promise<void>;
  createReflection: (reflection: Omit<GuidedReflection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReflection: (reflection: Partial<GuidedReflection> & { id: string }) => Promise<void>;
  generateInsights: (decisionId: string) => Promise<void>;
  analyzeDecision: (decisionId: string) => Promise<void>;
  getFrameworks: () => Promise<void>;
  loadDecision: (id: string) => Promise<void>;
}

const DecisionFrameworkContext = createContext<DecisionFrameworkContextProps | undefined>(undefined);

// Provider component
interface DecisionFrameworkProviderProps {
  children: ReactNode;
}

export function DecisionFrameworkProvider({ children }: DecisionFrameworkProviderProps) {
  const [state, dispatch] = useReducer(decisionFrameworkReducer, initialState);
  const { toast } = useToast();

  // Load decisions from storage on mount
  useEffect(() => {
    fetchDecisions();
    fetchFrameworks();
  }, []);

  // Fetch all decisions
  const fetchDecisions = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // This would be replaced with a real API call in production
      const mockDecisions: Decision[] = [
        {
          id: '1',
          title: 'Career Change Decision',
          description: 'Evaluating whether to change careers from finance to technology',
          category: 'Career',
          stakeholders: ['Self', 'Family'],
          createdAt: Date.now() - 86400000, // 1 day ago
          updatedAt: Date.now() - 86400000,
          status: 'draft',
        },
        {
          id: '2',
          title: 'Home Purchase',
          description: 'Deciding whether to buy a house in the suburbs or continue renting in the city',
          category: 'Finance',
          stakeholders: ['Self', 'Spouse'],
          createdAt: Date.now() - 172800000, // 2 days ago
          updatedAt: Date.now() - 86400000,
          status: 'analysis',
        }
      ];
      
      dispatch({ type: 'SET_DECISIONS', payload: mockDecisions });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Error fetching decisions:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch decisions' });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to fetch decisions',
        variant: 'destructive',
      });
    }
  };

  // Fetch decision frameworks
  const fetchFrameworks = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // This would be replaced with a real API call in production
      const mockFrameworks: DecisionFramework[] = [
        {
          id: '1',
          name: 'SWOT Analysis',
          description: 'Analyze Strengths, Weaknesses, Opportunities, and Threats',
          steps: [
            {
              id: '1-1',
              frameworkId: '1',
              title: 'Strengths',
              description: 'Identify internal factors that give you an advantage',
              order: 1,
              reflectionPrompts: [
                'What do you do well?',
                'What unique resources can you draw on?',
                'What do others see as your strengths?'
              ]
            },
            {
              id: '1-2',
              frameworkId: '1',
              title: 'Weaknesses',
              description: 'Identify internal factors that put you at a disadvantage',
              order: 2,
              reflectionPrompts: [
                'What could you improve?',
                'Where do you have fewer resources than others?',
                'What are others likely to see as weaknesses?'
              ]
            },
            {
              id: '1-3',
              frameworkId: '1',
              title: 'Opportunities',
              description: 'Identify external factors that could give you an advantage',
              order: 3,
              reflectionPrompts: [
                'What opportunities are open to you?',
                'What trends could you take advantage of?',
                'How can you turn strengths into opportunities?'
              ]
            },
            {
              id: '1-4',
              frameworkId: '1',
              title: 'Threats',
              description: 'Identify external factors that could cause trouble',
              order: 4,
              reflectionPrompts: [
                'What threats could harm you?',
                'What is your competition doing?',
                'What threats do your weaknesses expose you to?'
              ]
            }
          ],
          createdAt: Date.now()
        },
        {
          id: '2',
          name: 'Six Thinking Hats',
          description: 'Approach decisions from different perspectives using De Bono\'s Six Thinking Hats method',
          steps: [
            {
              id: '2-1',
              frameworkId: '2',
              title: 'White Hat - Facts',
              description: 'Focus on available data and information',
              order: 1,
              reflectionPrompts: [
                'What information do we have?',
                'What information is missing?',
                'How can we get the information we need?'
              ]
            },
            {
              id: '2-2',
              frameworkId: '2',
              title: 'Red Hat - Feelings',
              description: 'Look at the decision emotionally',
              order: 2,
              reflectionPrompts: [
                'What does your intuition tell you?',
                'How do you feel about this right now?',
                'What emotional reactions might others have?'
              ]
            },
            {
              id: '2-3',
              frameworkId: '2',
              title: 'Black Hat - Caution',
              description: 'Look at the potential risks and problems',
              order: 3,
              reflectionPrompts: [
                'What could go wrong?',
                'What are the weaknesses?',
                'What obstacles might you encounter?'
              ]
            },
            {
              id: '2-4',
              frameworkId: '2',
              title: 'Yellow Hat - Benefits',
              description: 'Focus on the positives and benefits',
              order: 4,
              reflectionPrompts: [
                'What are the advantages?',
                'What is the best-case scenario?',
                'What value could this bring?'
              ]
            },
            {
              id: '2-5',
              frameworkId: '2',
              title: 'Green Hat - Creativity',
              description: 'Think creatively about alternatives and new possibilities',
              order: 5,
              reflectionPrompts: [
                'What are some alternative approaches?',
                'How might you overcome the obstacles?',
                'What creative solutions could address the concerns?'
              ]
            },
            {
              id: '2-6',
              frameworkId: '2',
              title: 'Blue Hat - Process',
              description: 'Organize the thinking process and next steps',
              order: 6,
              reflectionPrompts: [
                'What have we learned from this analysis?',
                'What is our plan going forward?',
                'How will we monitor progress and adjust?'
              ]
            }
          ],
          createdAt: Date.now()
        }
      ];
      
      dispatch({ type: 'SET_FRAMEWORKS', payload: mockFrameworks });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Error fetching frameworks:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch frameworks' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load a specific decision with its options, reflections, and insights
  const loadDecision = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CURRENT_DECISION', payload: id });
      
      // In a real implementation, these would be API calls:
      // const response = await apiRequest('GET', `/api/decisions/${id}`);
      // const decision = await response.json();
      
      // For now, we'll use mock data for the selected decision
      const mockOptions: DecisionOption[] = id === '1' ? [
        {
          id: '1-1',
          decisionId: '1',
          title: 'Stay in Current Career',
          description: 'Continue working in finance with potential for advancement',
          pros: [
            {
              id: '1-1-p1',
              content: 'Established expertise and reputation',
              weight: 8,
              category: 'professional',
              createdAt: Date.now() - 86400000
            },
            {
              id: '1-1-p2',
              content: 'Stable income and benefits',
              weight: 9,
              category: 'financial',
              createdAt: Date.now() - 86400000
            }
          ],
          cons: [
            {
              id: '1-1-c1',
              content: 'Feeling of stagnation and boredom',
              weight: 7,
              category: 'emotional',
              createdAt: Date.now() - 86400000
            },
            {
              id: '1-1-c2',
              content: 'Limited growth in emerging tech fields',
              weight: 6,
              category: 'professional',
              createdAt: Date.now() - 86400000
            }
          ],
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000
        },
        {
          id: '1-2',
          decisionId: '1',
          title: 'Change to Tech Career',
          description: 'Transition to a technology role through retraining and new position',
          pros: [
            {
              id: '1-2-p1',
              content: 'Alignment with personal interests',
              weight: 9,
              category: 'personal',
              createdAt: Date.now() - 86400000
            },
            {
              id: '1-2-p2',
              content: 'Better long-term growth potential',
              weight: 8,
              category: 'professional',
              createdAt: Date.now() - 86400000
            }
          ],
          cons: [
            {
              id: '1-2-c1',
              content: 'Initial salary reduction during transition',
              weight: 7,
              category: 'financial',
              createdAt: Date.now() - 86400000
            },
            {
              id: '1-2-c2',
              content: 'Starting over in new field with less seniority',
              weight: 6,
              category: 'professional',
              createdAt: Date.now() - 86400000
            }
          ],
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000
        }
      ] : [];
      
      const mockReflections: GuidedReflection[] = id === '1' ? [
        {
          id: '1-r1',
          decisionId: '1',
          prompt: 'What would success look like after making this decision?',
          response: 'Success would mean feeling intellectually challenged and engaged with my work again, having a clear path for growth, and maintaining financial stability for my family.',
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000
        },
        {
          id: '1-r2',
          decisionId: '1',
          prompt: 'How does this decision align with your core values?',
          response: 'My core values include continuous learning, creative problem-solving, and work-life balance. A technology career aligns well with learning and problem-solving, but may initially impact work-life balance during the transition.',
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000
        }
      ] : [];
      
      const mockInsights: DecisionInsight[] = id === '1' ? [
        {
          id: '1-i1',
          decisionId: '1',
          content: 'Your strongest concerns appear to be financial stability versus personal fulfillment. Consider exploring hybrid roles that combine finance and technology knowledge to ease the transition.',
          type: 'synthesis',
          createdAt: Date.now() - 43200000 // 12 hours ago
        },
        {
          id: '1-i2',
          decisionId: '1',
          content: 'You may be underestimating the transferable skills from finance to technology, such as analytical thinking, attention to detail, and understanding of business processes.',
          type: 'blind_spot',
          createdAt: Date.now() - 43200000
        }
      ] : [];
      
      dispatch({ type: 'SET_OPTIONS', payload: mockOptions });
      dispatch({ type: 'SET_REFLECTIONS', payload: mockReflections });
      dispatch({ type: 'SET_INSIGHTS', payload: mockInsights });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error(`Error loading decision ${id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to load decision ${id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: `Failed to load decision details`,
        variant: 'destructive',
      });
    }
  };

  // Create a new decision
  const createDecision = async (decision: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('POST', '/api/decisions', decision);
      // const newDecision = await response.json();
      
      // For now, we'll use mock data
      const newDecision: Decision = {
        ...decision,
        id: `new-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'ADD_DECISION', payload: newDecision });
      dispatch({ type: 'SET_CURRENT_DECISION', payload: newDecision.id });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Decision created successfully',
      });
      
      return;
    } catch (error) {
      console.error('Error creating decision:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create decision' });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to create decision',
        variant: 'destructive',
      });
    }
  };

  // Update an existing decision
  const updateDecision = async (decision: Partial<Decision> & { id: string }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('PATCH', `/api/decisions/${decision.id}`, decision);
      // const updatedDecision = await response.json();
      
      // For now, we'll update locally
      const existingDecision = state.decisions.find(d => d.id === decision.id);
      if (!existingDecision) {
        throw new Error('Decision not found');
      }
      
      const updatedDecision: Decision = {
        ...existingDecision,
        ...decision,
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'UPDATE_DECISION', payload: updatedDecision });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Decision updated successfully',
      });
      
      return;
    } catch (error) {
      console.error(`Error updating decision ${decision.id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update decision ${decision.id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to update decision',
        variant: 'destructive',
      });
    }
  };

  // Delete a decision
  const deleteDecision = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // await apiRequest('DELETE', `/api/decisions/${id}`);
      
      dispatch({ type: 'DELETE_DECISION', payload: id });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Decision deleted successfully',
      });
      
      return;
    } catch (error) {
      console.error(`Error deleting decision ${id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete decision ${id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to delete decision',
        variant: 'destructive',
      });
    }
  };

  // Set the current decision
  const setCurrentDecision = (id: string | null) => {
    dispatch({ type: 'SET_CURRENT_DECISION', payload: id });
    if (id) {
      loadDecision(id);
    }
  };

  // Create a new option for a decision
  const createOption = async (option: Omit<DecisionOption, 'id' | 'createdAt' | 'updatedAt' | 'pros' | 'cons'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('POST', '/api/options', option);
      // const newOption = await response.json();
      
      // For now, we'll use mock data
      const newOption: DecisionOption = {
        ...option,
        id: `option-${Date.now()}`,
        pros: [],
        cons: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'ADD_OPTION', payload: newOption });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Option added successfully',
      });
      
      return;
    } catch (error) {
      console.error('Error creating option:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create option' });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to create option',
        variant: 'destructive',
      });
    }
  };

  // Update an existing option
  const updateOption = async (option: Partial<DecisionOption> & { id: string }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('PATCH', `/api/options/${option.id}`, option);
      // const updatedOption = await response.json();
      
      // For now, we'll update locally
      const existingOption = state.options.find(o => o.id === option.id);
      if (!existingOption) {
        throw new Error('Option not found');
      }
      
      const updatedOption: DecisionOption = {
        ...existingOption,
        ...option,
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'UPDATE_OPTION', payload: updatedOption });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Option updated successfully',
      });
      
      return;
    } catch (error) {
      console.error(`Error updating option ${option.id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update option ${option.id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to update option',
        variant: 'destructive',
      });
    }
  };

  // Delete an option
  const deleteOption = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // await apiRequest('DELETE', `/api/options/${id}`);
      
      dispatch({ type: 'DELETE_OPTION', payload: id });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Option deleted successfully',
      });
      
      return;
    } catch (error) {
      console.error(`Error deleting option ${id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete option ${id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to delete option',
        variant: 'destructive',
      });
    }
  };

  // Add a pro or con to an option
  const addProCon = async (optionId: string, proCon: Omit<ProCon, 'id' | 'createdAt'>, isPro: boolean) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('POST', `/api/options/${optionId}/${isPro ? 'pros' : 'cons'}`, proCon);
      // const newProCon = await response.json();
      
      // For now, we'll use update the option locally
      const option = state.options.find(o => o.id === optionId);
      if (!option) {
        throw new Error('Option not found');
      }
      
      const newProCon: ProCon = {
        ...proCon,
        id: `${isPro ? 'pro' : 'con'}-${Date.now()}`,
        createdAt: Date.now()
      };
      
      const updatedOption: DecisionOption = {
        ...option,
        pros: isPro ? [...option.pros, newProCon] : option.pros,
        cons: !isPro ? [...option.cons, newProCon] : option.cons,
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'UPDATE_OPTION', payload: updatedOption });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: `${isPro ? 'Pro' : 'Con'} added successfully`,
      });
      
      return;
    } catch (error) {
      console.error(`Error adding ${isPro ? 'pro' : 'con'} to option ${optionId}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to add ${isPro ? 'pro' : 'con'}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: `Failed to add ${isPro ? 'pro' : 'con'}`,
        variant: 'destructive',
      });
    }
  };

  // Remove a pro or con from an option
  const removeProCon = async (optionId: string, proConId: string, isPro: boolean) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // await apiRequest('DELETE', `/api/options/${optionId}/${isPro ? 'pros' : 'cons'}/${proConId}`);
      
      // For now, we'll update the option locally
      const option = state.options.find(o => o.id === optionId);
      if (!option) {
        throw new Error('Option not found');
      }
      
      const updatedOption: DecisionOption = {
        ...option,
        pros: isPro 
          ? option.pros.filter(p => p.id !== proConId)
          : option.pros,
        cons: !isPro 
          ? option.cons.filter(c => c.id !== proConId)
          : option.cons,
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'UPDATE_OPTION', payload: updatedOption });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: `${isPro ? 'Pro' : 'Con'} removed successfully`,
      });
      
      return;
    } catch (error) {
      console.error(`Error removing ${isPro ? 'pro' : 'con'} from option ${optionId}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to remove ${isPro ? 'pro' : 'con'}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: `Failed to remove ${isPro ? 'pro' : 'con'}`,
        variant: 'destructive',
      });
    }
  };

  // Create a new guided reflection
  const createReflection = async (reflection: Omit<GuidedReflection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('POST', '/api/reflections', reflection);
      // const newReflection = await response.json();
      
      // For now, we'll use mock data
      const newReflection: GuidedReflection = {
        ...reflection,
        id: `reflection-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'ADD_REFLECTION', payload: newReflection });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Reflection added successfully',
      });
      
      return;
    } catch (error) {
      console.error('Error creating reflection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create reflection' });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to create reflection',
        variant: 'destructive',
      });
    }
  };

  // Update an existing reflection
  const updateReflection = async (reflection: Partial<GuidedReflection> & { id: string }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('PATCH', `/api/reflections/${reflection.id}`, reflection);
      // const updatedReflection = await response.json();
      
      // For now, we'll update locally
      const existingReflection = state.reflections.find(r => r.id === reflection.id);
      if (!existingReflection) {
        throw new Error('Reflection not found');
      }
      
      const updatedReflection: GuidedReflection = {
        ...existingReflection,
        ...reflection,
        updatedAt: Date.now()
      };
      
      dispatch({ type: 'UPDATE_REFLECTION', payload: updatedReflection });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Reflection updated successfully',
      });
      
      return;
    } catch (error) {
      console.error(`Error updating reflection ${reflection.id}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to update reflection ${reflection.id}` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to update reflection',
        variant: 'destructive',
      });
    }
  };

  // Generate AI insights for a decision
  const generateInsights = async (decisionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('POST', `/api/decisions/${decisionId}/insights`);
      // const insights = await response.json();
      
      // For now, we'll use mock data
      const newInsights: DecisionInsight[] = [
        {
          id: `insight-${Date.now()}-1`,
          decisionId,
          content: 'Based on your reflections, it appears that the emotional aspects of this decision are significantly outweighing the purely logical factors. Consider how your long-term happiness aligns with each option.',
          type: 'perspective',
          createdAt: Date.now()
        },
        {
          id: `insight-${Date.now()}-2`,
          decisionId,
          content: 'Your pros and cons reveal that short-term challenges (like initial salary reduction) may be overshadowing long-term opportunities. Try evaluating this decision on a 5-year time horizon to see how the balance shifts.',
          type: 'blind_spot',
          createdAt: Date.now()
        },
        {
          id: `insight-${Date.now()}-3`,
          decisionId,
          content: 'Have you considered a hybrid approach? Many financial institutions have technology departments where your domain expertise would be highly valued, potentially offering the best of both worlds.',
          type: 'suggestion',
          createdAt: Date.now()
        }
      ];
      
      dispatch({ type: 'SET_INSIGHTS', payload: [...state.insights, ...newInsights] });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Success',
        description: 'Generated new insights for your decision',
      });
      
      return;
    } catch (error) {
      console.error(`Error generating insights for decision ${decisionId}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to generate insights` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to generate insights',
        variant: 'destructive',
      });
    }
  };

  // Analyze decision and recommend options
  const analyzeDecision = async (decisionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call to analyze the decision
      // and return updated options with scores and recommendations
      // const response = await apiRequest('POST', `/api/decisions/${decisionId}/analyze`);
      // const result = await response.json();
      
      // For now, we'll use mock data and update the options with scores
      const updatedOptions = state.options.map(option => {
        // Simple scoring algorithm for demo purposes
        const totalProWeight = option.pros.reduce((sum, pro) => sum + pro.weight, 0);
        const totalConWeight = option.cons.reduce((sum, con) => sum + con.weight, 0);
        const score = (totalProWeight - totalConWeight * 0.8) / 
                    ((option.pros.length + option.cons.length) || 1);
                    
        return {
          ...option,
          score: parseFloat(score.toFixed(1)),
          isRecommended: option.id === '1-2', // Just for demo
          updatedAt: Date.now()
        };
      });
      
      dispatch({ type: 'SET_OPTIONS', payload: updatedOptions });
      
      // Also update the decision status if it's in draft or analysis
      const decision = state.decisions.find(d => d.id === decisionId);
      if (decision && (decision.status === 'draft' || decision.status === 'analysis')) {
        const updatedDecision = {
          ...decision,
          status: 'evaluation' as const,
          updatedAt: Date.now()
        };
        dispatch({ type: 'UPDATE_DECISION', payload: updatedDecision });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Analysis Complete',
        description: 'Your decision has been analyzed and options have been scored',
      });
      
      return;
    } catch (error) {
      console.error(`Error analyzing decision ${decisionId}:`, error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to analyze decision` });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to analyze decision',
        variant: 'destructive',
      });
    }
  };

  // Fetch available frameworks
  const getFrameworks = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // In a real implementation, this would be an API call:
      // const response = await apiRequest('GET', '/api/frameworks');
      // const frameworks = await response.json();
      
      // For now, we'll use the mock frameworks we already have
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    } catch (error) {
      console.error('Error fetching frameworks:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch frameworks' });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Error',
        description: 'Failed to fetch decision frameworks',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <DecisionFrameworkContext.Provider
      value={{
        state,
        createDecision,
        updateDecision,
        deleteDecision,
        setCurrentDecision,
        createOption,
        updateOption,
        deleteOption,
        addProCon,
        removeProCon,
        createReflection,
        updateReflection,
        generateInsights,
        analyzeDecision,
        getFrameworks,
        loadDecision
      }}
    >
      {children}
    </DecisionFrameworkContext.Provider>
  );
}

// Hook for consuming the decision framework context
export function useDecisionFramework() {
  const context = useContext(DecisionFrameworkContext);
  if (context === undefined) {
    throw new Error('useDecisionFramework must be used within a DecisionFrameworkProvider');
  }
  return context;
}