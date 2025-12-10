import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  FileText,
  PackageSearch,
  Bell,
  Plus,
  ArrowRight,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useActivities } from '@/hooks/useActivities';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { activities, isLoading: activitiesLoading } = useActivities();
  const { announcements, isLoading: announcementsLoading } = useAnnouncements();
  const { leaveRequests, updateLeaveStatus, isLoading: leavesLoading } = useLeaveRequests();
  const { profile, isAdminOrCoordinator } = useAuth();

  const upcomingActivities = activities.filter(a => a.status === 'upcoming').slice(0, 3);
  const recentAnnouncements = announcements.slice(0, 3);
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').slice(0, 3);

  const statCards = [
    { 
      label: 'Total Members', 
      value: stats.totalMembers, 
      change: `${stats.activeMembers} active`,
      icon: Users,
      color: 'primary',
    },
    { 
      label: 'Upcoming Activities', 
      value: stats.upcomingActivities, 
      change: 'Scheduled events',
      icon: Calendar,
      color: 'secondary',
    },
    { 
      label: 'Pending Leaves', 
      value: stats.pendingLeaveRequests, 
      change: 'Requires action',
      icon: FileText,
      color: 'warning',
    },
    { 
      label: 'Low Stock Items', 
      value: stats.lowStockItems, 
      change: 'Check inventory',
      icon: PackageSearch,
      color: 'destructive',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Welcome back, {profile?.first_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with BSG today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/announcements')}>
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </Button>
            {isAdminOrCoordinator && (
              <Button size="sm" onClick={() => navigate('/members')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} variant="stat">
                <CardContent className="p-5">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-8 bg-muted rounded w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, index) => (
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
                      <p className="text-xs font-medium text-muted-foreground">
                        {stat.change}
                      </p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl",
                      stat.color === 'primary' && "bg-primary/10 text-primary",
                      stat.color === 'secondary' && "bg-bsg-green/10 text-bsg-green",
                      stat.color === 'warning' && "bg-amber-500/10 text-amber-500",
                      stat.color === 'destructive' && "bg-destructive/10 text-destructive"
                    )}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Activities */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Upcoming Activities</CardTitle>
                <CardDescription>Scheduled events and programs</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/activities')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : upcomingActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No upcoming activities</p>
              ) : (
                <div className="space-y-4">
                  {upcomingActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-bsg-green/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-bsg-green" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(activity.activity_date), 'MMM d, yyyy')} 
                            {activity.activity_time && ` • ${activity.activity_time}`}
                            {activity.location && ` • ${activity.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="success">{activity.registered_count || 0} registered</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Announcements</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/announcements')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No announcements</p>
              ) : (
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
                            {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Leave Requests (Admin only) */}
        {isAdminOrCoordinator && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
                  <CardDescription>Requires your action</CardDescription>
                </div>
                <Badge variant="warning">{pendingLeaves.length} pending</Badge>
              </CardHeader>
              <CardContent>
                {leavesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : pendingLeaves.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending requests</p>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div 
                        key={leave.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                      >
                        <div>
                          <p className="font-medium text-foreground">{leave.user_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {leave.user_uid} • {format(new Date(leave.from_date), 'MMM d')} to {format(new Date(leave.to_date), 'MMM d')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="success"
                            onClick={() => updateLeaveStatus(leave.id, 'approved')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendance Overview</CardTitle>
                <CardDescription>This month's attendance statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Attendance</span>
                    <span className="text-2xl font-bold font-display text-bsg-green">
                      {stats.attendancePercentage || 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-bsg-green transition-all duration-500" 
                      style={{ width: `${stats.attendancePercentage || 0}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold font-display text-foreground">
                        {stats.upcomingActivities}
                      </p>
                      <p className="text-xs text-muted-foreground">Activities</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold font-display text-foreground">
                        {stats.totalMembers}
                      </p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold font-display text-foreground">
                        {stats.activeMembers}
                      </p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
