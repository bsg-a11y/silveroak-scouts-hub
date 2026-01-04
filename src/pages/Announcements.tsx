import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Megaphone,
  Calendar,
  Paperclip,
  AlertTriangle,
  Trash2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useAnnouncements, CreateAnnouncementData } from '@/hooks/useAnnouncements';
import { useAuth } from '@/contexts/AuthContext';

export default function Announcements() {
  const { announcements, isLoading, createAnnouncement, deleteAnnouncement } = useAnnouncements();
  const { isAdminOrCoordinator } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: '',
    content: '',
    importance: 'normal',
    expiry_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;
    
    setIsSubmitting(true);
    const result = await createAnnouncement(formData);
    setIsSubmitting(false);
    
    if (result.success) {
      setFormData({ title: '', content: '', importance: 'normal', expiry_date: '' });
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
    }
  };

  const urgentAnnouncements = announcements.filter(a => a.importance === 'urgent');
  const normalAnnouncements = announcements.filter(a => a.importance === 'normal');

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
          {isAdminOrCoordinator && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Post New Announcement</DialogTitle>
                  <DialogDescription>
                    Create a new announcement for all members
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Announcement title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your announcement..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Importance</Label>
                      <Select 
                        value={formData.importance} 
                        onValueChange={(v) => setFormData({ ...formData, importance: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        'Post Announcement'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet.</p>
              {isAdminOrCoordinator && (
                <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                  Post your first announcement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
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
                                  {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <p className="text-foreground/80 leading-relaxed">
                              {announcement.content}
                            </p>
                            <div className="flex items-center gap-4 mt-4">
                              {announcement.attachment_url && (
                                <Button variant="outline" size="sm">
                                  <Paperclip className="h-4 w-4 mr-2" />
                                  View Attachment
                                </Button>
                              )}
                              {announcement.expiry_date && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  Expires: {format(new Date(announcement.expiry_date), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="danger" className="shrink-0">Urgent</Badge>
                            {isAdminOrCoordinator && (
                              <Button 
                                variant="ghost" 
                                size="icon-sm"
                                onClick={() => handleDelete(announcement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Announcements */}
            {normalAnnouncements.length > 0 && (
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
                                  {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <p className="text-foreground/80 leading-relaxed">
                              {announcement.content}
                            </p>
                            <div className="flex items-center gap-4 mt-4">
                              {announcement.attachment_url && (
                                <Button variant="outline" size="sm">
                                  <Paperclip className="h-4 w-4 mr-2" />
                                  View Attachment
                                </Button>
                              )}
                              {announcement.expiry_date && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  Expires: {format(new Date(announcement.expiry_date), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>
                          </div>
                          {isAdminOrCoordinator && (
                            <Button 
                              variant="ghost" 
                              size="icon-sm"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
