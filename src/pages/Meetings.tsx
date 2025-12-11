import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, MapPin, Clock, FileText, Trash2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';

export default function Meetings() {
  const { meetings, isLoading, createMeeting, deleteMeeting } = useMeetings();
  const { isAdminOrCoordinator } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    meeting_time: '',
    location: '',
    agenda: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMeeting.mutateAsync(formData);
    setFormData({ title: '', meeting_date: '', meeting_time: '', location: '', agenda: '' });
    setIsDialogOpen(false);
  };

  const upcomingMeetings = meetings.filter(m => !isPast(new Date(m.meeting_date)) || isToday(new Date(m.meeting_date)));
  const pastMeetings = meetings.filter(m => isPast(new Date(m.meeting_date)) && !isToday(new Date(m.meeting_date)));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Meetings</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage meetings</p>
          </div>
          {isAdminOrCoordinator && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Meeting Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={formData.meeting_date}
                      onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                      required
                    />
                    <Input
                      type="time"
                      value={formData.meeting_time}
                      onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                  <Textarea
                    placeholder="Agenda"
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    rows={3}
                  />
                  <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
                    {createMeeting.isPending ? 'Scheduling...' : 'Schedule Meeting'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Meetings</h2>
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No upcoming meetings scheduled
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingMeetings.map((meeting) => (
                <Card key={meeting.id} className="animate-slide-up">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-foreground">{meeting.title}</h3>
                          {isToday(new Date(meeting.meeting_date)) && (
                            <Badge variant="warning">Today</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                          </div>
                          {meeting.meeting_time && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {meeting.meeting_time}
                            </div>
                          )}
                          {meeting.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {meeting.location}
                            </div>
                          )}
                        </div>
                        {meeting.agenda && (
                          <p className="mt-3 text-foreground/80">{meeting.agenda}</p>
                        )}
                      </div>
                      {isAdminOrCoordinator && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteMeeting.mutate(meeting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Past Meetings</h2>
            <div className="grid gap-4">
              {pastMeetings.slice(0, 5).map((meeting) => (
                <Card key={meeting.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">{meeting.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{format(new Date(meeting.meeting_date), 'MMM d, yyyy')}</span>
                          {meeting.location && <span>• {meeting.location}</span>}
                        </div>
                      </div>
                      {meeting.mom_url && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View MoM
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
