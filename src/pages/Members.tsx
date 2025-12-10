import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Loader2,
  Copy,
} from 'lucide-react';
import { useMembers, CreateMemberData } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  executive: 'Executive',
  core: 'Core Committee',
  member: 'Member',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Members() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ uid: string; password: string } | null>(null);
  const [formData, setFormData] = useState<CreateMemberData>({
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: '',
    course_duration: '',
    college_name: 'Silver Oak University',
    current_semester: undefined,
    enrollment_number: '',
    whatsapp_number: '',
    blood_group: '',
    role: 'member',
  });
  
  const { members, isLoading, createMember, toggleMemberStatus, deleteMember } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const { toast } = useToast();

  const filteredMembers = members.filter(
    (member) =>
      member.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.enrollment_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'admin' | 'coordinator' | 'executive' | 'core' | 'member'> = {
      admin: 'admin',
      coordinator: 'coordinator',
      executive: 'executive',
      core: 'core',
      member: 'member',
    };
    return variants[role] || 'member';
  };

  const handleCreateMember = async () => {
    if (!formData.first_name || !formData.last_name) {
      toast({
        title: 'Validation Error',
        description: 'First name and last name are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const result = await createMember(formData);
    setIsCreating(false);

    if (result.success) {
      setCreatedCredentials({ uid: result.uid!, password: result.password! });
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        gender: '',
        course_duration: '',
        college_name: 'Silver Oak University',
        current_semester: undefined,
        enrollment_number: '',
        whatsapp_number: '',
        blood_group: '',
        role: 'member',
      });
    }
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`UID: ${createdCredentials.uid}\nPassword: ${createdCredentials.password}`);
      toast({ title: 'Credentials copied to clipboard' });
    }
  };

  const handleExport = () => {
    const csv = [
      ['UID', 'Name', 'Enrollment', 'Semester', 'WhatsApp', 'Blood Group', 'Status', 'Role'].join(','),
      ...filteredMembers.map(m => [
        m.uid,
        `${m.first_name} ${m.middle_name || ''} ${m.last_name}`.trim(),
        m.enrollment_number || '',
        m.current_semester || '',
        m.whatsapp_number || '',
        m.blood_group || '',
        m.status,
        m.role || 'member',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bsg_members.csv';
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Member Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize BSG members
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {isAdminOrCoordinator && (
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) setCreatedCredentials(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {createdCredentials ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Member Created Successfully!</DialogTitle>
                        <DialogDescription>
                          Save these credentials - the password cannot be recovered.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">UID:</span>
                          <code className="bg-background px-2 py-1 rounded">{createdCredentials.uid}</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Password:</span>
                          <code className="bg-background px-2 py-1 rounded">{createdCredentials.password}</code>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={copyCredentials}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Credentials
                        </Button>
                        <Button onClick={() => {
                          setCreatedCredentials(null);
                          setIsAddDialogOpen(false);
                        }}>
                          Done
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                        <DialogDescription>
                          Fill in the member details. UID will be auto-generated.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">First Name *</Label>
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="middle_name">Middle Name</Label>
                          <Input
                            id="middle_name"
                            value={formData.middle_name}
                            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Last Name *</Label>
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gender</Label>
                          <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="enrollment_number">Enrollment Number</Label>
                          <Input
                            id="enrollment_number"
                            value={formData.enrollment_number}
                            onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="current_semester">Current Semester</Label>
                          <Input
                            id="current_semester"
                            type="number"
                            min={1}
                            max={8}
                            value={formData.current_semester || ''}
                            onChange={(e) => setFormData({ ...formData, current_semester: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                          <Input
                            id="whatsapp_number"
                            value={formData.whatsapp_number}
                            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Blood Group</Label>
                          <Select value={formData.blood_group} onValueChange={(v) => setFormData({ ...formData, blood_group: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOOD_GROUPS.map(bg => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Role</Label>
                          <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="core">Core Committee</SelectItem>
                              <SelectItem value="executive">Executive Committee</SelectItem>
                              <SelectItem value="coordinator">Institute Coordinator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateMember} disabled={isCreating}>
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Member'
                          )}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold font-display">{members.length}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold font-display text-bsg-green">
                {members.filter(m => m.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold font-display text-muted-foreground">
                {members.filter(m => m.status === 'inactive').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Committee</p>
              <p className="text-2xl font-bold font-display text-primary">
                {members.filter(m => m.role !== 'member').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card>
          <CardHeader className="border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Members</CardTitle>
                <CardDescription>A list of all BSG members</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by UID, name, enrollment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No members found</p>
                {isAdminOrCoordinator && (
                  <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                    Add your first member
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[250px]">Member</TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdminOrCoordinator && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.profile_photo_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {member.first_name[0]}{member.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.first_name} {member.middle_name} {member.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.whatsapp_number || 'No phone'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 rounded bg-muted text-sm font-mono">
                            {member.uid}
                          </code>
                        </TableCell>
                        <TableCell>{member.enrollment_number || '-'}</TableCell>
                        <TableCell>{member.current_semester ? `Sem ${member.current_semester}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role || 'member')}>
                            {ROLE_LABELS[member.role || 'member']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.status === 'active' ? (
                            <span className="status-active">Active</span>
                          ) : (
                            <span className="status-inactive">Inactive</span>
                          )}
                        </TableCell>
                        {isAdminOrCoordinator && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => toggleMemberStatus(member.id, member.status)}>
                                  {member.status === 'active' ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => deleteMember(member.id, member.user_id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
