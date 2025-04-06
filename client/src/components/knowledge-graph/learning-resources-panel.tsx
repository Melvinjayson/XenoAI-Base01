
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, Link as LinkIcon } from "lucide-react";

import { StudyTimer } from "./study-timer";

export function LearningResourcesPanel() {
  return (
    <div className="space-y-4">
      <StudyTimer />
      <ProgressTracker />
      <Card>
        <CardHeader>
          <CardTitle>Learning Resources</CardTitle>
          <CardDescription>Related materials for deeper understanding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <BookOpen className="mr-2 h-4 w-4" />
            Study Guides
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Video className="mr-2 h-4 w-4" />
            Video Tutorials
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            Practice Exercises
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <LinkIcon className="mr-2 h-4 w-4" />
            Related Topics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
