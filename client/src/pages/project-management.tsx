import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
  PlusCircle,
  Loader2,
  CalendarRange,
  BarChart,
  ListChecks,
  Lightbulb,
  Link2,
  Plus,
  ChevronLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { StickyHeader } from '@/components/ui/sticky-header';
import { TaskUpdateDialog } from '@/components/project-management/task-update-dialog';
import { AddProjectDialog } from '@/components/project-management/add-project-dialog';
import { format } from 'date-fns';
// Define custom interfaces for demo data
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

interface ResearchInsight {
  id: number;
  projectId: number;
  title: string;
  content: string;
  source: string | null;
  confidence: number;
  tags: string[];
  metadata: any; // Using any for demo data
  createdAt: string;
  updatedAt: string;
}

// Demo data for initial render
const demoProjects: Project[] = [
  {
    id: 1,
    name: 'Knowledge Graph Enhancement',
    description: 'Improve the visual representation and navigation of knowledge graphs',
    status: 'in_progress',
    priority: 'high',
    startDate: new Date(2025, 3, 1).toISOString(),
    dueDate: new Date(2025, 4, 15).toISOString(),
    completedDate: null,
    progress: 35,
    owner: 'user1',
    metadata: { tags: ['visualization', 'UX', 'graph'], color: '#6B4BFF' },
    createdAt: new Date(2025, 3, 1).toISOString(),
    updatedAt: new Date(2025, 3, 3).toISOString(),
  },
  {
    id: 2,
    name: 'Voice Interaction Optimization',
    description: 'Enhance the voice recognition and speech synthesis capabilities',
    status: 'at_risk',
    priority: 'critical',
    startDate: new Date(2025, 3, 5).toISOString(),
    dueDate: new Date(2025, 3, 20).toISOString(),
    completedDate: null,
    progress: 15,
    owner: 'user1',
    metadata: { tags: ['voice', 'speech', 'interaction'], color: '#FF5630' },
    createdAt: new Date(2025, 3, 5).toISOString(),
    updatedAt: new Date(2025, 3, 7).toISOString(),
  },
  {
    id: 3,
    name: 'Multi-language Support',
    description: 'Add support for additional languages with accurate translations',
    status: 'on_track',
    priority: 'medium',
    startDate: new Date(2025, 2, 15).toISOString(),
    dueDate: new Date(2025, 4, 30).toISOString(),
    completedDate: null,
    progress: 60,
    owner: 'user1',
    metadata: { tags: ['localization', 'translation', 'global'], color: '#00C2FF' },
    createdAt: new Date(2025, 2, 15).toISOString(),
    updatedAt: new Date(2025, 3, 2).toISOString(),
  },
];

const demoTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    milestoneId: null,
    title: 'Implement zoom and pan controls',
    description: 'Add intuitive zoom and pan controls for the knowledge graph view',
    status: 'in_progress',
    priority: 'high',
    startDate: new Date(2025, 3, 1).toISOString(),
    dueDate: new Date(2025, 3, 10).toISOString(),
    completedDate: null,
    assignee: 'user1',
    estimatedHours: 8,
    actualHours: 4,
    createdAt: new Date(2025, 3, 1).toISOString(),
    updatedAt: new Date(2025, 3, 3).toISOString(),
  },
  {
    id: 2,
    projectId: 1,
    milestoneId: null,
    title: 'Redesign node appearance',
    description: 'Update the visual design of nodes to improve clarity and information density',
    status: 'todo',
    priority: 'medium',
    startDate: null,
    dueDate: new Date(2025, 3, 15).toISOString(),
    completedDate: null,
    assignee: 'user1',
    estimatedHours: 6,
    actualHours: 0,
    createdAt: new Date(2025, 3, 1).toISOString(),
    updatedAt: new Date(2025, 3, 1).toISOString(),
  },
  {
    id: 3,
    projectId: 2,
    milestoneId: null,
    title: 'Fix voice interaction timeout issues',
    description: 'Resolve the bug causing voice responses to time out after prolonged usage',
    status: 'blocked',
    priority: 'critical',
    startDate: new Date(2025, 3, 5).toISOString(),
    dueDate: new Date(2025, 3, 12).toISOString(),
    completedDate: null,
    assignee: 'user1',
    estimatedHours: 5,
    actualHours: 3,
    createdAt: new Date(2025, 3, 5).toISOString(),
    updatedAt: new Date(2025, 3, 7).toISOString(),
  },
];

const demoInsights: ResearchInsight[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Graph visualization best practices',
    content: 'Research shows that users can only effectively process 7±2 nodes at a time. Implementing progressive disclosure and focused views could improve comprehension.',
    source: 'Nielsen Norman Group',
    confidence: 85,
    tags: ['UX Research', 'Visualization', 'Cognitive Load'],
    metadata: { 
      linkedEntityIds: ['node1', 'node2'],
      relevantTasks: [1, 2]
    },
    createdAt: new Date(2025, 3, 2).toISOString(),
    updatedAt: new Date(2025, 3, 2).toISOString(),
  },
  {
    id: 2,
    projectId: 2,
    title: 'Speech synthesis latency factors',
    content: 'Analysis of modern TTS systems shows that network conditions account for 68% of voice response delays. Implementing client-side caching and predictive loading could reduce perceived latency.',
    source: 'Internal testing',
    confidence: 72,
    tags: ['Performance', 'Voice UX', 'Latency'],
    metadata: {
      benchmarks: {
        'average_response_time': '1.8s',
        'p95_response_time': '3.2s'
      },
      relevantTasks: [3]
    },
    createdAt: new Date(2025, 3, 6).toISOString(),
    updatedAt: new Date(2025, 3, 6).toISOString(),
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'on_track':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'at_risk':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'off_track':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'in_progress':
      return <Hourglass className="h-5 w-5 text-blue-500" />;
    case 'not_started':
      return <Clock className="h-5 w-5 text-gray-500" />;
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'on_track':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'at_risk':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
    case 'off_track':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'not_started':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    case 'completed':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
}

function getTaskStatusColor(status: string) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'todo':
      return 'bg-gray-100 text-gray-800';
    case 'in_review':
      return 'bg-purple-100 text-purple-800';
    case 'blocked':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-blue-100 text-blue-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

// This component has been moved to its own file in /components/project-management/task-update-dialog.tsx

export default function ProjectManagementPage() {
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [taskToUpdate, setTaskToUpdate] = useState<Task | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const { toast } = useToast();
  
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      // Connect to the real API
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });
  
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks', activeProject],
    queryFn: async () => {
      // Connect to the real API
      const response = await fetch(`/api/tasks${activeProject ? `?projectId=${activeProject}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!activeProject,
  });
  
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/research-insights', activeProject],
    queryFn: async () => {
      // Connect to the real API
      const response = await fetch(`/api/research-insights${activeProject ? `?projectId=${activeProject}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    enabled: !!activeProject,
  });
  
  // Task update mutation
  const taskUpdateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: Partial<Task> }) => {
      const response = await apiRequest(`/api/tasks/${taskId}`, 'PATCH', data);
      return response;
    },
    onSuccess: () => {
      // Close the dialog and show success message
      setTaskToUpdate(null);
      toast({
        title: 'Task updated',
        description: 'The task status has been updated successfully.',
      });
      
      // Invalidate the tasks query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', activeProject] });
      
      // Also invalidate the projects query to refresh progress
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (projects && projects.length > 0 && !activeProject) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProject]);

  const activeProjectData = projects?.find(p => p.id === activeProject);

  return (
    <div className="min-h-screen flex flex-col">
      <StickyHeader 
        title="Project Management" 
        subtitle="Track research projects, tasks, and insights"
        showHomeButton
        rightContent={
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowAddProject(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        }
      />
      
      <div className="container mx-auto py-6 px-4 md:px-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                Select a project to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {projectsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ul className="text-sm">
                  {projects?.map((project) => (
                    <li key={project.id}>
                      <button
                        onClick={() => setActiveProject(project.id)}
                        className={`flex items-center w-full px-4 py-3 hover:bg-muted text-left border-l-4 ${
                          activeProject === project.id
                            ? 'border-l-primary bg-muted'
                            : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex-grow">
                          <div className="font-medium">{project.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getStatusColor(project.status)}>
                              {project.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {project.progress}% complete
                            </span>
                          </div>
                        </div>
                        {getStatusIcon(project.status)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter className="pt-3">
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowAddProject(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-3">
          {!activeProjectData ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-center">
                <h3 className="text-xl font-medium mb-2">No Project Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a project from the sidebar or create a new one to get started
                </p>
                <Button onClick={() => setShowAddProject(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{activeProjectData.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {activeProjectData.description}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(activeProjectData.status)}>
                      {activeProjectData.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground mb-1">
                        Start Date
                      </span>
                      <span className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        {formatDate(activeProjectData.startDate)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground mb-1">
                        Due Date
                      </span>
                      <span className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        {formatDate(activeProjectData.dueDate)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground mb-1">
                        Priority
                      </span>
                      <Badge variant="outline" className={getPriorityColor(activeProjectData.priority)}>
                        {activeProjectData.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        Progress: {activeProjectData.progress || 0}%
                      </span>
                      <span className="text-muted-foreground">
                        {(activeProjectData.progress || 0) < 100 ? 'In progress' : 'Completed'}
                      </span>
                    </div>
                    <Progress value={activeProjectData.progress || 0} />
                  </div>
                </CardContent>
              </Card>

              {/* Project Content Tabs */}
              <Tabs defaultValue="tasks">
                <TabsList className="mb-4">
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Research Insights
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">Project Tasks</h3>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>

                  {tasksLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : tasks && tasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {tasks.map((task) => (
                        <Card key={task.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              <div className="flex-grow">
                                <h4 className="font-medium">{task.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge className={getTaskStatusColor(task.status)}>
                                    {task.status}
                                  </Badge>
                                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                      <CalendarRange className="h-3 w-3" />
                                      Due: {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3 md:mt-0">
                                {task.status !== 'done' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setTaskToUpdate(task)}
                                  >
                                    Update
                                  </Button>
                                )}
                                {insights?.some(i => i.metadata && 'relevantTasks' in i.metadata && Array.isArray(i.metadata.relevantTasks) && i.metadata.relevantTasks.includes(task.id)) && (
                                  <Button variant="outline" size="icon" className="h-8 w-8" title="View linked insights">
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted rounded-md">
                      <h4 className="text-lg font-medium mb-2">No tasks yet</h4>
                      <p className="text-muted-foreground mb-4">
                        Create your first task to start tracking progress
                      </p>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Research Insights Tab */}
                <TabsContent value="insights" className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">Research Insights</h3>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Insight
                    </Button>
                  </div>

                  {insightsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : insights && insights.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {insights.map((insight) => (
                        <Card key={insight.id}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between">
                              <CardTitle className="text-lg">{insight.title}</CardTitle>
                              <Badge variant="outline">
                                Confidence: {insight.confidence}%
                              </Badge>
                            </div>
                            {insight.source && (
                              <CardDescription>Source: {insight.source}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{insight.content}</p>
                            
                            {insight.tags && insight.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {insight.tags.map((tag, i) => (
                                  <Badge key={i} variant="secondary">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="flex justify-between pt-0">
                            <span className="text-xs text-muted-foreground">
                              Created: {formatDate(insight.createdAt)}
                            </span>
                            
                            {insight.metadata && 'relevantTasks' in insight.metadata && 
                              Array.isArray(insight.metadata.relevantTasks) && 
                              insight.metadata.relevantTasks.length > 0 && (
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                  <Link2 className="h-3 w-3" />
                                  <span>{insight.metadata.relevantTasks.length} Linked Tasks</span>
                                </Button>
                              )}
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted rounded-md">
                      <h4 className="text-lg font-medium mb-2">No research insights yet</h4>
                      <p className="text-muted-foreground mb-4">
                        Add research insights to inform your project decisions
                      </p>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Research Insight
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Analytics</CardTitle>
                      <CardDescription>
                        Track progress and performance metrics for this project
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                      <div className="text-center py-8">
                        <BarChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h4 className="text-lg font-medium mb-2">Analytics Dashboard</h4>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Detailed analytics will be available here in the next update, showing task completion rates, insight impact, and project velocity metrics.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Task Update Dialog */}
      {taskToUpdate && (
        <Dialog open={!!taskToUpdate} onOpenChange={(open) => !open && setTaskToUpdate(null)}>
          <TaskUpdateDialog
            task={taskToUpdate}
            onClose={() => setTaskToUpdate(null)}
            onUpdate={(taskId, data) => taskUpdateMutation.mutate({ taskId, data })}
            isUpdating={taskUpdateMutation.isPending}
          />
        </Dialog>
      )}

      {/* Add Project Dialog */}
      <AddProjectDialog 
        open={showAddProject} 
        onOpenChange={setShowAddProject} 
      />
    </div>
  );
}