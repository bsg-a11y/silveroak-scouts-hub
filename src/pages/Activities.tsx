import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock activities data
const mockActivities = [
  {
    id: '1',
    name: 'Tree Plantation Drive',
    description: 'Plant 500 trees in the campus as part of Green Initiative',
    date: '2024-12-15',
    time: '09:00',
    location: 'Campus Garden',
    status: 'upcoming',
    registrationEnabled: true,
    capacity: 100,
    registeredCount: 45,
  },
  {
    id: '2',
    name: 'First Aid Training',
    description: 'Learn essential first aid skills from medical professionals',
    date: '2024-12-18',
    time: '14:00',
    location: 'Seminar Hall A',
    status: 'upcoming',
    registrationEnabled: true,
    capacity: 50,
    registeredCount: 32,
  },
  {
    id: '3',
    name: 'Community Service Day',
    description: 'Visit and serve the local community with food and supplies',
    date: '2024-12-22',
    time: '08:00',
    location: 'Village Outreach Center',
    status: 'upcoming',
    registrationEnabled: true,
    capacity: 80,
    registeredCount: 28,
  },
  {
    id: '4',
    name: 'Leadership Workshop',
    description: 'Develop leadership skills with hands-on activities',
    date: '2024-12-08',
    time: '10:00',
    location: 'Conference Room B',
    status: 'completed',
    registrationEnabled: false,
    capacity: 40,
    registeredCount: 38,
  },
];

export default function Activities() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate padding days for the calendar
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => null);

  const getActivitiesForDate = (date: Date) => {
    return mockActivities.filter(
      (activity) => isSameDay(new Date(activity.date), date)
    );
  };

  const upcomingActivities = mockActivities.filter(a => a.status === 'upcoming');
  const completedActivities = mockActivities.filter(a => a.status === 'completed');

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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Activity
          </Button>
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
                    size="icon-sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon-sm"
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
                  const activities = getActivitiesForDate(day);
                  const hasActivities = activities.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-20 p-1 border rounded-lg cursor-pointer transition-all duration-200",
                        isToday(day) && "border-primary bg-primary/5",
                        selectedDate && isSameDay(day, selectedDate) && "border-primary ring-2 ring-primary/20",
                        !isToday(day) && !selectedDate?.toDateString().includes(day.toDateString()) && "border-border/50 hover:border-primary/30 hover:bg-muted/30"
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
                          {activities.slice(0, 2).map((activity) => (
                            <div
                              key={activity.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate",
                                activity.status === 'upcoming' 
                                  ? "bg-secondary/10 text-secondary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {activity.name}
                            </div>
                          ))}
                          {activities.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{activities.length - 2} more
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
              {upcomingActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{activity.name}</h4>
                    <Badge variant="success">Open</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(activity.date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {activity.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {activity.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {activity.registeredCount}/{activity.capacity} registered
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full mt-3">
                    Register <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
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
                            {activity.description}
                          </p>
                        </div>
                        <Badge variant="success">Upcoming</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(activity.date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {activity.time}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {activity.location}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-secondary rounded-full"
                              style={{ width: `${(activity.registeredCount / (activity.capacity || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {activity.registeredCount}/{activity.capacity}
                          </span>
                        </div>
                        <Button size="sm">Register</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
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
                            {activity.description}
                          </p>
                        </div>
                        <Badge variant="inactive">Completed</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(activity.date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {activity.registeredCount} attended
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
