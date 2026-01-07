import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Member } from '@/hooks/useMembers';
import { useColleges } from '@/hooks/useColleges';
import { getDepartmentsForCollege } from '@/lib/collegeDepartments';

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Member>) => Promise<{ success: boolean }>;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function EditMemberDialog({ member, open, onOpenChange, onSave }: EditMemberDialogProps) {
  const { colleges } = useColleges();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    email: '',
    course_duration: '',
    college_name: '',
    academic_department: '',
    current_semester: '',
    enrollment_number: '',
    whatsapp_number: '',
    blood_group: '',
    class_coordinator_name: '',
    hod_name: '',
    principal_name: '',
  });

  const availableDepartments = useMemo(() => {
    return getDepartmentsForCollege(formData.college_name || '');
  }, [formData.college_name]);

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name || '',
        middle_name: member.middle_name || '',
        last_name: member.last_name || '',
        gender: member.gender || '',
        date_of_birth: member.date_of_birth || '',
        email: member.email || '',
        course_duration: member.course_duration || '',
        college_name: member.college_name || '',
        academic_department: member.academic_department || '',
        current_semester: member.current_semester?.toString() || '',
        enrollment_number: member.enrollment_number || '',
        whatsapp_number: member.whatsapp_number || '',
        blood_group: member.blood_group || '',
        class_coordinator_name: member.class_coordinator_name || '',
        hod_name: member.hod_name || '',
        principal_name: member.principal_name || '',
      });
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setIsSubmitting(true);
    
    const result = await onSave(member.id, {
      first_name: formData.first_name,
      middle_name: formData.middle_name || null,
      last_name: formData.last_name,
      gender: formData.gender || null,
      date_of_birth: formData.date_of_birth || null,
      email: formData.email || null,
      course_duration: formData.course_duration || null,
      college_name: formData.college_name || null,
      academic_department: formData.academic_department || null,
      current_semester: formData.current_semester ? parseInt(formData.current_semester) : null,
      enrollment_number: formData.enrollment_number || null,
      whatsapp_number: formData.whatsapp_number || null,
      blood_group: formData.blood_group || null,
      class_coordinator_name: formData.class_coordinator_name || null,
      hod_name: formData.hod_name || null,
      principal_name: formData.principal_name || null,
    } as any);
    
    setIsSubmitting(false);
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member Profile</DialogTitle>
          <DialogDescription>
            Update member details. UID cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Middle Name</Label>
            <Input
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input
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
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Course Duration</Label>
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
            <Label>College</Label>
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
            <Label>Current Semester</Label>
            <Input
              type="number"
              min={1}
              max={8}
              value={formData.current_semester}
              onChange={(e) => setFormData({ ...formData, current_semester: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Enrollment Number</Label>
            <Input
              value={formData.enrollment_number}
              onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Number</Label>
            <Input
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="10 digits"
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
            <Label>HOD Name</Label>
            <Input
              value={formData.hod_name}
              onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Class Coordinator Name</Label>
            <Input
              value={formData.class_coordinator_name}
              onChange={(e) => setFormData({ ...formData, class_coordinator_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Principal Name</Label>
            <Input
              value={formData.principal_name}
              onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !formData.first_name || !formData.last_name}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
