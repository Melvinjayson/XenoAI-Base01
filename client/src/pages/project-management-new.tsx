import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddProjectDialog } from '@/components/project-management/add-project-dialog';
import { TaskUpdateDialog } from '@/components/project-management/task-update-dialog';
import {
  BarChart2, CalendarRange, CheckCircle2, Clock, Lightbulb, Link2,
  Loader2, ListChecks, PauseCircle, PlusCircle, AlertTriangle,
  CheckCircle, XCircle, Home, MessageSquareText, Network, Palette,
  FolderKanban, ChevronRight, Sparkles, TrendingUp, Target
} from 'lucide-react';

function getStatusIcon(status: string) {
  switch (status) {
    case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
    case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'on_hold': return <PauseCircle className="h-5 w-5 text-amber-500" />;
    case 'at_risk': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'on_track': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'off_track': return <XCircle className="h-5 w-5 text-red-500" />;
    default: return null;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'in_progress': return 'text-blue-600 border-blue-600 bg-blue-50';
    case 'completed': return 'text-green-600 border-green-600 bg-green-50';
    case 'on_hold': return 'text-amber-600 border-amber-600 bg-amber-50';
    case 'at_risk': return 'text-red-600 border-red-600 bg-red-50';
    case 'on_track': return 'text-green-600 border-green-600 bg-green-50';
    case 'off_track': return 'text-red-600 border-red-600 bg-red-50';
    case 'not_started': return 'text-gray-600 border-gray-600 bg-gray-50';
    default: return '';
  }
}

function getTaskStatusColor(status: string) {
  switch (status) {
    case 'todo': return 'bg-gray-100 text-gray-700';
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'in_review': return 'bg-purple-100 text-purple-700';
    case 'blocked': return 'bg-red-100 text-red-700';
    case 'done': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'text-red-600 border-red-600';
    case 'medium': return 'text-amber-600 border-amber-600';
    case 'low': return 'text-blue-600 border-blue-600';
    default: return '';
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

const WorkflowNav = () => (
  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 border-b overflow-x-auto whitespace-nowrap">
    <Link href="/">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <MessageSquareText className="h-3 w-3" /> Chat
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/workbench">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <Network className="h-3 w-3" /> Knowledge Graph
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <Link href="/canvas">
      <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
        <Palette className="h-3 w-3" /> Canvas
      </span>
    </Link>
    <ChevronRight className="h-3 w-3 flex-shrink-0" />
    <span className="text-primary font-medium flex items-center gap-1">
      <FolderKanban className="h-3 w-3" /> Projects
    </span>
  </div>
);

function AddTaskDialog({ projectId, open, onOpenChange }: { projectId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${projectId}/tasks`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onOpenChange(false);
      setTitle(''); setDescription(''); setPriority('medium'); setStatus('todo');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="task-title">Title *</Label>
            <Input id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What needs to be done…" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ title, description, priority, status, projectId })}
            disabled={!title.trim() || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddInsightDialog({ projectId, open, onOpenChange, prefillContent }: {
  projectId: number; open: boolean; onOpenChange: (v: boolean) => void; prefillContent?: string;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(prefillContent || '');
  const [source, setSource] = useState('');
  const [confidence, setConfidence] = useState('80');

  useEffect(() => {
    if (prefillContent) setContent(prefillContent);
  }, [prefillContent]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${projectId}/insights`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights', projectId] });
      onOpenChange(false);
      setTitle(''); setContent(''); setSource(''); setConfidence('80');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Research Insight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="insight-title">Title *</Label>
            <Input id="insight-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Insight title…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="insight-content">Content *</Label>
            <Textarea id="insight-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Describe the insight…" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="insight-source">Source</Label>
              <Input id="insight-source" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Chat, Research…" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="insight-conf">Confidence %</Label>
              <Input id="insight-conf" type="number" min="0" max="100" value={confidence} onChange={e => setConfidence(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ title, content, source, confidence: parseInt(confidence), projectId })}
            disabled={!title.trim() || !content.trim() || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Insight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectManagementPage() {
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [taskToUpdate, setTaskToUpdate] = useState<any>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [prefillInsightContent, setPrefillInsightContent] = useState('');

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data: any[]) => data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks', activeProject],
    queryFn: async ({ queryKey }) => {
      const projectId = queryKey[1];
      if (!projectId) return [];
      return apiRequest(`/api/projects/${projectId}/tasks`, 'GET');
    },
    enabled: !!activeProject,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/insights', activeProject],
    queryFn: async ({ queryKey }) => {
      const projectId = queryKey[1];
      if (!projectId) return [];
      return apiRequest(`/api/projects/${projectId}/insights`, 'GET');
    },
    enabled: !!activeProject,
  });

  const taskUpdateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: any }) =>
      apiRequest(`/api/tasks/${taskId}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', activeProject] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setTaskToUpdate(null);
    },
  });

  useEffect(() => {
    if (projects && projects.length > 0 && !activeProject) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProject]);

  const activeProjectData = projects?.find((p: any) => p.id === activeProject);

  const tasksDone = (tasks as any[])?.filter((t: any) => t.status === 'done').length ?? 0;
  const tasksTotal = (tasks as any[])?.length ?? 0;
  const autoProgress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : activeProjectData?.progress ?? 0;

  const handleImportFromChat = () => {
    setPrefillInsightContent('Insight from AI conversation — describe what you learned and why it matters for this project.');
    setShowAddInsight(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <WorkflowNav />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <FolderKanban className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-semibold text-sm leading-tight">Projects</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Track research, tasks, and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleImportFromChat} disabled={!activeProject}>
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">From Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add an insight from your AI conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowAddProject(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r flex-shrink-0 flex flex-col bg-card overflow-hidden hidden md:flex">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projects</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {projectsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : projects && projects.length > 0 ? (
              <ul>
                {(projects as any[]).map((project: any) => (
                  <li key={project.id}>
                    <button
                      onClick={() => setActiveProject(project.id)}
                      className={`flex items-center w-full px-3 py-2.5 text-left border-l-2 hover:bg-muted/60 transition-colors ${
                        activeProject === project.id
                          ? 'border-l-primary bg-muted'
                          : 'border-l-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{project.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <span className="ml-2 flex-shrink-0">{getStatusIcon(project.status)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">No projects yet</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowAddProject(true)}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Create Project
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 border-t">
            <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowAddProject(true)}>
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!activeProjectData ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FolderKanban className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                {projects && (projects as any[]).length > 0
                  ? 'Select a project from the sidebar to view its details.'
                  : 'Create your first project to start tracking tasks and research insights.'}
              </p>
              <Button onClick={() => setShowAddProject(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="space-y-5 max-w-4xl">
              {/* Project Header Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl">{activeProjectData.name}</CardTitle>
                      {activeProjectData.description && (
                        <CardDescription className="mt-1">{activeProjectData.description}</CardDescription>
                      )}
                    </div>
                    <Badge className={getStatusColor(activeProjectData.status)}>
                      {activeProjectData.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                      <p className="text-sm flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(activeProjectData.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                      <p className="text-sm flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(activeProjectData.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Priority</p>
                      <Badge variant="outline" className={getPriorityColor(activeProjectData.priority)}>
                        {activeProjectData.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                      <p className="text-sm font-medium">{tasksDone} / {tasksTotal} done</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{autoProgress}%</span>
                    </div>
                    <Progress value={autoProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="tasks">
                <TabsList className="mb-4">
                  <TabsTrigger value="tasks" className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" />
                    Tasks {tasksTotal > 0 && <span className="ml-1 text-xs bg-muted px-1.5 rounded-full">{tasksTotal}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Insights {(insights as any[])?.length > 0 && <span className="ml-1 text-xs bg-muted px-1.5 rounded-full">{(insights as any[]).length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5" />
                    Analytics
                  </TabsTrigger>
                </TabsList>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Project Tasks</h3>
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAddTask(true)}>
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Task
                    </Button>
                  </div>

                  {tasksLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : tasks && (tasks as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(tasks as any[]).map((task: any) => (
                        <Card key={task.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <Badge className={`text-xs ${getTaskStatusColor(task.status)}`}>{task.status}</Badge>
                                  <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</Badge>
                                  {task.dueDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarRange className="h-3 w-3" />
                                      {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {task.status !== 'done' && (
                                <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => setTaskToUpdate(task)}>
                                  Update
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                      <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-medium mb-1">No tasks yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">Add tasks to track your project progress</p>
                      <Button size="sm" onClick={() => setShowAddTask(true)}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Add First Task
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Insights Tab */}
                <TabsContent value="insights" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Research Insights</h3>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleImportFromChat}>
                              <MessageSquareText className="h-3.5 w-3.5" />
                              From Chat
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Import an insight from your AI conversation</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setPrefillInsightContent(''); setShowAddInsight(true); }}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Insight
                      </Button>
                    </div>
                  </div>

                  {insightsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : insights && (insights as any[]).length > 0 ? (
                    <div className="space-y-3">
                      {(insights as any[]).map((insight: any) => (
                        <Card key={insight.id}>
                          <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-semibold">{insight.title}</CardTitle>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {insight.confidence}% confidence
                              </Badge>
                            </div>
                            {insight.source && (
                              <CardDescription className="text-xs">Source: {insight.source}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            <p className="text-sm text-muted-foreground">{insight.content}</p>
                            {insight.tags && insight.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {insight.tags.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                      <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-medium mb-1">No insights yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Document research insights to guide your project decisions
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleImportFromChat}>
                          <MessageSquareText className="h-3.5 w-3.5 mr-1.5" />
                          From Chat
                        </Button>
                        <Button size="sm" onClick={() => { setPrefillInsightContent(''); setShowAddInsight(true); }}>
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                          Add Insight
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4">
                  <h3 className="font-medium">Project Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Tasks', value: tasksTotal, icon: <ListChecks className="h-5 w-5 text-blue-500" /> },
                      { label: 'Completed', value: tasksDone, icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
                      { label: 'Insights', value: (insights as any[])?.length ?? 0, icon: <Lightbulb className="h-5 w-5 text-amber-500" /> },
                      { label: 'Progress', value: `${autoProgress}%`, icon: <TrendingUp className="h-5 w-5 text-primary" /> },
                    ].map((stat, i) => (
                      <Card key={i}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">{stat.icon}</div>
                          <div>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="text-xl font-bold">{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {tasksTotal > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Task Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {['todo', 'in_progress', 'in_review', 'blocked', 'done'].map(status => {
                            const count = (tasks as any[])?.filter((t: any) => t.status === status).length ?? 0;
                            const pct = tasksTotal > 0 ? Math.round((count / tasksTotal) * 100) : 0;
                            return (
                              <div key={status} className="flex items-center gap-2 text-sm">
                                <span className="w-20 text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
                                <Progress value={pct} className="flex-1 h-2" />
                                <span className="w-6 text-xs text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {tasksTotal === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-10">
                        <BarChart2 className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm text-center">
                          Add tasks to this project to see analytics
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {activeProject && (
        <>
          <AddTaskDialog projectId={activeProject} open={showAddTask} onOpenChange={setShowAddTask} />
          <AddInsightDialog
            projectId={activeProject}
            open={showAddInsight}
            onOpenChange={setShowAddInsight}
            prefillContent={prefillInsightContent}
          />
        </>
      )}

      {taskToUpdate && (
        <Dialog open={!!taskToUpdate} onOpenChange={open => !open && setTaskToUpdate(null)}>
          <TaskUpdateDialog
            task={taskToUpdate}
            onClose={() => setTaskToUpdate(null)}
            onUpdate={(taskId, data) => taskUpdateMutation.mutate({ taskId, data })}
            isUpdating={taskUpdateMutation.isPending}
          />
        </Dialog>
      )}

      <AddProjectDialog open={showAddProject} onOpenChange={setShowAddProject} />
    </div>
  );
}
