import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Plus, 
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActivities, CreateActivityData } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';

export default function Activities() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateActivityData>({
    name: '',
    description: '',
    activity_date: '',
    activity_time: '',
    location: '',
    capacity: undefined,
    registration_enabled: true,
  });

  const { activities, isLoading, createActivity, registerForActivity, unregisterFromActivity } = useActivities();
  const { isAdminOrCoordinator, user } = useAuth();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => null);

  const getActivitiesForDate = (date: Date) => {
    return activities.filter(
      (activity) => isSameDay(new Date(activity.activity_date), date)
    );
  };

  const upcomingActivities = activities.filter(a => a.status === 'upcoming');
  const completedActivities = activities.filter(a => a.status === 'completed');

  const handleCreateActivity = async () => {
    if (!formData.name || !formData.activity_date) return;

    setIsCreating(true);
    const result = await createActivity(formData);
    setIsCreating(false);

    if (result.success) {
      setIsAddDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        activity_date: '',
        activity_time: '',
        location: '',
        capacity: undefined,
        registration_enabled: true,
      });
    }
  };

  const handleRegister = async (activityId: string, isRegistered: boolean) => {
    if (isRegistered) {
      await unregisterFromActivity(activityId);
    } else {
      await registerForActivity(activityId);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Activities
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage BSG activities and events
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Activity</DialogTitle>
                  <DialogDescription>
                    Create a new activity for BSG members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Activity Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activity_date">Date *</Label>
                      <Input
                        id="activity_date"
                        type="date"
                        value={formData.activity_date}
                        onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_time">Time</Label>
                      <Input
                        id="activity_time"
                        type="time"
                        value={formData.activity_time}
                        onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (optional)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateActivity} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Activity'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle>Activity Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddingDays.map((_, index) => (
                  <div key={`padding-${index}`} className="h-20" />
                ))}
                {daysInMonth.map((day) => {
                  const dayActivities = getActivitiesForDate(day);
                  const hasActivities = dayActivities.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-20 p-1 border rounded-lg cursor-pointer transition-all duration-200",
                        isToday(day) && "border-primary bg-primary/5",
                        selectedDate && isSameDay(day, selectedDate) && "border-primary ring-2 ring-primary/20",
                        !isToday(day) && !(selectedDate && isSameDay(day, selectedDate)) && "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      {hasActivities && (
                        <div className="mt-1 space-y-1">
                          {dayActivities.slice(0, 2).map((activity) => (
                            <div
                              key={activity.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate",
                                activity.status === 'upcoming' 
                                  ? "bg-bsg-green/10 text-bsg-green"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {activity.name}
                            </div>
                          ))}
                          {dayActivities.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayActivities.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
              <CardDescription>{upcomingActivities.length} activities scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : upcomingActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No upcoming activities</p>
              ) : (
                upcomingActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-foreground">{activity.name}</h4>
                      <Badge variant="success">Open</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                      </div>
                      {activity.activity_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          {activity.activity_time}
                        </div>
                      )}
                      {activity.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {activity.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        {activity.registered_count || 0}{activity.capacity ? `/${activity.capacity}` : ''} registered
                      </div>
                    </div>
                    {user && (
                      <Button 
                        size="sm" 
                        variant={activity.is_registered ? "outline" : "secondary"} 
                        className="w-full mt-3"
                        onClick={() => handleRegister(activity.id, activity.is_registered || false)}
                      >
                        {activity.is_registered ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Unregister
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Register
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity List Tabs */}
        <Card>
          <Tabs defaultValue="upcoming">
            <CardHeader className="border-b border-border/50 pb-0">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingActivities.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedActivities.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="upcoming" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : upcomingActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No upcoming activities</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 rounded-lg border border-border/50 hover:shadow-card transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{activity.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description || 'No description'}
                            </p>
                          </div>
                          <Badge variant="success">Upcoming</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                          </div>
                          {activity.activity_time && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {activity.activity_time}
                            </div>
                          )}
                          {activity.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {activity.location}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-bsg-green rounded-full"
                                style={{ width: `${((activity.registered_count || 0) / (activity.capacity || 100)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {activity.registered_count || 0}{activity.capacity ? `/${activity.capacity}` : ''}
                            </span>
                          </div>
                          {user && (
                            <Button 
                              size="sm"
                              variant={activity.is_registered ? "outline" : "default"}
                              onClick={() => handleRegister(activity.id, activity.is_registered || false)}
                            >
                              {activity.is_registered ? 'Unregister' : 'Register'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                {completedActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No completed activities</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 rounded-lg border border-border/50 bg-muted/20"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{activity.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description || 'No description'}
                            </p>
                          </div>
                          <Badge variant="inactive">Completed</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {activity.registered_count || 0} attended
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
