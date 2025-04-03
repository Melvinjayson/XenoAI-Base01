import React from 'react';
import { Button } from '@/components/ui/button';
import { LightbulbIcon } from 'lucide-react';

export interface SearchSuggestion {
  id: string;
  text: string;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
}

export function SearchSuggestions({ suggestions, onSuggestionClick }: SearchSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center mb-2">
        <LightbulbIcon className="h-4 w-4 text-primary mr-1" />
        <span className="text-xs font-medium text-gray-600">Suggested Follow-ups</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            className="px-3 py-1 h-auto text-xs rounded-full bg-secondary border-0 text-primary hover:bg-primary hover:text-white transition-colors"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion.text}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function SuggestionsGenerator({ query }: { query: string }) {
  // This would typically come from an API, but we're generating locally
  const generateSuggestions = (query: string): SearchSuggestion[] => {
    if (!query.trim()) return [];
    
    // Simple rules-based suggestion generator
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('weather')) {
      return [
        { id: 'weather1', text: 'Weather forecast for tomorrow?' },
        { id: 'weather2', text: 'Will it rain this weekend?' },
        { id: 'weather3', text: 'What\'s the temperature in New York?' }
      ];
    }
    
    if (lowercaseQuery.includes('news')) {
      return [
        { id: 'news1', text: 'Latest technology news?' },
        { id: 'news2', text: 'Breaking news today?' },
        { id: 'news3', text: 'Sports news updates?' }
      ];
    }
    
    if (lowercaseQuery.includes('recipe') || lowercaseQuery.includes('cook') || lowercaseQuery.includes('food')) {
      return [
        { id: 'recipe1', text: 'Easy dinner recipes?' },
        { id: 'recipe2', text: 'Vegetarian meal ideas?' },
        { id: 'recipe3', text: 'How to make pasta from scratch?' }
      ];
    }
    
    // Default suggestions for any query
    return [
      { id: 'default1', text: `Tell me more about ${query}?` },
      { id: 'default2', text: `What are the benefits of ${query}?` },
      { id: 'default3', text: `Compare ${query} with alternatives` }
    ];
  };
  
  return generateSuggestions(query);
}