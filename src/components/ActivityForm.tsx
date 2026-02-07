import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { useColleges } from '@/hooks/useColleges';
import { getDepartmentsForCollege } from '@/lib/collegeDepartments';
import { getCollegeColor } from '@/lib/collegeColors';
import { CreateActivityData } from '@/hooks/useActivities';

interface ActivityFormData extends CreateActivityData {
  collaboration_college?: string;
  collaboration_department?: string;
}

interface ActivityFormProps {
  isEdit?: boolean;
  initialData?: ActivityFormData;
  onSubmit: (data: ActivityFormData) => Promise<{ success: boolean }>;
  onCancel: () => void;
}

export function ActivityForm({ isEdit = false, initialData, onSubmit, onCancel }: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>(
    initialData || {
      name: '',
      description: '',
      activity_date: '',
      activity_time: '',
      location: '',
      capacity: undefined,
      registration_enabled: true,
      collaboration_college: '',
      collaboration_department: '',
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colleges } = useColleges();

  const collaborationDepartments = useMemo(() => {
    if (!formData.collaboration_college) return [];
    const college = colleges.find(c => c.id === formData.collaboration_college || c.name === formData.collaboration_college);
    return getDepartmentsForCollege(college?.name || formData.collaboration_college);
  }, [formData.collaboration_college, colleges]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.activity_date) return;
    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);
    if (result.success) {
      onCancel();
    }
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor={`name-${isEdit ? 'edit' : 'add'}`}>Activity Name *</Label>
          <Input
            id={`name-${isEdit ? 'edit' : 'add'}`}
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`description-${isEdit ? 'edit' : 'add'}`}>Description</Label>
          <Textarea
            id={`description-${isEdit ? 'edit' : 'add'}`}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`activity_date-${isEdit ? 'edit' : 'add'}`}>Date *</Label>
            <Input
              id={`activity_date-${isEdit ? 'edit' : 'add'}`}
              type="date"
              value={formData.activity_date}
              onChange={(e) => setFormData(prev => ({ ...prev, activity_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`activity_time-${isEdit ? 'edit' : 'add'}`}>Time</Label>
            <Input
              id={`activity_time-${isEdit ? 'edit' : 'add'}`}
              type="time"
              value={formData.activity_time}
              onChange={(e) => setFormData(prev => ({ ...prev, activity_time: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`location-${isEdit ? 'edit' : 'add'}`}>Location</Label>
          <Input
            id={`location-${isEdit ? 'edit' : 'add'}`}
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`capacity-${isEdit ? 'edit' : 'add'}`}>Capacity (optional)</Label>
          <Input
            id={`capacity-${isEdit ? 'edit' : 'add'}`}
            type="number"
            value={formData.capacity || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || undefined }))}
          />
        </div>

        {/* Collaboration Fields */}
        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Collaboration (Optional)
          </Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label>Collaboration College</Label>
              <Select
                value={formData.collaboration_college ? formData.collaboration_college : '__none__'}
                onValueChange={(v) => {
                  const value = v === '__none__' ? '' : v;
                  setFormData(prev => ({ ...prev, collaboration_college: value, collaboration_department: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {colleges.map(college => (
                    <SelectItem key={college.id} value={college.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCollegeColor(college.name) }}
                        />
                        {college.short_code} - {college.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Collaboration Department</Label>
              <Select
                value={formData.collaboration_department ? formData.collaboration_department : '__none__'}
                onValueChange={(v) => {
                  const value = v === '__none__' ? '' : v;
                  setFormData(prev => ({ ...prev, collaboration_department: value }));
                }}
                disabled={!formData.collaboration_college || collaborationDepartments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={collaborationDepartments.length > 0 ? "Select department" : "Select college first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {collaborationDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status ?? 'upcoming'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Update Activity' : 'Create Activity'
          )}
        </Button>
      </div>
    </>
  );
}
