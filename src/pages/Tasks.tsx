import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/SecureAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Loader2,
  MoreHorizontal,
  Upload,
  MessageSquare,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTasks, TASK_CATEGORIES, TASK_TYPES, TASK_STATUSES, CreateTaskData } from '@/hooks/useTasks';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'allotted': return 'secondary';
    case 'in_process': return 'warning';
    case 'in_approval': return 'info';
    case 'approved': return 'success';
    case 'posted': return 'success';
    default: return 'secondary';
  }
};

export default function Tasks() {
  const { tasks, isLoading, createTask, updateTaskStatus, uploadTaskFile, deleteTask, addComment, fetchTaskComments } = useTasks();
  const { members } = useMembers();
  const { isAdminOrCoordinator, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTaskData>({
    name: '',
    description: '',
    category: '',
    task_type: '',
    assigned_to: '',
    due_date: '',
  });

  // Filter members to exclude faculty
  const assignableMembers = members.filter(m => m.role !== 'faculty_coordinator');

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    
    // If not admin, only show own tasks
    const matchesUser = isAdminOrCoordinator || task.assigned_to === user?.id;

    return matchesSearch && matchesStatus && matchesCategory && matchesUser;
  });

  // Get task types for selected category
  const filteredTaskTypes = formData.category 
    ? TASK_TYPES.filter(t => t.category === formData.category)
    : TASK_TYPES;

  const handleCreateTask = async () => {
    if (!formData.name || !formData.category || !formData.task_type || !formData.assigned_to) return;
    setIsCreating(true);
    const result = await createTask(formData);
    setIsCreating(false);
    if (result.success) {
      setIsAddDialogOpen(false);
      setFormData({ name: '', description: '', category: '', task_type: '', assigned_to: '', due_date: '' });
    }
  };

  const handleFileUpload = async (taskId: string, file: File) => {
    setUploadingTaskId(taskId);
    await uploadTaskFile(taskId, file);
    setUploadingTaskId(null);
  };

  const openTaskDetails = async (taskId: string) => {
    setSelectedTask(taskId);
    setIsLoadingComments(true);
    const fetchedComments = await fetchTaskComments(taskId);
    setComments(fetchedComments);
    setIsLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    await addComment(selectedTask, newComment);
    const fetchedComments = await fetchTaskComments(selectedTask);
    setComments(fetchedComments);
    setNewComment('');
  };

  const selectedTaskData = tasks.find(t => t.id === selectedTask);

  // Stats
  const myTasks = tasks.filter(t => t.assigned_to === user?.id);
  const pendingCount = myTasks.filter(t => t.status === 'allotted' || t.status === 'in_process').length;
  const approvalCount = myTasks.filter(t => t.status === 'in_approval').length;
  const completedCount = myTasks.filter(t => t.status === 'approved' || t.status === 'posted').length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Tasks
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdminOrCoordinator ? 'Manage and assign tasks to team members' : 'View and complete your assigned tasks'}
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>Assign a task to a team member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Task Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Task description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(v) => setFormData({ ...formData, category: v, task_type: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Task Type *</Label>
                      <Select 
                        value={formData.task_type} 
                        onValueChange={(v) => setFormData({ ...formData, task_type: v })}
                        disabled={!formData.category}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTaskTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To *</Label>
                    <Select 
                      value={formData.assigned_to} 
                      onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableMembers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.first_name} {m.last_name} ({m.uid})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleCreateTask} 
                    disabled={isCreating || !formData.name || !formData.category || !formData.task_type || !formData.assigned_to}
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold font-display">{isAdminOrCoordinator ? tasks.length : myTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold font-display">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Approval</p>
                  <p className="text-2xl font-bold font-display">{approvalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold font-display">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {TASK_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TASK_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p>No tasks found</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredTasks.map(task => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-1">{task.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TASK_TYPES.find(t => t.value === task.task_type)?.label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openTaskDetails(task.id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {isAdminOrCoordinator && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <SecureAvatar
                      src={task.assignee?.profile_photo_url}
                      fallback={`${task.assignee?.first_name?.[0] || '?'}${task.assignee?.last_name?.[0] || ''}`}
                      className="h-6 w-6"
                      fallbackClassName="text-xs"
                    />
                    <span className="text-sm text-muted-foreground">
                      {task.assignee?.first_name} {task.assignee?.last_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {TASK_STATUSES.find(s => s.value === task.status)?.label}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    {/* Member can upload file when status is allotted or in_process */}
                    {task.assigned_to === user?.id && (task.status === 'allotted' || task.status === 'in_process') && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(task.id, file);
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingTaskId === task.id}
                        >
                          {uploadingTaskId === task.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          Upload
                        </Button>
                      </>
                    )}
                    {task.assigned_to === user?.id && task.status === 'allotted' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => updateTaskStatus(task.id, 'in_process')}
                      >
                        Start Task
                      </Button>
                    )}
                    {/* Admin/Executive can change status */}
                    {isAdminOrCoordinator && (
                      <Select 
                        value={task.status}
                        onValueChange={(v) => updateTaskStatus(task.id, v)}
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Task Details Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedTaskData?.name}</DialogTitle>
              <DialogDescription>
                {TASK_CATEGORIES.find(c => c.value === selectedTaskData?.category)?.label} • 
                {TASK_TYPES.find(t => t.value === selectedTaskData?.task_type)?.label}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTaskData && (
              <div className="space-y-4">
                {selectedTaskData.description && (
                  <p className="text-sm text-muted-foreground">{selectedTaskData.description}</p>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SecureAvatar
                      src={selectedTaskData.assignee?.profile_photo_url}
                      fallback={`${selectedTaskData.assignee?.first_name?.[0] || '?'}${selectedTaskData.assignee?.last_name?.[0] || ''}`}
                      className="h-8 w-8"
                    />
                    <div>
                      <p className="text-sm font-medium">{selectedTaskData.assignee?.first_name} {selectedTaskData.assignee?.last_name}</p>
                      <p className="text-xs text-muted-foreground">Assigned to</p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedTaskData.status)}>
                    {TASK_STATUSES.find(s => s.value === selectedTaskData.status)?.label}
                  </Badge>
                </div>

                {selectedTaskData.file_url && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">File uploaded</span>
                  </div>
                )}

                {/* Comments section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Comments</h4>
                  {isLoadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {comments.map(comment => (
                        <div key={comment.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{comment.user?.first_name} {comment.user?.last_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdminOrCoordinator && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        Send
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
