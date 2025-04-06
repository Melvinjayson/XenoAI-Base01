
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

export function ProgressTracker() {
  const [studyTime, setStudyTime] = useState(0);
  const [targetTime] = useState(7200); // 2 hours in seconds
  
  useEffect(() => {
    const savedTime = localStorage.getItem("total_study_time");
    if (savedTime) setStudyTime(parseInt(savedTime));
  }, []);

  const progress = Math.min((studyTime / targetTime) * 100, 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Trophy className="w-4 h-4 mr-2" />
          Study Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="mb-2" />
        <div className="text-sm text-muted-foreground">
          {Math.floor(studyTime / 60)} minutes studied
        </div>
      </CardContent>
    </Card>
  );
}
