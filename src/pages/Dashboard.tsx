import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  PackageSearch,
  TrendingUp,
  FileText,
  ArrowRight,
  Bell,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for dashboard
const stats = [
  { 
    label: 'Total Members', 
    value: '247', 
    change: '+12 this month',
    icon: Users,
    color: 'primary',
    trend: 'up'
  },
  { 
    label: 'Upcoming Activities', 
    value: '8', 
    change: 'Next: Tree Plantation',
    icon: Calendar,
    color: 'secondary',
    trend: 'neutral'
  },
  { 
    label: 'Pending Leave Requests', 
    value: '5', 
    change: 'Requires action',
    icon: FileText,
    color: 'warning',
    trend: 'attention'
  },
  { 
    label: 'Low Stock Items', 
    value: '3', 
    change: 'Uniforms, Badges',
    icon: PackageSearch,
    color: 'destructive',
    trend: 'down'
  },
];

const upcomingActivities = [
  { id: 1, name: 'Tree Plantation Drive', date: 'Dec 15, 2024', time: '9:00 AM', location: 'Campus Garden', registered: 45 },
  { id: 2, name: 'First Aid Training', date: 'Dec 18, 2024', time: '2:00 PM', location: 'Seminar Hall', registered: 32 },
  { id: 3, name: 'Community Service', date: 'Dec 22, 2024', time: '8:00 AM', location: 'Village Outreach', registered: 28 },
];

const recentAnnouncements = [
  { id: 1, title: 'Uniform Distribution Schedule', importance: 'urgent', date: 'Dec 8, 2024' },
  { id: 2, title: 'Annual Camp Registration Open', importance: 'normal', date: 'Dec 7, 2024' },
  { id: 3, title: 'New Badge Requirements Updated', importance: 'normal', date: 'Dec 5, 2024' },
];

const pendingLeaves = [
  { id: 1, name: 'Rahul Sharma', uid: 'BSG045', from: 'Dec 10', to: 'Dec 12', reason: 'Family function' },
  { id: 2, name: 'Priya Patel', uid: 'BSG078', from: 'Dec 11', to: 'Dec 11', reason: 'Medical appointment' },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Welcome back, Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with BSG today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label} 
              variant="stat"
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold font-display text-foreground">
                      {stat.value}
                    </p>
                    <p className={cn(
                      "text-xs font-medium",
                      stat.trend === 'up' && "text-secondary",
                      stat.trend === 'attention' && "text-accent",
                      stat.trend === 'down' && "text-destructive",
                      stat.trend === 'neutral' && "text-muted-foreground"
                    )}>
                      {stat.change}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl",
                    stat.color === 'primary' && "bg-primary/10 text-primary",
                    stat.color === 'secondary' && "bg-secondary/10 text-secondary",
                    stat.color === 'warning' && "bg-accent/10 text-accent",
                    stat.color === 'destructive' && "bg-destructive/10 text-destructive"
                  )}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Activities */}
          <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Upcoming Activities</CardTitle>
                <CardDescription>Scheduled events and programs</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.date} • {activity.time} • {activity.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">{activity.registered} registered</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Announcements</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div 
                    key={announcement.id}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      {announcement.importance === 'urgent' && (
                        <span className="w-2 h-2 rounded-full bg-destructive mt-2 animate-pulse" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {announcement.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Leave Requests */}
          <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
                <CardDescription>Requires your action</CardDescription>
              </div>
              <Badge variant="warning">{pendingLeaves.length} pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div 
                    key={leave.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium text-foreground">{leave.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {leave.uid} • {leave.from} to {leave.to}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Reject</Button>
                      <Button size="sm" variant="success">Approve</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="animate-slide-up" style={{ animationDelay: '700ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Overview</CardTitle>
              <CardDescription>This month's attendance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Attendance</span>
                  <span className="text-2xl font-bold font-display text-secondary">87%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[87%] rounded-full bg-secondary" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold font-display text-foreground">12</p>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold font-display text-foreground">8</p>
                    <p className="text-xs text-muted-foreground">Meetings</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold font-display text-foreground">215</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
