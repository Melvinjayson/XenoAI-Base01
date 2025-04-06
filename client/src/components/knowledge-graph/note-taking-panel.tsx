
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";

export function NoteTakingPanel() {
  const [notes, setNotes] = useState("");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Take notes while you study..."
          className="min-h-[200px] mb-2"
        />
        <Button className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Notes
        </Button>
      </CardContent>
    </Card>
  );
}
