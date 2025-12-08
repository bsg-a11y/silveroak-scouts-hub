import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Megaphone,
  Calendar,
  Paperclip,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock announcements data
const mockAnnouncements = [
  {
    id: '1',
    title: 'Uniform Distribution Schedule',
    content: 'All members are requested to collect their uniforms from the BSG office between 10 AM to 4 PM. Please bring your UID card and a copy of your enrollment receipt. Distribution will be done in batches according to your enrollment number.',
    importance: 'urgent',
    expiryDate: '2024-12-20',
    createdAt: '2024-12-08',
    createdBy: 'Admin',
    hasAttachment: true,
  },
  {
    id: '2',
    title: 'Annual Camp Registration Open',
    content: 'Registration for the Annual Scout Camp 2024 is now open. The camp will be held from January 5-10, 2024 at Saputara. Limited seats available. Register early to confirm your spot.',
    importance: 'normal',
    expiryDate: '2024-12-25',
    createdAt: '2024-12-07',
    createdBy: 'Institute Coordinator',
    hasAttachment: false,
  },
  {
    id: '3',
    title: 'New Badge Requirements Updated',
    content: 'The requirements for earning the Community Service Badge have been updated. Members are advised to check the new guidelines on the notice board. The changes will be effective from January 1, 2025.',
    importance: 'normal',
    expiryDate: null,
    createdAt: '2024-12-05',
    createdBy: 'Admin',
    hasAttachment: true,
  },
  {
    id: '4',
    title: 'Holiday Notice - Christmas Break',
    content: 'The BSG office will remain closed from December 24, 2024 to January 1, 2025 for Christmas and New Year holidays. All pending requests will be processed after the office reopens.',
    importance: 'normal',
    expiryDate: '2024-12-24',
    createdAt: '2024-12-03',
    createdBy: 'Admin',
    hasAttachment: false,
  },
];

export default function Announcements() {
  const urgentAnnouncements = mockAnnouncements.filter(a => a.importance === 'urgent');
  const normalAnnouncements = mockAnnouncements.filter(a => a.importance === 'normal');

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Announcements
            </h1>
            <p className="text-muted-foreground mt-1">
              Important notices and updates
            </p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Post Announcement
          </Button>
        </div>

        {/* Urgent Announcements */}
        {urgentAnnouncements.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Urgent Notices</h2>
            </div>
            <div className="grid gap-4">
              {urgentAnnouncements.map((announcement) => (
                <Card 
                  key={announcement.id}
                  className="border-destructive/30 bg-destructive/5"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-destructive/10">
                            <Megaphone className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">
                              {announcement.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Posted by {announcement.createdBy} • {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <p className="text-foreground/80 leading-relaxed">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                          {announcement.hasAttachment && (
                            <Button variant="outline" size="sm">
                              <Paperclip className="h-4 w-4 mr-2" />
                              View Attachment
                            </Button>
                          )}
                          {announcement.expiryDate && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Expires: {format(new Date(announcement.expiryDate), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="danger" className="shrink-0">Urgent</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular Announcements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">All Announcements</h2>
          <div className="grid gap-4">
            {normalAnnouncements.map((announcement, index) => (
              <Card 
                key={announcement.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Megaphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">
                            {announcement.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Posted by {announcement.createdBy} • {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <p className="text-foreground/80 leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-4">
                        {announcement.hasAttachment && (
                          <Button variant="outline" size="sm">
                            <Paperclip className="h-4 w-4 mr-2" />
                            View Attachment
                          </Button>
                        )}
                        {announcement.expiryDate && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Expires: {format(new Date(announcement.expiryDate), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
