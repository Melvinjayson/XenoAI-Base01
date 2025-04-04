import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CodeSnippetProps {
  code: string;
  language: string;
  title?: string;
  onApplyToCanvas?: (code: string, language: string) => void;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language,
  title,
  onApplyToCanvas
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const displayLanguage = language === 'javascript' ? 'JS' : 
                          language === 'typescript' ? 'TS' :
                          language === 'html' ? 'HTML' :
                          language === 'css' ? 'CSS' :
                          language.toUpperCase();

  return (
    <div className="code-snippet-container my-2 rounded-md overflow-hidden border border-gray-300">
      <div className="code-header bg-gray-800 px-3 py-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-xs text-gray-300 font-mono">
            {title || displayLanguage}
          </span>
        </div>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? 'Copied!' : 'Copy code'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {onApplyToCanvas && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-300 hover:text-white hover:bg-gray-700"
                    onClick={() => onApplyToCanvas(code, language)}
                  >
                    <Code className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply to canvas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="max-h-60 overflow-auto text-xs">
        <SyntaxHighlighter 
          language={language}
          style={tomorrow}
          customStyle={{
            margin: 0,
            padding: '0.75rem',
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeSnippet;