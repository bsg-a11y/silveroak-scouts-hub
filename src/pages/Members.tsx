import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDepartmentsForCollege, COURSE_DURATIONS } from '@/lib/collegeDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/SecureAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Key,
  GraduationCap,
  Users,
} from 'lucide-react';
import { useMembers, CreateMemberData, Member } from '@/hooks/useMembers';
import { useColleges } from '@/hooks/useColleges';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MemberDetailsDialog } from '@/components/MemberDetailsDialog';
import { EditMemberDialog } from '@/components/EditMemberDialog';
import { FullProfileDialog } from '@/components/FullProfileDialog';
import { ExaminationBadge } from '@/components/ExaminationBadge';
import { useExaminations } from '@/hooks/useExaminations';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  executive: 'Executive',
  core: 'Core Committee',
  member: 'Member',
  faculty_coordinator: 'Faculty Coordinator',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Members() {
  const [searchQuery, setSearchQuery] = useState('');
  const [memberTab, setMemberTab] = useState<'members' | 'faculty' | 'all'>('members');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFacultyDialogOpen, setIsFacultyDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ uid: string; password: string; college?: string } | null>(null);
  const [resetPasswordMember, setResetPasswordMember] = useState<{ id: string; userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [viewDetailsMember, setViewDetailsMember] = useState<{ id: string; user_id: string; uid: string; first_name: string; last_name: string } | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<CreateMemberData>({
    uid: '',
    password: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: '',
    date_of_birth: '',
    email: '',
    course_duration: '',
    college_name: '',
    academic_department: '',
    current_semester: undefined,
    enrollment_number: '',
    whatsapp_number: '',
    blood_group: '',
    role: 'member',
    class_coordinator_name: '',
    hod_name: '',
    principal_name: '',
    joining_date: '',
  });

  // Get departments based on selected college
  const availableDepartments = useMemo(() => {
    return getDepartmentsForCollege(formData.college_name || '');
  }, [formData.college_name]);
  const [facultyFormData, setFacultyFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    college_id: '',
    password: '',
    whatsapp_number: '',
  });
  
  const { members, isLoading, createMember, updateMember, toggleMemberStatus, deleteMember, fetchMembers } = useMembers();
  const { colleges } = useColleges();
  const { isAdminOrCoordinator, isAdmin } = useAuth();
  const { toast } = useToast();
  const { memberExaminations, getUserExaminationBadge } = useExaminations();

  // Filter members by type: regular members vs faculty
  const regularMembers = members.filter(m => 
    !m.uid?.startsWith('BSGSOU000') && 
    m.role !== 'faculty_coordinator'
  );

  const facultyMembers = members.filter(m => 
    m.role === 'faculty_coordinator'
  );

  // Get members based on current tab
  const tabMembers = useMemo(() => {
    switch (memberTab) {
      case 'members':
        return regularMembers;
      case 'faculty':
        return facultyMembers;
      case 'all':
        return members.filter(m => !m.uid?.startsWith('BSGSOU000'));
      default:
        return regularMembers;
    }
  }, [memberTab, members, regularMembers, facultyMembers]);

  const filteredMembers = tabMembers.filter(
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
        uid: '',
        password: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        gender: '',
        date_of_birth: '',
        email: '',
        course_duration: '',
        college_name: '',
        academic_department: '',
        current_semester: undefined,
        enrollment_number: '',
        whatsapp_number: '',
        blood_group: '',
        role: 'member',
        class_coordinator_name: '',
        hod_name: '',
        principal_name: '',
        joining_date: '',
      });
    }
  };

  const handleCreateFaculty = async () => {
    if (!facultyFormData.first_name || !facultyFormData.last_name || !facultyFormData.college_id) {
      toast({
        title: 'Validation Error',
        description: 'First name, last name, and college are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke('create-faculty', {
        body: facultyFormData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create faculty coordinator');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create faculty coordinator');
      }

      setCreatedCredentials({ uid: result.uid, password: result.password, college: result.college });
      setFacultyFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        college_id: '',
        password: '',
        whatsapp_number: '',
      });
      toast({
        title: 'Faculty Coordinator created successfully',
        description: `UID: ${result.uid}`,
      });
      await fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error creating faculty coordinator',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
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
    a.download = `bsg_${memberTab}.csv`;
    a.click();
  };

  const handleResetPassword = async () => {
    if (!resetPasswordMember) return;
    setIsResetting(true);
    try {
      const response = await supabase.functions.invoke('reset-password', {
        body: { user_id: resetPasswordMember.userId },
      });
      
      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      setNewPassword(response.data.password);
      toast({ title: 'Password reset successfully' });
    } catch (error: any) {
      toast({
        title: 'Error resetting password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const copyNewPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      toast({ title: 'Password copied to clipboard' });
    }
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
            {isAdmin && (
              <Dialog open={isFacultyDialogOpen} onOpenChange={(open) => {
                setIsFacultyDialogOpen(open);
                if (!open) setCreatedCredentials(null);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Add Faculty
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  {createdCredentials ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Faculty Coordinator Created!</DialogTitle>
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
                        {createdCredentials.college && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium">College:</span>
                            <span className="text-sm">{createdCredentials.college}</span>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          navigator.clipboard.writeText(`UID: ${createdCredentials.uid}\nPassword: ${createdCredentials.password}`);
                          toast({ title: 'Credentials copied to clipboard' });
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Credentials
                        </Button>
                        <Button onClick={() => {
                          setCreatedCredentials(null);
                          setIsFacultyDialogOpen(false);
                        }}>
                          Done
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Add Faculty Coordinator</DialogTitle>
                        <DialogDescription>
                          Create a faculty coordinator account. They will only see activity registrations for their college.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name *</Label>
                            <Input
                              value={facultyFormData.first_name}
                              onChange={(e) => setFacultyFormData({ ...facultyFormData, first_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name *</Label>
                            <Input
                              value={facultyFormData.last_name}
                              onChange={(e) => setFacultyFormData({ ...facultyFormData, last_name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Middle Name</Label>
                          <Input
                            value={facultyFormData.middle_name}
                            onChange={(e) => setFacultyFormData({ ...facultyFormData, middle_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>College *</Label>
                          <Select 
                            value={facultyFormData.college_id} 
                            onValueChange={(v) => setFacultyFormData({ ...facultyFormData, college_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select college" />
                            </SelectTrigger>
                            <SelectContent>
                              {colleges.map(college => (
                                <SelectItem key={college.id} value={college.id}>
                                  {college.short_code} - {college.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Password (Optional)</Label>
                          <Input
                            type="text"
                            value={facultyFormData.password}
                            onChange={(e) => setFacultyFormData({ ...facultyFormData, password: e.target.value })}
                            placeholder="Leave empty to auto-generate"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>WhatsApp Number</Label>
                          <Input
                            value={facultyFormData.whatsapp_number}
                            onChange={(e) => setFacultyFormData({ ...facultyFormData, whatsapp_number: e.target.value })}
                            placeholder="10 digits"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFacultyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateFaculty} disabled={isCreating}>
                          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Faculty'}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            )}
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
                          Fill in the member details. Leave UID and Password empty to auto-generate, or enter pre-assigned values.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="uid">UID (Optional)</Label>
                          <Input
                            id="uid"
                            value={formData.uid}
                            onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                            placeholder="e.g., BSGSOU002"
                          />
                          <p className="text-xs text-muted-foreground">Format: BSGSOU + 3 digits</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password (Optional)</Label>
                          <Input
                            id="password"
                            type="text"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Leave empty to auto-generate"
                          />
                          <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                        </div>
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
                          <Label>Date of Birth</Label>
                          <Input
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Joining Date</Label>
                          <Input
                            type="date"
                            value={formData.joining_date}
                            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="name@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course_duration">Course Duration</Label>
                          <Select 
                            value={formData.course_duration} 
                            onValueChange={(v) => setFormData({ ...formData, course_duration: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2 Years">2 Years</SelectItem>
                              <SelectItem value="3 Years">3 Years</SelectItem>
                              <SelectItem value="4 Years">4 Years</SelectItem>
                              <SelectItem value="5 Years">5 Years</SelectItem>
                              <SelectItem value="6 Years">6 Years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>College *</Label>
                          <Select 
                            value={formData.college_name} 
                            onValueChange={(v) => setFormData({ ...formData, college_name: v, academic_department: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select college" />
                            </SelectTrigger>
                            <SelectContent>
                              {colleges.map(college => (
                                <SelectItem key={college.id} value={college.name}>
                                  {college.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {availableDepartments.length > 0 && (
                          <div className="space-y-2">
                            <Label>Department</Label>
                            <Select 
                              value={formData.academic_department} 
                              onValueChange={(v) => setFormData({ ...formData, academic_department: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableDepartments.map(dept => (
                                  <SelectItem key={dept} value={dept}>
                                    {dept}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="enrollment_number">Enrollment Number</Label>
                          <Input
                            id="enrollment_number"
                            value={formData.enrollment_number}
                            onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                            placeholder="1st sem: T + 13 digits, Others: 13 digits"
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
                          <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
                          <Input
                            id="whatsapp_number"
                            value={formData.whatsapp_number}
                            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                            placeholder="10 digits only"
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
                        <div className="space-y-2">
                          <Label htmlFor="hod_name">HOD Name</Label>
                          <Input
                            id="hod_name"
                            value={formData.hod_name}
                            onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="class_coordinator_name">Class Coordinator Name</Label>
                          <Input
                            id="class_coordinator_name"
                            value={formData.class_coordinator_name}
                            onChange={(e) => setFormData({ ...formData, class_coordinator_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="principal_name">Principal Name</Label>
                          <Input
                            id="principal_name"
                            value={formData.principal_name}
                            onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold font-display">{regularMembers.length}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold font-display text-bsg-green">
                {regularMembers.filter(m => m.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold font-display text-muted-foreground">
                {regularMembers.filter(m => m.status === 'inactive').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Committee</p>
              <p className="text-2xl font-bold font-display text-primary">
                {regularMembers.filter(m => m.role !== 'member').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Faculty</p>
              <p className="text-2xl font-bold font-display text-amber-500">
                {facultyMembers.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Members Table with Tabs */}
        <Card>
          <CardHeader className="border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Tabs value={memberTab} onValueChange={(v) => setMemberTab(v as 'members' | 'faculty' | 'all')}>
                  <TabsList>
                    <TabsTrigger value="members">
                      <Users className="h-4 w-4 mr-2" />
                      Members ({regularMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="faculty">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Faculty ({facultyMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                      All ({regularMembers.length + facultyMembers.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
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
                <p>No {memberTab === 'faculty' ? 'faculty members' : 'members'} found</p>
                {isAdminOrCoordinator && memberTab === 'members' && (
                  <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                    Add your first member
                  </Button>
                )}
                {isAdmin && memberTab === 'faculty' && (
                  <Button variant="link" onClick={() => setIsFacultyDialogOpen(true)}>
                    Add your first faculty coordinator
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[250px]">
                        {memberTab === 'faculty' ? 'Faculty' : 'Member'}
                      </TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>{memberTab === 'faculty' ? 'College' : 'Enrollment'}</TableHead>
                      <TableHead>{memberTab === 'faculty' ? 'WhatsApp' : 'Semester'}</TableHead>
                      <TableHead>Joining Date</TableHead>
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
                            <SecureAvatar
                              src={member.profile_photo_url}
                              fallback={`${member.first_name[0]}${member.last_name[0]}`}
                              className="h-9 w-9"
                              fallbackClassName="text-sm"
                            />
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
                        <TableCell>
                          {memberTab === 'faculty' 
                            ? (member.college_name || '-') 
                            : (member.enrollment_number || '-')
                          }
                        </TableCell>
                        <TableCell>
                          {memberTab === 'faculty'
                            ? (member.whatsapp_number || '-')
                            : (member.current_semester ? `Sem ${member.current_semester}` : '-')
                          }
                        </TableCell>
                        <TableCell>
                          {member.joining_date 
                            ? new Date(member.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={getRoleBadgeVariant(member.role || 'member')}>
                              {ROLE_LABELS[member.role || 'member']}
                            </Badge>
                            {(() => {
                              const examBadge = getUserExaminationBadge(member.user_id);
                              return examBadge ? (
                                <ExaminationBadge 
                                  stageName={examBadge.stageName} 
                                  status={examBadge.status} 
                                  size="sm" 
                                />
                              ) : null;
                            })()}
                          </div>
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
                                <DropdownMenuItem onClick={() => setViewDetailsMember({
                                  id: member.id,
                                  user_id: member.user_id,
                                  uid: member.uid,
                                  first_name: member.first_name,
                                  last_name: member.last_name,
                                })}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditMember(member)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setResetPasswordMember({
                                  id: member.id,
                                  userId: member.user_id,
                                  name: `${member.first_name} ${member.last_name}`,
                                })}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
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

        {/* Reset Password Dialog */}
        <Dialog open={!!resetPasswordMember} onOpenChange={(open) => {
          if (!open) {
            setResetPasswordMember(null);
            setNewPassword(null);
          }
        }}>
          <DialogContent>
            {newPassword ? (
              <>
                <DialogHeader>
                  <DialogTitle>Password Reset Successfully</DialogTitle>
                  <DialogDescription>
                    New password for {resetPasswordMember?.name}. Save this - it cannot be recovered.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">New Password:</span>
                    <code className="bg-background px-2 py-1 rounded">{newPassword}</code>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={copyNewPassword}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Password
                  </Button>
                  <Button onClick={() => {
                    setResetPasswordMember(null);
                    setNewPassword(null);
                  }}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to reset the password for {resetPasswordMember?.name}?
                    A new random password will be generated.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetPasswordMember(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResetPassword} disabled={isResetting}>
                    {isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Member Details Dialog */}
        <MemberDetailsDialog
          member={viewDetailsMember}
          open={!!viewDetailsMember}
          onOpenChange={(open) => !open && setViewDetailsMember(null)}
        />

        {/* Edit Member Dialog */}
        <EditMemberDialog
          member={editMember}
          open={!!editMember}
          onOpenChange={(open) => !open && setEditMember(null)}
          onSave={updateMember}
        />
      </div>
    </DashboardLayout>
  );
}
