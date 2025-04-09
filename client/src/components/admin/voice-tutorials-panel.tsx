import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTutorialStore, voiceTutorials, Tutorial } from '@/services/tutorial-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Play, Zap, Book, LucideIcon } from 'lucide-react';

// Voice tutorials panel for the admin page
export function VoiceTutorialsPanel() {
  const { startTutorial, hasCompletedTutorial } = useTutorialStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filter tutorials based on selected category
  const filteredTutorials = selectedCategory 
    ? voiceTutorials.filter(tutorial => tutorial.category === selectedCategory)
    : voiceTutorials;
  
  // Get tutorial icon based on icon name
  const getTutorialIcon = (iconName: string): LucideIcon => {
    switch (iconName) {
      case 'mic':
        return Mic;
      case 'zap':
        return Zap;
      default:
        return Book;
    }
  };
  
  // Group tutorials by difficulty
  const beginnerTutorials = filteredTutorials.filter(tutorial => tutorial.difficulty === 'beginner');
  const intermediateTutorials = filteredTutorials.filter(tutorial => tutorial.difficulty === 'intermediate');
  const advancedTutorials = filteredTutorials.filter(tutorial => tutorial.difficulty === 'advanced');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mic className="h-5 w-5 mr-2 text-primary" />
          Voice Interaction Tutorials
        </CardTitle>
        <CardDescription>
          Configure and manage voice interaction tutorials for users
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger 
              value="all" 
              onClick={() => setSelectedCategory(null)}
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              onClick={() => setSelectedCategory('voice')}
            >
              Voice
            </TabsTrigger>
            <TabsTrigger 
              value="commands" 
              onClick={() => setSelectedCategory('commands')}
            >
              Commands
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              onClick={() => setSelectedCategory('advanced')}
            >
              Advanced
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {renderTutorialsByDifficulty(
              beginnerTutorials, 
              intermediateTutorials, 
              advancedTutorials, 
              startTutorial, 
              hasCompletedTutorial
            )}
          </TabsContent>
          
          <TabsContent value="voice" className="space-y-4">
            {renderTutorialsByDifficulty(
              beginnerTutorials, 
              intermediateTutorials, 
              advancedTutorials, 
              startTutorial, 
              hasCompletedTutorial
            )}
          </TabsContent>
          
          <TabsContent value="commands" className="space-y-4">
            {renderTutorialsByDifficulty(
              beginnerTutorials, 
              intermediateTutorials, 
              advancedTutorials, 
              startTutorial, 
              hasCompletedTutorial
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            {renderTutorialsByDifficulty(
              beginnerTutorials, 
              intermediateTutorials, 
              advancedTutorials, 
              startTutorial, 
              hasCompletedTutorial
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredTutorials.length} tutorials available
        </div>
        
        <Button variant="outline" size="sm">
          Manage Tutorials
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper function to render tutorials grouped by difficulty
function renderTutorialsByDifficulty(
  beginnerTutorials: Tutorial[],
  intermediateTutorials: Tutorial[],
  advancedTutorials: Tutorial[],
  startTutorial: (id: string) => void,
  hasCompletedTutorial: (id: string) => boolean
) {
  return (
    <>
      {beginnerTutorials.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-2">Beginner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {beginnerTutorials.map(tutorial => (
              <TutorialCard 
                key={tutorial.id} 
                tutorial={tutorial}
                onStart={() => startTutorial(tutorial.id)}
                isCompleted={hasCompletedTutorial(tutorial.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {intermediateTutorials.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-2 mt-4">Intermediate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {intermediateTutorials.map(tutorial => (
              <TutorialCard 
                key={tutorial.id} 
                tutorial={tutorial}
                onStart={() => startTutorial(tutorial.id)}
                isCompleted={hasCompletedTutorial(tutorial.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {advancedTutorials.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-2 mt-4">Advanced</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advancedTutorials.map(tutorial => (
              <TutorialCard 
                key={tutorial.id} 
                tutorial={tutorial}
                onStart={() => startTutorial(tutorial.id)}
                isCompleted={hasCompletedTutorial(tutorial.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {beginnerTutorials.length === 0 && 
       intermediateTutorials.length === 0 && 
       advancedTutorials.length === 0 && (
        <div className="flex items-center justify-center h-32 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No tutorials found for this category</p>
        </div>
      )}
    </>
  );
}

// Individual tutorial card component
interface TutorialCardProps {
  tutorial: Tutorial;
  onStart: () => void;
  isCompleted: boolean;
}

function TutorialCard({ tutorial, onStart, isCompleted }: TutorialCardProps) {
  const Icon = getTutorialIcon(tutorial.icon);
  
  return (
    <div className={`border rounded-md p-3 ${isCompleted ? 'border-green-500/50 bg-green-50/20' : 'hover:bg-muted/50'}`}>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-md">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{tutorial.name}</h4>
            {isCompleted && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                Completed
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-1">{tutorial.description}</p>
          
          <div className="mt-3">
            <Button 
              size="sm" 
              variant={isCompleted ? "outline" : "default"}
              onClick={onStart}
              className="flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              {isCompleted ? 'Replay Tutorial' : 'Start Tutorial'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get tutorial icon
function getTutorialIcon(iconName: string): LucideIcon {
  switch (iconName) {
    case 'mic':
      return Mic;
    case 'zap':
      return Zap;
    default:
      return Book;
  }
}