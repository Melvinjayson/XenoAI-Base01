import { useState, useEffect } from "react";
import { Plus, ListFilter, MoreVertical, Search, Check, ChevronDown, ChevronRight, Calendar, Flame, Clock, Target, Trash, PenLine, Upload, FileEdit, ChevronUp, AlertCircle, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useChat } from "@/context/chat-context";
import StickyHeader from "@/components/ui/sticky-header";

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  progress: number;
  owner: string;
  metadata: { 
    tags?: string[]; 
    color?: string 
  };
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: number;
  projectId: number;
  milestoneId: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  assignee: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ResearchInsight {
  id: number;
  projectId: number;
  title: string;
  content: string;
  source: string | null;
  confidence: number;
  tags: string[];
  metadata: {
    linkedEntityIds?: string[];
    relevantTasks?: number[];
    benchmarks?: Record<string, string>;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

// Helper functions for UI
function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'in progress':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'completed':
      return <Check className="w-4 h-4 text-green-500" />;
    case 'not started':
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    case 'on hold':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'in progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'not started':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'on hold':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getTaskStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'todo':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'in progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'done':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'blocked':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'review':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '—';
  return format(new Date(dateString), 'MMM d, yyyy');
}

// Project Creation Dialog
function CreateProjectDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
    startDate: null as string | null,
    dueDate: null as string | null,
  });
  
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('/api/projects', 'POST', {
        ...formData,
        progress: 0,
        owner: 'Current User'
      });
      
      toast({
        title: "Success",
        description: "Project created successfully",
        variant: "default",
      });
      
      // Refresh projects list
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to your workspace. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Project Name</label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">Start Date</label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.startDate ? formatDate(formData.startDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate ? new Date(formData.startDate) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, startDate: date ? date.toISOString() : null }));
                      setStartDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.dueDate ? formatDate(formData.dueDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, dueDate: date ? date.toISOString() : null }));
                      setDueDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Task Dialog
function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  projectId 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    startDate: null as string | null,
    dueDate: null as string | null,
    estimatedHours: null as number | null,
  });
  
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('/api/tasks', 'POST', {
        ...formData,
        projectId,
        assignee: null,
        milestoneId: null,
        actualHours: null
      });
      
      toast({
        title: "Success",
        description: "Task created successfully",
        variant: "default",
      });
      
      // Refresh tasks list
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId.toString()] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Task Title</label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter task title"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
              <label htmlFor="estimatedHours" className="text-sm font-medium">Est. Hours</label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours !== null ? formData.estimatedHours : ''}
                onChange={(e) => handleChange('estimatedHours', e.target.value ? Number(e.target.value) : null)}
                placeholder="Hours"
              />
            </div>
            
            <div className="space-y-2 col-span-1">
              <label htmlFor="startDate" className="text-sm font-medium">Start Date</label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    {formData.startDate ? formatDate(formData.startDate) : <span className="text-sm">Select</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate ? new Date(formData.startDate) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, startDate: date ? date.toISOString() : null }));
                      setStartDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2 col-span-1">
              <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    {formData.dueDate ? formatDate(formData.dueDate) : <span className="text-sm">Select</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, dueDate: date ? date.toISOString() : null }));
                      setDueDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Research Insight Dialog
function AddResearchInsightDialog({ 
  open, 
  onOpenChange, 
  projectId 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    source: '',
    confidence: 0.8,
    tags: [] as string[],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('/api/research-insights', 'POST', {
        ...formData,
        projectId,
        metadata: {}
      });
      
      toast({
        title: "Success",
        description: "Research insight added successfully",
        variant: "default",
      });
      
      // Refresh insights list
      queryClient.invalidateQueries({ queryKey: ['/api/research-insights', projectId.toString()] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding insight:", error);
      toast({
        title: "Error",
        description: "Failed to add research insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Research Insight</DialogTitle>
          <DialogDescription>
            Add research findings, observations, or analysis to your project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter insight title"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">Content</label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Enter insight details"
              rows={5}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="source" className="text-sm font-medium">Source (Optional)</label>
            <Input
              id="source"
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              placeholder="Enter source URL or reference"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="confidence" className="text-sm font-medium">Confidence Level: {Math.round(formData.confidence * 100)}%</label>
            <Input
              id="confidence"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.confidence}
              onChange={(e) => handleChange('confidence', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">Tags</label>
            <div className="flex items-center gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tags"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" size="sm" onClick={handleAddTag}>Add</Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <Badge key={tag} className="flex items-center gap-1 pl-2 pr-1 py-1">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 rounded-full"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Add Insight'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectManagementPage(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [insights, setInsights] = useState<ResearchInsight[]>([]);
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { analyzeConversationForCommands } = useChat();
  
  useEffect(() => {
    // Fetch projects data
    const fetchProjects = async () => {
      try {
        const data = await apiRequest('/api/projects');
        setProjects(data);
        
        // Set the first project as active if none is selected
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0].id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects data",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  useEffect(() => {
    // Fetch tasks when active project changes
    if (activeProject) {
      const fetchTasks = async () => {
        try {
          const data = await apiRequest(`/api/tasks?projectId=${activeProject}`);
          setTasks(data);
        } catch (error) {
          console.error("Error fetching tasks:", error);
        }
      };
      
      const fetchInsights = async () => {
        try {
          const data = await apiRequest(`/api/research-insights?projectId=${activeProject}`);
          setInsights(data);
        } catch (error) {
          console.error("Error fetching research insights:", error);
        }
      };
      
      fetchTasks();
      fetchInsights();
    }
  }, [activeProject]);
  
  const activeProjectData = projects?.find((p: Project) => p.id === activeProject);

  return (
    <div className="min-h-screen flex flex-col">
      <StickyHeader 
        title="Project Management" 
        subtitle="Organize your research projects and track progress"
        rightContent={
          <Button onClick={() => setShowCreateProject(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />
      
      <div className="flex flex-col md:flex-row flex-1 gap-6 p-4 md:p-6">
        {/* Projects List */}
        <div className="w-full md:w-72 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Projects</CardTitle>
              <CardDescription>
                Manage your research projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {projects?.map((project: Project) => (
                  <Button
                    key={project.id}
                    variant={activeProject === project.id ? "default" : "ghost"}
                    className={cn("w-full justify-start mb-1", 
                      activeProject === project.id ? "bg-primary text-primary-foreground" : ""
                    )}
                    onClick={() => setActiveProject(project.id)}
                  >
                    <div className="flex items-center w-full overflow-hidden">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ 
                        backgroundColor: project.metadata?.color || '#6b7280' 
                      }} />
                      <span className="truncate">{project.name}</span>
                      <Badge className={cn("ml-auto text-xs", getStatusColor(project.status))}>
                        {project.status}
                      </Badge>
                    </div>
                  </Button>
                ))}
                
                {projects?.length === 0 && !loading && (
                  <div className="text-center py-6 text-gray-500">
                    <p className="mb-2">No projects yet</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCreateProject(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project
                    </Button>
                  </div>
                )}
                
                {loading && (
                  <div className="py-6 space-y-2">
                    <div className="h-10 bg-gray-200 animate-pulse rounded-md" />
                    <div className="h-10 bg-gray-200 animate-pulse rounded-md" />
                    <div className="h-10 bg-gray-200 animate-pulse rounded-md" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Project Details */}
        <div className="flex-1">
          {activeProjectData ? (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{activeProjectData.name}</CardTitle>
                      <CardDescription>
                        {activeProjectData.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Upload className="mr-2 h-4 w-4" />
                          Export Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Status</span>
                      <div className="flex items-center">
                        {getStatusIcon(activeProjectData.status)}
                        <span className="ml-1">{activeProjectData.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Priority</span>
                      <div className="flex items-center">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="ml-1">{activeProjectData.priority}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Start Date</span>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="ml-1">{formatDate(activeProjectData.startDate)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Due Date</span>
                      <div className="flex items-center">
                        <Target className="w-4 h-4 text-gray-500" />
                        <span className="ml-1">{formatDate(activeProjectData.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress: {activeProjectData.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2" 
                        style={{ width: `${activeProjectData.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="insights">Research Insights</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tasks" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Tasks</h3>
                    <Button onClick={() => setShowAddTask(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {tasks.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 border rounded-md">
                        <p className="mb-2">No tasks yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddTask(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Task
                        </Button>
                      </div>
                    ) : (
                      tasks.map((task: Task) => (
                        <Card key={task.id} className="overflow-hidden">
                          <div className="flex items-center p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge className={cn("text-xs", getTaskStatusColor(task.status))}>
                                  {task.status}
                                </Badge>
                                <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </Badge>
                                
                                {insights?.some((i: ResearchInsight) => i.metadata && 'relevantTasks' in i.metadata && Array.isArray(i.metadata.relevantTasks) && i.metadata.relevantTasks.includes(task.id)) && (
                                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">
                                    Has Insights
                                  </Badge>
                                )}
                              </div>
                              
                              {task.description && (
                                <p className="text-gray-500 text-sm">{task.description}</p>
                              )}
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {task.dueDate && (
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Due: {formatDate(task.dueDate)}
                                  </div>
                                )}
                                
                                {task.estimatedHours !== null && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Est: {task.estimatedHours}h
                                  </div>
                                )}
                                
                                {task.assignee && (
                                  <div className="flex items-center">
                                    <Avatar className="w-4 h-4 mr-1">
                                      <div className="bg-primary text-[8px] flex items-center justify-center text-primary-foreground font-medium">
                                        {task.assignee.charAt(0).toUpperCase()}
                                      </div>
                                    </Avatar>
                                    {task.assignee}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <PenLine className="mr-2 h-4 w-4" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Check className="mr-2 h-4 w-4" />
                                  Mark as Done
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="insights" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Research Insights</h3>
                    <Button onClick={() => setShowAddInsight(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Insight
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {insights.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 border rounded-md">
                        <p className="mb-2">No research insights yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddInsight(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Insight
                        </Button>
                      </div>
                    ) : (
                      insights.map((insight: ResearchInsight) => (
                        <Accordion type="single" collapsible key={insight.id}>
                          <AccordionItem value={`insight-${insight.id}`} className="border rounded-lg overflow-hidden">
                            <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                              <div className="flex items-center gap-2 w-full text-left">
                                <h4 className="font-medium">{insight.title}</h4>
                                <div className="flex items-center gap-1 ml-auto mr-4">
                                  {insight.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {insight.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{insight.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-2">
                              <p className="text-gray-700 mb-4">{insight.content}</p>
                              
                              <div className="flex flex-wrap gap-2 mb-4">
                                {insight.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-4">
                                  {insight.source && (
                                    <a href={insight.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Source
                                    </a>
                                  )}
                                  
                                  <div>
                                    Confidence: {Math.round(insight.confidence * 100)}%
                                  </div>
                                  
                                  <div>
                                    Added: {formatDate(insight.createdAt)}
                                  </div>
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <FileEdit className="mr-2 h-4 w-4" />
                                      Edit Insight
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Export
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete Insight
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="mt-4">
                  <div className="text-center py-12 text-gray-500 border rounded-md">
                    <h4 className="font-medium mb-2">Timeline View Coming Soon</h4>
                    <p className="text-sm max-w-md mx-auto">
                      This feature is under development. You'll soon be able to visualize your project 
                      timeline with milestones, tasks, and key research insights.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              {loading ? (
                <div className="space-y-4 w-full max-w-2xl">
                  <div className="h-12 bg-gray-200 animate-pulse rounded-md w-1/2" />
                  <div className="h-64 bg-gray-200 animate-pulse rounded-md" />
                  <div className="h-40 bg-gray-200 animate-pulse rounded-md" />
                </div>
              ) : (
                <div className="text-center p-6 border rounded-lg max-w-md">
                  <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                  <p className="text-gray-500 mb-4">
                    Select a project from the sidebar or create a new one to get started with your research.
                  </p>
                  <Button onClick={() => setShowCreateProject(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Project
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      {showCreateProject && (
        <CreateProjectDialog 
          open={showCreateProject} 
          onOpenChange={setShowCreateProject} 
        />
      )}
      
      {showAddTask && activeProject && (
        <CreateTaskDialog 
          open={showAddTask} 
          onOpenChange={setShowAddTask} 
          projectId={activeProject}
        />
      )}
      
      {showAddInsight && activeProject && (
        <AddResearchInsightDialog
          open={showAddInsight}
          onOpenChange={setShowAddInsight}
          projectId={activeProject}
        />
      )}
    </div>
  );
}