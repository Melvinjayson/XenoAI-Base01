import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Code, FileCode } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { toast } from '@/hooks/use-toast';

// Add support for common languages
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/hljs/csharp';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import php from 'react-syntax-highlighter/dist/esm/languages/hljs/php';
import ruby from 'react-syntax-highlighter/dist/esm/languages/hljs/ruby';
import swift from 'react-syntax-highlighter/dist/esm/languages/hljs/swift';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import scss from 'react-syntax-highlighter/dist/esm/languages/hljs/scss';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c++', cpp);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('rb', ruby);
SyntaxHighlighter.registerLanguage('swift', swift);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('scss', scss);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('xml', html);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);

interface CodeSnippetProps {
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
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Normalize language
  const normalizedLanguage = language.toLowerCase().trim();
  
  // Truncate long code for preview
  const isTruncated = code.length > 300 && !expanded;
  const displayedCode = isTruncated ? code.substring(0, 300) + '...' : code;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <Card className="overflow-hidden border border-border bg-background shadow-sm">
      <CardHeader className="p-3 bg-muted flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium flex items-center">
          <FileCode className="w-3.5 h-3.5 mr-1.5" />
          {title}
        </CardTitle>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 max-h-[300px] overflow-auto relative">
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={a11yDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            borderRadius: 0
          }}
        >
          {displayedCode}
        </SyntaxHighlighter>
        
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </CardContent>
      
      <CardFooter className="p-2 flex justify-between bg-muted/50 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {language.toUpperCase()}
        </div>
        
        <div className="flex gap-2">
          {isTruncated && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs py-0 px-2"
              onClick={() => setExpanded(true)}
            >
              Show More
            </Button>
          )}
          
          {onApplyToCanvas && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-7 text-xs py-0 px-2"
              onClick={() => onApplyToCanvas(code, language)}
            >
              <Code className="h-3 w-3 mr-1" />
              Apply to Canvas
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default CodeSnippet;