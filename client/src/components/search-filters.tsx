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
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SearchFilterOptions {
  timeRange: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  sources: string[];
  contentType: string[];
  relevance: number;
  location: string;
}

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

export function SearchFilters({ isOpen, onClose, onApplyFilters }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilterOptions>(DEFAULT_FILTERS);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const updateFilters = (partialFilters: Partial<SearchFilterOptions>) => {
    setFilters(prev => ({
      ...prev,
      ...partialFilters,
    }));
  };

  const handleApplyFilters = () => {
    // Count active filters
    let count = 0;
    if (filters.timeRange !== "anytime") count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.sources.length > 0) count++;
    if (filters.contentType.length > 0) count++;
    if (filters.relevance !== 50) count++;
    if (filters.location !== "anywhere") count++;
    
    setActiveFiltersCount(count);
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveFiltersCount(0);
    onApplyFilters(DEFAULT_FILTERS);
  };

  // Toggle source selection
  const toggleSource = (source: string) => {
    setFilters(prev => {
      const newSources = prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source];
      
      return {
        ...prev,
        sources: newSources,
      };
    });
  };

  // Toggle content type selection
  const toggleContentType = (type: string) => {
    setFilters(prev => {
      const newTypes = prev.contentType.includes(type)
        ? prev.contentType.filter(t => t !== type)
        : [...prev.contentType, type];
      
      return {
        ...prev,
        contentType: newTypes,
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