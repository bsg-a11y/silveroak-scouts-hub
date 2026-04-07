import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/SecureAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Mail, Phone, Building2, Trash2, Loader2, Upload } from 'lucide-react';
import { useCommittee, CommitteePosition } from '@/hooks/useCommittee';
import { useMembers, Member } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function OurTeam() {
  const { departments, positions, isLoading, addPosition, removePosition, addDepartment, deleteDepartment, fetchData } = useCommittee();
  const { members } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDeptDialogOpen, setIsAddDeptDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState<{ userId: string; positionId: string } | null>(null);
  const [newPosition, setNewPosition] = useState({
    user_id: '',
    position_type: '' as 'institute_coordinator' | 'executive' | 'core' | '',
    position_title: '',
    department_id: '',
    email: '',
    phone: '',
  });
  const [newDept, setNewDept] = useState({ name: '', committee_type: '' as 'executive' | 'core' | '' });

  // Auto-fetch member data when member is selected
  const selectedMember = members.find(m => m.user_id === newPosition.user_id);
  
  useEffect(() => {
    if (selectedMember) {
      setNewPosition(prev => ({
        ...prev,
        email: selectedMember.email || prev.email,
        phone: selectedMember.whatsapp_number || prev.phone,
      }));
    }
  }, [selectedMember]);

  const instituteCoordinators = positions.filter(p => p.position_type === 'institute_coordinator');
  const executiveMembers = positions.filter(p => p.position_type === 'executive');
  const coreMembers = positions.filter(p => p.position_type === 'core');

  const executiveDepts = departments.filter(d => d.committee_type === 'executive');
  const coreDepts = departments.filter(d => d.committee_type === 'core');

  const handleAddPosition = async () => {
    if (!newPosition.user_id || !newPosition.position_type) return;
    setIsSubmitting(true);
    const result = await addPosition({
      user_id: newPosition.user_id,
      position_type: newPosition.position_type as 'institute_coordinator' | 'executive' | 'core',
      position_title: newPosition.position_title || undefined,
      department_id: newPosition.department_id || undefined,
      email: newPosition.email || undefined,
      phone: newPosition.phone || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setIsAddDialogOpen(false);
      setNewPosition({ user_id: '', position_type: '', position_title: '', department_id: '', email: '', phone: '' });
    }
  };

  const handleAddDepartment = async () => {
    if (!newDept.name || !newDept.committee_type) return;
    setIsSubmitting(true);
    const result = await addDepartment(newDept.name, newDept.committee_type);
    setIsSubmitting(false);
    if (result.success) {
      setIsAddDeptDialogOpen(false);
      setNewDept({ name: '', committee_type: '' });
    }
  };

  const handlePhotoUploaded = async (_url: string) => {
    setSelectedMemberForPhoto(null);
    await fetchData();
    toast({ title: 'Photo updated successfully' });
  };

  const MemberCard = ({ position }: { position: CommitteePosition }) => (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow">
      {isAdminOrCoordinator && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-primary"
            onClick={() => setSelectedMemberForPhoto({ userId: position.user_id, positionId: position.id })}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={() => removePosition(position.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <CardContent className="p-6 text-center">
        <SecureAvatar
          src={position.profile?.profile_photo_url}
          fallback={`${position.profile?.first_name?.[0] || '?'}${position.profile?.last_name?.[0] || ''}`}
          className="h-20 w-20 mx-auto mb-4"
          fallbackClassName="text-xl"
        />
        <h3 className="font-semibold text-lg">
          {position.profile?.first_name} {position.profile?.middle_name} {position.profile?.last_name}
        </h3>
        {position.position_title && (
          <Badge variant="secondary" className="mt-2">{position.position_title}</Badge>
        )}
        {position.department && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Building2 className="h-3 w-3" />
            {position.department.name}
          </p>
        )}
        {position.profile?.college_name && (
          <p className="text-xs text-muted-foreground mt-1">{position.profile.college_name}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-4">
          {position.phone && (
            <a href={`tel:${position.phone}`} className="text-muted-foreground hover:text-primary">
              <Phone className="h-4 w-4" />
            </a>
          )}
          {position.email && (
            <a href={`mailto:${position.email}`} className="text-muted-foreground hover:text-primary">
              <Mail className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const DepartmentSection = ({ 
    title, 
    members, 
    depts 
  }: { 
    title: string; 
    members: CommitteePosition[]; 
    depts: typeof departments 
  }) => (
    <div className="space-y-6">
      {depts.map(dept => {
        const deptMembers = members.filter(m => m.department_id === dept.id);
        if (deptMembers.length === 0 && !isAdminOrCoordinator) return null;
        
        return (
          <div key={dept.id}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {dept.name}
              {isAdminOrCoordinator && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive ml-2"
                  onClick={() => deleteDepartment(dept.id)}
                  title="Delete department"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </h3>
            {deptMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deptMembers.map(member => (
                  <MemberCard key={member.id} position={member} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Members without department */}
      {(() => {
        const noDeptMembers = members.filter(m => !m.department_id);
        if (noDeptMembers.length === 0) return null;
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">General</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {noDeptMembers.map(member => (
                <MemberCard key={member.id} position={member} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Our Team
            </h1>
            <p className="text-muted-foreground mt-1">
              Meet the leadership and committee members of BSG Silver Oak University
            </p>
          </div>
          {isAdminOrCoordinator && (
            <div className="flex gap-2">
              <Dialog open={isAddDeptDialogOpen} onOpenChange={setIsAddDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                    <DialogDescription>Create a new department for committees</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Department Name</Label>
                      <Input
                        value={newDept.name}
                        onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                        placeholder="e.g., Finance & Accounts"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Committee Type</Label>
                      <Select 
                        value={newDept.committee_type} 
                        onValueChange={(v) => setNewDept({ ...newDept, committee_type: v as 'executive' | 'core' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select committee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executive Committee</SelectItem>
                          <SelectItem value="core">Core Committee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDeptDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddDepartment} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Department'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Committee Member</DialogTitle>
                    <DialogDescription>Assign a member to a committee position</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Member *</Label>
                      <Select 
                        value={newPosition.user_id} 
                        onValueChange={(v) => setNewPosition({ ...newPosition, user_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.first_name} {m.last_name} ({m.uid})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Position Type *</Label>
                      <Select 
                        value={newPosition.position_type} 
                        onValueChange={(v) => setNewPosition({ ...newPosition, position_type: v as any, department_id: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="institute_coordinator">Institute Coordinator</SelectItem>
                          <SelectItem value="executive">Executive Committee</SelectItem>
                          <SelectItem value="core">Core Committee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Position Title</Label>
                      <Input
                        value={newPosition.position_title}
                        onChange={(e) => setNewPosition({ ...newPosition, position_title: e.target.value })}
                        placeholder="e.g., Head, Deputy Head, Member"
                      />
                    </div>
                    {(newPosition.position_type === 'executive' || newPosition.position_type === 'core') && (
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select 
                          value={newPosition.department_id} 
                          onValueChange={(v) => setNewPosition({ ...newPosition, department_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {(newPosition.position_type === 'executive' ? executiveDepts : coreDepts).map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newPosition.email}
                          onChange={(e) => setNewPosition({ ...newPosition, email: e.target.value })}
                          placeholder="Contact email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={newPosition.phone}
                          onChange={(e) => setNewPosition({ ...newPosition, phone: e.target.value })}
                          placeholder="Contact phone"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddPosition} disabled={isSubmitting || !newPosition.user_id || !newPosition.position_type}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Member'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Institute Coordinators */}
        <Card>
          <CardHeader>
            <CardTitle>Institute Coordinators</CardTitle>
            <CardDescription>The leadership guiding BSG activities at Silver Oak University</CardDescription>
          </CardHeader>
          <CardContent>
            {instituteCoordinators.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No institute coordinators assigned yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {instituteCoordinators.map(ic => (
                  <MemberCard key={ic.id} position={ic} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Committees */}
        <Tabs defaultValue="executive" className="space-y-4">
          <TabsList>
            <TabsTrigger value="executive">Executive Committee</TabsTrigger>
            <TabsTrigger value="core">Core Committee</TabsTrigger>
          </TabsList>
          
          <TabsContent value="executive">
            <Card>
              <CardHeader>
                <CardTitle>Executive Committee</CardTitle>
                <CardDescription>Senior members leading various departments</CardDescription>
              </CardHeader>
              <CardContent>
                {executiveMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No executive committee members assigned yet</p>
                ) : (
                  <DepartmentSection title="Executive Committee" members={executiveMembers} depts={executiveDepts} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="core">
            <Card>
              <CardHeader>
                <CardTitle>Core Committee</CardTitle>
                <CardDescription>Dedicated members supporting department operations</CardDescription>
              </CardHeader>
              <CardContent>
                {coreMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No core committee members assigned yet</p>
                ) : (
                  <DepartmentSection title="Core Committee" members={coreMembers} depts={coreDepts} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Photo Upload Dialog */}
        <Dialog open={!!selectedMemberForPhoto} onOpenChange={(open) => !open && setSelectedMemberForPhoto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Profile Photo</DialogTitle>
              <DialogDescription>
                Upload a profile photo for this committee member.
              </DialogDescription>
            </DialogHeader>
            {selectedMemberForPhoto && (
              <ProfilePhotoUpload 
                userId={selectedMemberForPhoto.userId}
                currentPhotoUrl={null}
                fallback="?"
                onPhotoUpdated={handlePhotoUploaded}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
