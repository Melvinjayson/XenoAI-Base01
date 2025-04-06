
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Tag, Check } from "lucide-react";

export function NoteTakingPanel() {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saveStatus, setSaveStatus] = useState("saved");
  
  // Auto-save effect
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (saveStatus === "unsaved") {
        handleSave();
      }
    }, 2000);
    
    return () => clearTimeout(saveTimer);
  }, [notes]);

  const handleSave = () => {
    localStorage.setItem("study_notes", notes);
    localStorage.setItem("note_tags", JSON.stringify(tags));
    setSaveStatus("saved");
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setSaveStatus("unsaved");
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Study Notes
          <span className="text-sm text-muted-foreground">
            {saveStatus === "saved" ? <Check className="w-4 h-4 text-green-500" /> : "Saving..."}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            className="flex-1"
          />
          <Button variant="outline" onClick={addTag}>
            <Tag className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <span key={tag} className="bg-secondary px-2 py-1 rounded-md text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Take notes while you study..."
          className="min-h-[200px] mb-2"
        />
        <Button className="w-full" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Notes
        </Button>
      </CardContent>
    </Card>
  );
}
