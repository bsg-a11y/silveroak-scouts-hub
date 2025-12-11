import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Award, Download, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useCertificates } from '@/hooks/useCertificates';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';

export default function Certificates() {
  const { certificates, isLoading, createCertificate, deleteCertificate } = useCertificates();
  const { members } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    event_name: '',
    user_id: '',
    issue_date: '',
    certificate_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCertificate.mutateAsync(formData);
    setFormData({ name: '', event_name: '', user_id: '', issue_date: '', certificate_url: '' });
    setIsDialogOpen(false);
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.uid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Certificates</h1>
            <p className="text-muted-foreground mt-1">Manage member certificates and achievements</p>
          </div>
          {isAdminOrCoordinator && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Issue Certificate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Issue New Certificate</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Certificate Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Event Name"
                    value={formData.event_name}
                    onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                    required
                  />
                  <Select
                    value={formData.user_id}
                    onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.user_id}>
                          {m.first_name} {m.last_name} ({m.uid})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Certificate URL (optional)"
                    value={formData.certificate_url}
                    onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                  />
                  <Button type="submit" className="w-full" disabled={createCertificate.isPending}>
                    {createCertificate.isPending ? 'Issuing...' : 'Issue Certificate'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Certificates Grid */}
        {filteredCertificates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No certificates found matching your search' : 'No certificates issued yet'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCertificates.map((cert, index) => (
              <Card 
                key={cert.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-accent/10">
                      <Award className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{cert.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{cert.event_name}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Issued to: </span>
                          <span className="font-medium">
                            {cert.profile?.first_name} {cert.profile?.last_name}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">UID: </span>
                          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                            {cert.profile?.uid}
                          </code>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(cert.issue_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    {cert.certificate_url && (
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                    {isAdminOrCoordinator && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteCertificate.mutate(cert.id)}
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
    </DashboardLayout>
  );
}
