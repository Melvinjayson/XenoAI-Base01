import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircleQuestion, 
  Lightbulb, 
  Sparkles, 
  Book, 
  Speech, 
  BookMarked,
  Search,
  Bot,
  PenLine,
  ThumbsUp
} from 'lucide-react';
import { useCompanion } from '@/context/companion-context';

interface CompanionHelpDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CompanionHelpDialog({
  open,
  onOpenChange,
  trigger
}: CompanionHelpDialogProps) {
  const { setShowHelpOnStartup } = useCompanion();
  const [currentTab, setCurrentTab] = useState('overview');
  const [showDontShowAgain, setShowDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if this is not the first time opening
    const hasSeenHelp = localStorage.getItem('companion_has_seen_help');
    if (hasSeenHelp) {
      setShowDontShowAgain(true);
    } else {
      localStorage.setItem('companion_has_seen_help', 'true');
    }
  }, []);

  const handleDontShowAgain = () => {
    // Use the context method instead of directly setting localStorage
    setShowHelpOnStartup(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            <span>Welcome to Xeno AI</span>
          </DialogTitle>
          <DialogDescription>
            Your intelligent assistant for research and discovery
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-4 grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="tips">Tips & Tricks</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-1">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  What is Xeno AI?
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Xeno AI is your intelligent assistant for research, discovery, and knowledge exploration. 
                  It helps you navigate complex information, creates visual knowledge graphs, and provides 
                  context-aware assistance.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-start gap-2">
                    <Search className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Intelligent Search</p>
                      <p className="text-muted-foreground">Find relevant information quickly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <PenLine className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Smart Note-Taking</p>
                      <p className="text-muted-foreground">Organize your thoughts with AI assistance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Knowledge Visualization</p>
                      <p className="text-muted-foreground">See connections between ideas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Speech className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Natural Conversation</p>
                      <p className="text-muted-foreground">Interact using natural language</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Getting Started
                </h3>
                <ol className="space-y-2 text-sm pl-5 list-decimal">
                  <li>Type your question or research topic in the chat input</li>
                  <li>Use voice commands by clicking the microphone button</li>
                  <li>Explore the knowledge graph to see connections</li>
                  <li>Create mind maps and project workspaces</li>
                  <li>Save and export your research findings</li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <Speech className="h-4 w-4 text-primary" />
                    Voice Assistant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Xeno AI responds to voice commands and can read responses aloud.
                    Activate by clicking the microphone button.
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <BookMarked className="h-4 w-4 text-primary" />
                    Knowledge Graphs
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize relationships between concepts. Knowledge graphs 
                    update as you research and learn more about a topic.
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <PenLine className="h-4 w-4 text-primary" />
                    Interactive Canvas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Brainstorm ideas with AI assistance on an interactive canvas.
                    Draw connections and organize concepts visually.
                  </p>
                </div>

                <div className="border rounded-lg p-3">
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-primary" />
                    Your AI Companion
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Access quick help and features through the companion character.
                    Customize its appearance and behavior in settings.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tips" className="mt-0 space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Tips & Shortcuts
                </h3>
                
                <div className="grid gap-3">
                  <div className="bg-primary/5 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Ask follow-up questions</h4>
                    <p className="text-xs text-muted-foreground">
                      Xeno remembers your conversation context, so you can ask follow-up 
                      questions without repeating information.
                    </p>
                  </div>
                  
                  <div className="bg-primary/5 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Use clear, specific queries</h4>
                    <p className="text-xs text-muted-foreground">
                      For best results, ask specific questions rather than general ones.
                      Example: "What causes acid rain?" instead of "Tell me about rain."
                    </p>
                  </div>
                  
                  <div className="bg-primary/5 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Keyboard shortcuts</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                      <div className="flex justify-between">
                        <span>Send message</span>
                        <span className="text-muted-foreground">Enter</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New line</span>
                        <span className="text-muted-foreground">Shift+Enter</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Voice input</span>
                        <span className="text-muted-foreground">Alt+M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clear chat</span>
                        <span className="text-muted-foreground">Alt+C</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4 text-primary" />
                  Best Practices
                </h3>
                <ul className="space-y-1 text-sm pl-5 list-disc">
                  <li>Provide feedback to improve responses</li>
                  <li>Use the knowledge graph to explore related concepts</li>
                  <li>Try different search terms if you don't get helpful results</li>
                  <li>Save important findings for later reference</li>
                  <li>Combine voice and text for efficient interaction</li>
                </ul>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center mt-4 pt-2 border-t">
          {showDontShowAgain && (
            <Button variant="outline" size="sm" onClick={handleDontShowAgain}>
              Don't show on startup
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {currentTab !== 'overview' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const tabs = ['overview', 'features', 'tips'];
                  const currentIndex = tabs.indexOf(currentTab);
                  setCurrentTab(tabs[currentIndex - 1]);
                }}
              >
                Previous
              </Button>
            )}
            
            {currentTab !== 'tips' ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => {
                  const tabs = ['overview', 'features', 'tips'];
                  const currentIndex = tabs.indexOf(currentTab);
                  setCurrentTab(tabs[currentIndex + 1]);
                }}
              >
                Next
              </Button>
            ) : (
              <DialogClose asChild>
                <Button size="sm">Get Started</Button>
              </DialogClose>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}