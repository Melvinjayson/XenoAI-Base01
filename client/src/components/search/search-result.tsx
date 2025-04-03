import React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Source {
  name: string;
  url: string;
  snippet?: string;
}

export interface SearchResultProps {
  content: string;
  sources: Source[];
  loading?: boolean;
}

export function SearchResult({ content, sources, loading = false }: SearchResultProps) {
  if (loading) {
    return <SearchResultSkeleton />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      
      {sources.length > 0 && (
        <>
          <Separator />
          <div className="p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Sources</h3>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <SourceItem key={index} source={source} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SourceItem({ source }: { source: Source }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-medium">
        {source.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline truncate"
          >
            {source.name}
          </a>
          <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </div>
        
        {source.snippet && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.snippet}</p>
        )}
      </div>
    </div>
  );
}

function SearchResultSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      <Separator />
      
      <div className="p-4 bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-gray-300 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}