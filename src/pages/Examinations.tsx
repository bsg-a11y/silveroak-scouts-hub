import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecureAvatar } from '@/components/SecureAvatar';
import { ExaminationBadge } from '@/components/ExaminationBadge';
import { SecureDownloadButton } from '@/components/SecureDownloadButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Award,
  BookOpen,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Search,
  Users,
  Plus,
  Filter,
  Download,
  CheckCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { useExaminations, useExaminationStats } from '@/hooks/useExaminations';
import { useMembers } from '@/hooks/useMembers';
import { useColleges } from '@/hooks/useColleges';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { format } from 'date-fns';
import { COLLEGE_DEPARTMENTS, getDepartmentsForCollege } from '@/lib/collegeDepartments';
import bsgLogo from '@/assets/bsg-logo.png';

export default function Examinations() {
  const { isAdminOrCoordinator, user } = useAuth();
  const { stages, materials, memberExaminations, isLoading, addMaterial, deleteMaterial, updateMemberExamination, getUserExaminationBadge } = useExaminations();
  const { stats, isLoading: statsLoading, fetchStats } = useExaminationStats();
  const { members } = useMembers();
  const { colleges } = useColleges();
  const { toast } = useToast();

  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('materials');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin dialogs
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    stage_id: '',
    title: '',
    material_type: 'notes' as 'notes' | 'logbook' | 'other',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status update form
  const [statusForm, setStatusForm] = useState({
    user_id: '',
    stage_id: '',
    status: 'ongoing' as 'ongoing' | 'complete',
    exam_year: new Date().getFullYear(),
  });

  // Filters for summary
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterCollege, setFilterCollege] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');

  // Filter materials by stage
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (selectedStage !== 'all' && m.stage_id !== selectedStage) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return m.title.toLowerCase().includes(query) || 
               m.description?.toLowerCase().includes(query) ||
               m.stage?.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [materials, selectedStage, searchQuery]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set(memberExaminations.map(e => e.exam_year));
    return Array.from(years).sort((a, b) => b - a);
  }, [memberExaminations]);

  // Available departments based on selected college
  const availableDepartments = useMemo(() => {
    return getDepartmentsForCollege(filterCollege);
  }, [filterCollege]);

  // Apply filters
  const handleApplyFilters = () => {
    fetchStats({
      year: filterYear ? parseInt(filterYear) : undefined,
      college: filterCollege || undefined,
      department: filterDepartment || undefined,
    });
  };

  // Handle file upload
  const handleUploadMaterial = async () => {
    if (!selectedFile || !materialForm.stage_id || !materialForm.title) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields and select a file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `examination-materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('examination-materials')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL - bucket is private so we'll just store the path
      // and generate signed URLs when displaying
      const { data: urlData } = await supabase.storage
        .from('examination-materials')
        .createSignedUrl(filePath, 31536000); // 1 year expiry

      // Save material record
      const success = await addMaterial({
        stage_id: materialForm.stage_id,
        title: materialForm.title,
        material_type: materialForm.material_type,
        file_url: urlData?.signedUrl || filePath,
        description: materialForm.description,
      });

      if (success) {
        setIsAddMaterialOpen(false);
        setMaterialForm({ stage_id: '', title: '', material_type: 'notes', description: '' });
        setSelectedFile(null);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to upload file: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!statusForm.user_id || !statusForm.stage_id) {
      toast({
        title: 'Error',
        description: 'Please select a member and stage',
        variant: 'destructive',
      });
      return;
    }

    const success = await updateMemberExamination(
      statusForm.user_id,
      statusForm.stage_id,
      statusForm.status,
      statusForm.exam_year
    );

    if (success) {
      setIsUpdateStatusOpen(false);
      setStatusForm({
        user_id: '',
        stage_id: '',
        status: 'ongoing',
        exam_year: new Date().getFullYear(),
      });
    }
  };

  // Get user's examination badge for display
  const myExamBadge = user ? getUserExaminationBadge(user.id) : null;

  // Regular members (exclude faculty)
  const regularMembers = members.filter(m => 
    m.role !== 'faculty_coordinator' && !m.uid?.startsWith('BSGSOU000')
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
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
          <div className="flex items-center gap-4">
            <img src={bsgLogo} alt="BSG Logo" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                Examinations & Notes
              </h1>
              <p className="text-muted-foreground mt-1">
                View notes, logbooks, and track your examination progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {myExamBadge && (
              <ExaminationBadge 
                stageName={myExamBadge.stageName} 
                status={myExamBadge.status}
                size="md"
              />
            )}
            {isAdminOrCoordinator && (
              <>
                <Button variant="outline" onClick={() => setIsUpdateStatusOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
                <Button onClick={() => setIsAddMaterialOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Material
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="materials" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Notes & Logbooks
            </TabsTrigger>
            {isAdminOrCoordinator && (
              <TabsTrigger value="summary" className="gap-2">
                <Award className="h-4 w-4" />
                Examination Summary
              </TabsTrigger>
            )}
            {isAdminOrCoordinator && (
              <TabsTrigger value="manage" className="gap-2">
                <Users className="h-4 w-4" />
                Manage Status
              </TabsTrigger>
            )}
          </TabsList>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            {/* Stage Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stages.map(stage => {
                const stageMaterials = filteredMaterials.filter(m => m.stage_id === stage.id);
                if (selectedStage !== 'all' && selectedStage !== stage.id) return null;
                
                return (
                  <Card key={stage.id} className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stage.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {stage.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {stageMaterials.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No materials available yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {stageMaterials.map(material => (
                            <div 
                              key={material.id} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {material.material_type === 'notes' ? (
                                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                ) : material.material_type === 'logbook' ? (
                                  <BookOpen className="h-4 w-4 text-purple-500 shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{material.title}</p>
                                  <Badge variant="outline" className="text-[10px]">
                                    {material.material_type}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon-sm" asChild>
                                  <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                {isAdminOrCoordinator && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => deleteMaterial(material.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Summary Tab (Admin Only) */}
          {isAdminOrCoordinator && (
            <TabsContent value="summary" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs">Year</Label>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Years</SelectItem>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs">College</Label>
                      <Select 
                        value={filterCollege} 
                        onValueChange={(val) => {
                          setFilterCollege(val === '__all__' ? '' : val);
                          setFilterDepartment('');
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="All Colleges" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Colleges</SelectItem>
                          {Object.keys(COLLEGE_DEPARTMENTS).map(college => (
                            <SelectItem key={college} value={college}>
                              {college}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs">Department</Label>
                      <Select 
                        value={filterDepartment} 
                        onValueChange={(val) => setFilterDepartment(val === '__all__' ? '' : val)}
                        disabled={!filterCollege}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Departments</SelectItem>
                          {availableDepartments.map(dept => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleApplyFilters} disabled={statsLoading}>
                        {statsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card variant="stat">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Applied</p>
                        <p className="text-3xl font-bold font-display">{stats.totalApplied}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="stat">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-3xl font-bold font-display">{stats.totalCompleted}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="stat">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ongoing</p>
                        <p className="text-3xl font-bold font-display">{stats.totalApplied - stats.totalCompleted}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                        <Clock className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="stat">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-3xl font-bold font-display">
                          {stats.totalApplied > 0 
                            ? Math.round((stats.totalCompleted / stats.totalApplied) * 100) 
                            : 0}%
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Award className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stage Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-center">Ongoing</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byStage.map(item => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="warning">{item.ongoing}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="success">{item.complete}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.ongoing + item.complete}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* College Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>By College</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>College</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byCollege.map(item => (
                        <TableRow key={item.college}>
                          <TableCell>{item.college}</TableCell>
                          <TableCell className="text-right font-medium">{item.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Manage Status Tab (Admin Only) */}
          {isAdminOrCoordinator && (
            <TabsContent value="manage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Member Examination Status</CardTitle>
                  <CardDescription>
                    View and manage examination status of all members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberExaminations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No examination records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        memberExaminations.map(exam => (
                          <TableRow key={exam.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <SecureAvatar
                                  src={exam.profile?.profile_photo_url}
                                  fallback={`${exam.profile?.first_name?.[0] || ''}${exam.profile?.last_name?.[0] || ''}`}
                                  className="h-8 w-8"
                                />
                                <div>
                                  <p className="font-medium">
                                    {exam.profile?.first_name} {exam.profile?.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {exam.profile?.uid}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{exam.stage?.name}</Badge>
                            </TableCell>
                            <TableCell>
                              <ExaminationBadge 
                                stageName={exam.stage?.name || ''} 
                                status={exam.status}
                                showIcon={false}
                              />
                            </TableCell>
                            <TableCell>{exam.exam_year}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(exam.applied_at), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {exam.completed_at 
                                ? format(new Date(exam.completed_at), 'dd MMM yyyy')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Add Material Dialog */}
        <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Examination Material</DialogTitle>
              <DialogDescription>
                Upload notes or sample logbooks for members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Stage *</Label>
                <Select 
                  value={materialForm.stage_id || '__none__'} 
                  onValueChange={(val) => setMaterialForm({ ...materialForm, stage_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select stage</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  placeholder="e.g., Pravesh Notes Chapter 1"
                />
              </div>
              <div>
                <Label>Type *</Label>
                <Select 
                  value={materialForm.material_type} 
                  onValueChange={(val) => setMaterialForm({ ...materialForm, material_type: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="logbook">Sample Logbook</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label>File *</Label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadMaterial} disabled={isUploading}>
                {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Examination Status</DialogTitle>
              <DialogDescription>
                Set or update a member's examination stage status
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Member *</Label>
                <Select 
                  value={statusForm.user_id || '__none__'} 
                  onValueChange={(val) => setStatusForm({ ...statusForm, user_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select member</SelectItem>
                    {regularMembers.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.first_name} {member.last_name} ({member.uid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage *</Label>
                <Select 
                  value={statusForm.stage_id || '__none__'} 
                  onValueChange={(val) => setStatusForm({ ...statusForm, stage_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select stage</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status *</Label>
                <Select 
                  value={statusForm.status} 
                  onValueChange={(val) => setStatusForm({ ...statusForm, status: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year *</Label>
                <Input
                  type="number"
                  value={statusForm.exam_year}
                  onChange={(e) => setStatusForm({ ...statusForm, exam_year: parseInt(e.target.value) || new Date().getFullYear() })}
                  min={2020}
                  max={2100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateStatusOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
