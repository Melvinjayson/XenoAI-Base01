import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog } from '@/components/ui/dialog';
import { StickyHeader } from '@/components/ui/sticky-header';
import { TaskUpdateDialog } from '@/components/project-management/task-update-dialog';
import { AddProjectDialog } from '@/components/project-management/add-project-dialog';
import {
  BarChart,
  CalendarRange,
  CheckCircle2,
  Clock,
  Lightbulb,
  Link2,
  Loader2,
  ListChecks,
  PauseCircle,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

function getStatusIcon(status: string) {
  switch (status) {
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'on_hold':
      return <PauseCircle className="h-5 w-5 text-amber-500" />;
    case 'at_risk':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'on_track':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'off_track':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return null;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'in_progress':
      return 'text-blue-600 border-blue-600 bg-blue-50';
    case 'completed':
      return 'text-green-600 border-green-600 bg-green-50';
    case 'on_hold':
      return 'text-amber-600 border-amber-600 bg-amber-50';
    case 'at_risk':
      return 'text-red-600 border-red-600 bg-red-50';
    case 'on_track':
      return 'text-green-600 border-green-600 bg-green-50';
    case 'off_track':
      return 'text-red-600 border-red-600 bg-red-50';
    case 'not_started':
      return 'text-gray-600 border-gray-600 bg-gray-50';
    default:
      return '';
  }
}

function getTaskStatusColor(status: string) {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    case 'in_review':
      return 'bg-purple-100 text-purple-700';
    case 'blocked':
      return 'bg-red-100 text-red-700';
    case 'done':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'text-red-600 border-red-600';
    case 'medium':
      return 'text-amber-600 border-amber-600';
    case 'low':
      return 'text-blue-600 border-blue-600';
    default:
      return '';
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

export default function ProjectManagementPage() {
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [taskToUpdate, setTaskToUpdate] = useState<any>(null);
  const [showAddProject, setShowAddProject] = useState(false);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data) => data.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  });

  // Fetch tasks for the active project
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks', activeProject],
    queryFn: async ({ queryKey }) => {
      const projectId = queryKey[1];
      if (!projectId) return [];
      const res = await apiRequest(`/api/projects/${projectId}/tasks`, 'GET');
      return res;
    },
    enabled: !!activeProject,
  });

  // Fetch research insights for the active project
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/insights', activeProject],
    queryFn: async ({ queryKey }) => {
      const projectId = queryKey[1];
      if (!projectId) return [];
      const res = await apiRequest(`/api/projects/${projectId}/insights`, 'GET');
      return res;
    },
    enabled: !!activeProject,
  });

  // Update task mutation
  const taskUpdateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number, data: any }) => {
      const response = await apiRequest(`/api/tasks/${taskId}`, 'PATCH', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', activeProject] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setTaskToUpdate(null);
    }
  });

  // Set first project as active if none selected
  useEffect(() => {
    if (projects && projects.length > 0 && !activeProject) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProject]);

  const activeProjectData = projects?.find((p) => p.id === activeProject);

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