import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/SecureAvatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useColleges } from '@/hooks/useColleges';
import { format } from 'date-fns';

interface ActivityWithRegistrations {
  id: string;
  name: string;
  activity_date: string;
  status: string;
  registrations: {
    user_id: string;
    registered_at: string;
    profile: {
      first_name: string;
      last_name: string;
      college_name: string | null;
      enrollment_number: string | null;
      whatsapp_number: string | null;
      profile_photo_url: string | null;
    };
  }[];
}

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const { colleges } = useColleges();
  const [activities, setActivities] = useState<ActivityWithRegistrations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('');

  // Get faculty's assigned college
  const facultyCollegeId = profile?.faculty_college_id;
  const facultyCollege = colleges.find(c => c.id === facultyCollegeId);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        // Fetch all activities with registrations
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('id, name, activity_date, status')
          .order('activity_date', { ascending: false });

        if (activitiesError) throw activitiesError;

        // Fetch registrations for each activity
        const activitiesWithRegs = await Promise.all(
          (activitiesData || []).map(async (activity) => {
            const { data: regs, error: regsError } = await supabase
              .from('activity_registrations')
              .select('user_id, registered_at')
              .eq('activity_id', activity.id);

            if (regsError) throw regsError;

            // Fetch profiles for registrations
            const userIds = regs?.map(r => r.user_id) || [];
            let profiles: any[] = [];
            
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name, college_name, enrollment_number, whatsapp_number, profile_photo_url')
                .in('user_id', userIds);
              profiles = profilesData || [];
            }

            const registrations = (regs || []).map(r => ({
              ...r,
              profile: profiles.find(p => p.user_id === r.user_id) || {
                first_name: 'Unknown',
                last_name: '',
                college_name: null,
                enrollment_number: null,
                whatsapp_number: null,
                profile_photo_url: null,
              },
            }));

            return {
              ...activity,
              registrations,
            };
          })
        );

        setActivities(activitiesWithRegs);
        if (activitiesWithRegs.length > 0) {
          setSelectedActivity(activitiesWithRegs[0].id);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const selectedActivityData = activities.find(a => a.id === selectedActivity);

  // Filter registrations based on search and college filter
  const filteredRegistrations = selectedActivityData?.registrations.filter(reg => {
    const matchesSearch = 
      reg.profile.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.profile.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.profile.enrollment_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCollege = 
      collegeFilter === 'all' || 
      reg.profile.college_name === colleges.find(c => c.id === collegeFilter)?.name;

    return matchesSearch && matchesCollege;
  }) || [];

  // Stats
  const totalRegistrations = selectedActivityData?.registrations.length || 0;
  const collegeWiseCount = colleges.reduce((acc, college) => {
    const count = selectedActivityData?.registrations.filter(
      r => r.profile.college_name === college.name
    ).length || 0;
    if (count > 0) acc[college.name] = count;
    return acc;
  }, {} as Record<string, number>);

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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            View activity registrations {facultyCollege ? `for ${facultyCollege.name}` : ''}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold font-display">{activities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Activity Registrations</p>
                  <p className="text-2xl font-bold font-display">{totalRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">College-wise Breakdown</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(collegeWiseCount).slice(0, 3).map(([college, count]) => (
                  <Badge key={college} variant="secondary" className="text-xs">
                    {college.split(' ')[0]}: {count}
                  </Badge>
                ))}
                {Object.keys(collegeWiseCount).length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{Object.keys(collegeWiseCount).length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedActivity} onValueChange={setSelectedActivity} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="w-auto overflow-x-auto">
              {activities.slice(0, 5).map(activity => (
                <TabsTrigger key={activity.id} value={activity.id} className="text-xs">
                  {activity.name.length > 20 ? activity.name.slice(0, 20) + '...' : activity.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* More activities dropdown */}
            {activities.length > 5 && (
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="More activities..." />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {activities.map(activity => (
            <TabsContent key={activity.id} value={activity.id}>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>{activity.name}</CardTitle>
                      <CardDescription>
                        {format(new Date(activity.activity_date), 'PPP')} • 
                        <Badge variant="secondary" className="ml-2">{activity.status}</Badge>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by college" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Colleges</SelectItem>
                          {colleges.map(college => (
                            <SelectItem key={college.id} value={college.id}>
                              {college.short_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-48"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredRegistrations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mb-4 opacity-50" />
                      <p>No registrations found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[250px]">Student</TableHead>
                            <TableHead>Enrollment</TableHead>
                            <TableHead>College</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Registered At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRegistrations.map((reg, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <SecureAvatar
                                    src={reg.profile.profile_photo_url}
                                    fallback={`${reg.profile.first_name[0]}${reg.profile.last_name[0] || ''}`}
                                    className="h-9 w-9"
                                  />
                                  <span className="font-medium">
                                    {reg.profile.first_name} {reg.profile.last_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="px-2 py-1 rounded bg-muted text-sm">
                                  {reg.profile.enrollment_number || '-'}
                                </code>
                              </TableCell>
                              <TableCell className="text-sm">
                                {reg.profile.college_name || '-'}
                              </TableCell>
                              <TableCell>{reg.profile.whatsapp_number || '-'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(reg.registered_at), 'PP')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
