import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Filter, X, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchFilterOptions } from "@shared/schema";

interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilterOptions) => void;
}

const DEFAULT_FILTERS: SearchFilterOptions = {
  timeRange: "anytime",
  dateRange: {
    from: undefined,
    to: undefined,
  },
  sources: [],
  contentType: [],
  relevance: 50,
  location: "anywhere",
  language: [],
  excludeTerms: [],
  includeTerms: [],
  fileType: [],
  readingLevel: "any",
  sortBy: "relevance",
  minLength: undefined,
  maxLength: undefined,
  verifiedSourcesOnly: false,
};

const TIME_RANGES = [
  { value: "anytime", label: "Anytime" },
  { value: "past_day", label: "Past 24 hours" },
  { value: "past_week", label: "Past week" },
  { value: "past_month", label: "Past month" },
  { value: "past_year", label: "Past year" },
  { value: "custom", label: "Custom range" },
];

const SOURCES = [
  { value: "web", label: "Web" },
  { value: "news", label: "News" },
  { value: "academic", label: "Academic" },
  { value: "books", label: "Books" },
  { value: "videos", label: "Videos" },
];

const CONTENT_TYPES = [
  { value: "article", label: "Articles" },
  { value: "blog", label: "Blog posts" },
  { value: "research", label: "Research papers" },
  { value: "report", label: "Reports" },
  { value: "documentation", label: "Documentation" },
  { value: "tutorial", label: "Tutorials" },
];

const LOCATIONS = [
  { value: "anywhere", label: "Anywhere" },
  { value: "us", label: "United States" },
  { value: "eu", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "latam", label: "Latin America" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

const FILE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "Word Documents" },
  { value: "ppt", label: "Presentations" },
  { value: "xls", label: "Spreadsheets" },
  { value: "txt", label: "Text Files" },
  { value: "html", label: "Web Pages" },
  { value: "json", label: "JSON Files" },
  { value: "csv", label: "CSV Data" },
];

const READING_LEVELS = [
  { value: "any", label: "Any Level" },
  { value: "basic", label: "Basic" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "technical", label: "Technical" },
  { value: "academic", label: "Academic" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date (Newest First)" },
  { value: "date_oldest", label: "Date (Oldest First)" },
  { value: "popularity", label: "Popularity" },
  { value: "authority", label: "Authority" },
];

export function SearchFilters({ isOpen, onClose, onApplyFilters }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilterOptions>(DEFAULT_FILTERS);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const updateFilters = (partialFilters: Partial<SearchFilterOptions>) => {
    setFilters(prev => ({
      ...prev,
      ...partialFilters,
    }));
  };

  // Calculate active filter count
  const countActiveFilters = (filters: SearchFilterOptions): number => {
    let count = 0;
    if (filters.timeRange !== "anytime") count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.sources.length > 0) count++;
    if (filters.contentType.length > 0) count++;
    if (filters.relevance !== 50) count++;
    if (filters.location !== "anywhere") count++;
    if (filters.language && filters.language.length > 0) count++;
    if (filters.excludeTerms && filters.excludeTerms.length > 0) count++;
    if (filters.includeTerms && filters.includeTerms.length > 0) count++;
    if (filters.fileType && filters.fileType.length > 0) count++;
    if (filters.readingLevel && filters.readingLevel !== "any") count++;
    if (filters.sortBy && filters.sortBy !== "relevance") count++;
    if (filters.minLength !== undefined || filters.maxLength !== undefined) count++;
    if (filters.verifiedSourcesOnly) count++;
    
    return count;
  };

  const handleApplyFilters = () => {
    const count = countActiveFilters(filters);
    setActiveFiltersCount(count);
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveFiltersCount(0);
    onApplyFilters(DEFAULT_FILTERS);
  };

  // Generic array toggle function
  const toggleArrayItem = <T extends keyof SearchFilterOptions>(
    key: T, 
    value: string
  ) => {
    setFilters(prev => {
      const array = prev[key] as string[];
      if (!Array.isArray(array)) return prev;
      
      const newArray = array.includes(value)
        ? array.filter(item => item !== value)
        : [...array, value];
      
      return {
        ...prev,
        [key]: newArray,
      };
    });
  };

  // Helper methods for specific filter types
  const toggleSource = (source: string) => toggleArrayItem('sources', source);
  const toggleContentType = (type: string) => toggleArrayItem('contentType', type);
  const toggleLanguage = (lang: string) => toggleArrayItem('language', lang);
  const toggleFileType = (type: string) => toggleArrayItem('fileType', type);
  
  // Helper for adding/removing terms
  const addTerm = (termType: 'includeTerms' | 'excludeTerms', term: string) => {
    if (!term.trim()) return;
    toggleArrayItem(termType, term.trim());
  };
  
  const removeTerm = (termType: 'includeTerms' | 'excludeTerms', term: string) => {
    setFilters(prev => {
      const terms = prev[termType] as string[];
      return {
        ...prev,
        [termType]: terms.filter(t => t !== term)
      };
    });
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 z-50 flex items-start justify-end",
      isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
      "transition-opacity duration-300"
    )}>
      <div className={cn(
        "h-full w-full max-w-md bg-background border-l p-4 overflow-hidden flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full",
        "transition-transform duration-300"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Filter size={18} />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <Accordion type="multiple" defaultValue={["time", "sources", "content", "relevance", "location"]}>
            {/* Time Filter */}
            <AccordionItem value="time">
              <AccordionTrigger>Time Range</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Select 
                    value={filters.timeRange} 
                    onValueChange={(value) => updateFilters({ timeRange: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filters.timeRange === 'custom' && (
                    <div className="pt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange.from ? (
                              filters.dateRange.to ? (
                                <>
                                  {filters.dateRange.from.toLocaleDateString()} - {filters.dateRange.to.toLocaleDateString()}
                                </>
                              ) : (
                                filters.dateRange.from.toLocaleDateString()
                              )
                            ) : (
                              "Pick a date range"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            selected={{
                              from: filters.dateRange.from,
                              to: filters.dateRange.to,
                            }}
                            onSelect={(range) => updateFilters({ 
                              dateRange: {
                                from: range?.from,
                                to: range?.to,
                              }
                            })}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sources Filter */}
            <AccordionItem value="sources">
              <AccordionTrigger>Sources</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {SOURCES.map(source => (
                    <div key={source.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`source-${source.value}`}
                        checked={filters.sources.includes(source.value)}
                        onCheckedChange={() => toggleSource(source.value)}
                      />
                      <label 
                        htmlFor={`source-${source.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {source.label}
                      </label>
                    </div>
                  ))}
                  
                  <div className="pt-2 flex items-center">
                    <Switch
                      id="verified-sources"
                      checked={filters.verifiedSourcesOnly}
                      onCheckedChange={(checked) => updateFilters({ verifiedSourcesOnly: checked })}
                    />
                    <label htmlFor="verified-sources" className="ml-2 text-sm cursor-pointer">
                      Verified sources only
                    </label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Content Type Filter */}
            <AccordionItem value="content">
              <AccordionTrigger>Content Type</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {CONTENT_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`content-${type.value}`}
                        checked={filters.contentType.includes(type.value)}
                        onCheckedChange={() => toggleContentType(type.value)}
                      />
                      <label 
                        htmlFor={`content-${type.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Keywords Filter */}
            <AccordionItem value="keywords">
              <AccordionTrigger>Keywords</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Include terms */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Must include these terms:</label>
                    
                    {/* Display added terms */}
                    {filters.includeTerms && filters.includeTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {filters.includeTerms.map(term => (
                          <Badge variant="secondary" key={term} className="p-1 gap-1">
                            {term}
                            <X 
                              size={14} 
                              className="cursor-pointer ml-1" 
                              onClick={() => removeTerm('includeTerms', term)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Add term input */}
                    <div className="flex gap-2">
                      <Input 
                        id="include-term-input"
                        placeholder="Add term"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTerm('includeTerms', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const input = document.getElementById('include-term-input') as HTMLInputElement;
                          if (input) {
                            addTerm('includeTerms', input.value);
                            input.value = '';
                          }
                        }}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Exclude terms */}
                  <div className="pt-3">
                    <label className="text-sm font-medium mb-1 block">Exclude these terms:</label>
                    
                    {/* Display excluded terms */}
                    {filters.excludeTerms && filters.excludeTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {filters.excludeTerms.map(term => (
                          <Badge variant="outline" key={term} className="p-1 gap-1 text-destructive border-destructive">
                            {term}
                            <X 
                              size={14} 
                              className="cursor-pointer ml-1" 
                              onClick={() => removeTerm('excludeTerms', term)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Add exclusion term input */}
                    <div className="flex gap-2">
                      <Input 
                        id="exclude-term-input"
                        placeholder="Exclude term"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTerm('excludeTerms', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const input = document.getElementById('exclude-term-input') as HTMLInputElement;
                          if (input) {
                            addTerm('excludeTerms', input.value);
                            input.value = '';
                          }
                        }}
                      >
                        <Minus size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Language Filter */}
            <AccordionItem value="language">
              <AccordionTrigger>Language</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {LANGUAGES.map(lang => (
                    <div key={lang.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`lang-${lang.value}`}
                        checked={filters.language?.includes(lang.value)}
                        onCheckedChange={() => toggleLanguage(lang.value)}
                      />
                      <label 
                        htmlFor={`lang-${lang.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {lang.label}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* File Type Filter */}
            <AccordionItem value="filetype">
              <AccordionTrigger>File Type</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {FILE_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`filetype-${type.value}`}
                        checked={filters.fileType?.includes(type.value)}
                        onCheckedChange={() => toggleFileType(type.value)}
                      />
                      <label 
                        htmlFor={`filetype-${type.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Relevance Filter */}
            <AccordionItem value="relevance">
              <AccordionTrigger>Relevance</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-5 px-1">
                  <Slider
                    defaultValue={[filters.relevance]}
                    max={100}
                    step={10}
                    onValueChange={(values) => updateFilters({ relevance: values[0] })}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Broader results</span>
                    <span className="text-foreground font-medium">
                      {filters.relevance}%
                    </span>
                    <span>Exact matches</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Advanced Options */}
            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced Options</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Reading Level */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Reading Level</label>
                    <Select 
                      value={filters.readingLevel} 
                      onValueChange={(value) => updateFilters({ readingLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reading level" />
                      </SelectTrigger>
                      <SelectContent>
                        {READING_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Content Length */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Content Length (words)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Minimum</label>
                        <Input
                          type="number"
                          placeholder="Min words"
                          value={filters.minLength !== undefined ? String(filters.minLength) : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            updateFilters({ minLength: value });
                          }}
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Maximum</label>
                        <Input
                          type="number"
                          placeholder="Max words"
                          value={filters.maxLength !== undefined ? String(filters.maxLength) : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            updateFilters({ maxLength: value });
                          }}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Sort Order */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sort Results By</label>
                    <Select 
                      value={filters.sortBy} 
                      onValueChange={(value) => updateFilters({ sortBy: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sorting method" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Location Filter */}
            <AccordionItem value="location">
              <AccordionTrigger>Location</AccordionTrigger>
              <AccordionContent>
                <Select 
                  value={filters.location} 
                  onValueChange={(value) => updateFilters({ location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(location => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>

        <div className="pt-4 flex gap-2 border-t mt-4">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Reset
          </Button>
          <Button className="flex-1" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}