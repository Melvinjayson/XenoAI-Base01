import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code as CodeIcon, ExternalLink } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

export interface CodeSnippetProps {
  code: string;
  language: string;
  title?: string;
  onApplyToCanvas?: (code: string, language: string) => void;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language,
  title = 'Code Snippet',
  onApplyToCanvas
}) => {
  const [copied, setCopied] = React.useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleApplyToCanvas = () => {
    if (onApplyToCanvas) {
      onApplyToCanvas(code, language);
    }
  };
  
  // Determine language display name
  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'React JSX',
      'ts': 'TypeScript',
      'tsx': 'React TSX',
      'py': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'go': 'Go',
      'ruby': 'Ruby',
      'php': 'PHP',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'rust': 'Rust',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'yaml': 'YAML',
      'markdown': 'Markdown',
      'sql': 'SQL',
      'shell': 'Shell',
      'bash': 'Bash',
      'powershell': 'PowerShell',
      'text': 'Plain Text'
    };
    
    return languageMap[lang.toLowerCase()] || lang;
  };

  return (
    <Card className="w-full shadow-md border overflow-hidden">
      <CardHeader className="p-3 bg-primary/10 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CodeIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">
            {title}
            <span className="text-xs ml-2 text-muted-foreground">
              {getLanguageDisplayName(language)}
            </span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <EnhancedTooltip content="Copy code">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyToClipboard}
              className="h-7 w-7"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </EnhancedTooltip>
          
          {onApplyToCanvas && (
            <EnhancedTooltip content="Add to canvas">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleApplyToCanvas}
                className="h-7 w-7"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </EnhancedTooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-96 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={nord}
          showLineNumbers
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.9rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </CardContent>
      <CardFooter className="p-2 flex justify-between bg-gray-50 text-xs text-gray-500">
        <span>{code.split('\n').length} lines</span>
        <span>{code.length} characters</span>
      </CardFooter>
    </Card>
  );
};

export default CodeSnippet;