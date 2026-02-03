import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScrollArea,
} from '@/components/ui/scroll-area';
import { Upload, Download, Loader2, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';

interface ParsedMember {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  email?: string;
  course_duration?: string;
  college_name?: string;
  academic_department?: string;
  current_semester?: number;
  enrollment_number?: string;
  whatsapp_number?: string;
  blood_group?: string;
  class_coordinator_name?: string;
  hod_name?: string;
  principal_name?: string;
  joining_date?: string;
  role?: string;
}

interface ImportResult {
  success: boolean;
  uid?: string;
  password?: string;
  error?: string;
  member: ParsedMember;
}

interface BulkMemberImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Column mapping from Google Form CSV headers to our fields
const COLUMN_MAPPINGS: Record<string, keyof ParsedMember> = {
  'first name': 'first_name',
  'firstname': 'first_name',
  'first_name': 'first_name',
  'middle name': 'middle_name',
  'middlename': 'middle_name',
  'middle_name': 'middle_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'last_name': 'last_name',
  'surname': 'last_name',
  'gender': 'gender',
  'date of birth': 'date_of_birth',
  'dob': 'date_of_birth',
  'date_of_birth': 'date_of_birth',
  'birth date': 'date_of_birth',
  'email': 'email',
  'email address': 'email',
  'personal email': 'email',
  'course duration': 'course_duration',
  'course_duration': 'course_duration',
  'course': 'course_duration',
  'college name': 'college_name',
  'college_name': 'college_name',
  'college': 'college_name',
  'department': 'academic_department',
  'academic department': 'academic_department',
  'academic_department': 'academic_department',
  'branch': 'academic_department',
  'current semester': 'current_semester',
  'current_semester': 'current_semester',
  'semester': 'current_semester',
  'sem': 'current_semester',
  'enrollment number': 'enrollment_number',
  'enrollment_number': 'enrollment_number',
  'enrollment no': 'enrollment_number',
  'enrollment': 'enrollment_number',
  'student id': 'enrollment_number',
  'roll number': 'enrollment_number',
  'roll no': 'enrollment_number',
  'whatsapp number': 'whatsapp_number',
  'whatsapp_number': 'whatsapp_number',
  'whatsapp': 'whatsapp_number',
  'mobile': 'whatsapp_number',
  'phone': 'whatsapp_number',
  'contact': 'whatsapp_number',
  'blood group': 'blood_group',
  'blood_group': 'blood_group',
  'bloodgroup': 'blood_group',
  'class coordinator name': 'class_coordinator_name',
  'class_coordinator_name': 'class_coordinator_name',
  'class coordinator': 'class_coordinator_name',
  'hod name': 'hod_name',
  'hod_name': 'hod_name',
  'hod': 'hod_name',
  'principal name': 'principal_name',
  'principal_name': 'principal_name',
  'principal': 'principal_name',
  'joining date': 'joining_date',
  'joining_date': 'joining_date',
  'join date': 'joining_date',
};

export function BulkMemberImport({ open, onOpenChange, onComplete }: BulkMemberImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (content: string): ParsedMember[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row - handle quoted values
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
    
    // Map headers to our fields
    const columnMap: { index: number; field: keyof ParsedMember }[] = [];
    headers.forEach((header, index) => {
      const field = COLUMN_MAPPINGS[header];
      if (field) {
        columnMap.push({ index, field });
      }
    });

    // Parse data rows
    const members: ParsedMember[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const member: Partial<ParsedMember> = {};
      columnMap.forEach(({ index, field }) => {
        const value = values[index]?.trim();
        if (value) {
          if (field === 'current_semester') {
            const sem = parseInt(value, 10);
            if (!isNaN(sem)) {
              member[field] = sem;
            }
          } else if (field === 'date_of_birth' || field === 'joining_date') {
            member[field] = parseDate(value);
          } else {
            (member as any)[field] = value;
          }
        }
      });

      // Validate required fields
      if (member.first_name && member.last_name) {
        members.push(member as ParsedMember);
      }
    }

    return members;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parseDate = (value: string): string | undefined => {
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format.source.startsWith('^(\\d{4})')) {
          return value;
        } else {
          const [, day, month, year] = match;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    return undefined;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const content = await file.text();
      const members = parseCSV(content);
      
      if (members.length === 0) {
        toast({
          title: 'No valid members found',
          description: 'Please check your CSV file has first_name and last_name columns',
          variant: 'destructive',
        });
        return;
      }

      setParsedMembers(members);
      setStep('preview');
      toast({
        title: `Found ${members.length} members`,
        description: 'Review the data before importing',
      });
    } catch (error) {
      toast({
        title: 'Error parsing file',
        description: 'Please ensure the file is a valid CSV',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFileUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const handleImport = async () => {
    setStep('importing');
    setProgress({ current: 0, total: parsedMembers.length, percent: 0 });
    const results: ImportResult[] = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < parsedMembers.length; i += BATCH_SIZE) {
      const batch = parsedMembers.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (member) => {
          try {
            const response = await supabase.functions.invoke('create-member', {
              body: {
                first_name: member.first_name,
                middle_name: member.middle_name || null,
                last_name: member.last_name,
                gender: member.gender || null,
                date_of_birth: member.date_of_birth || null,
                email: member.email || null,
                course_duration: member.course_duration || null,
                college_name: member.college_name || 'Silver Oak University',
                academic_department: member.academic_department || null,
                current_semester: member.current_semester || null,
                enrollment_number: member.enrollment_number || null,
                whatsapp_number: member.whatsapp_number || null,
                blood_group: member.blood_group || null,
                class_coordinator_name: member.class_coordinator_name || null,
                hod_name: member.hod_name || null,
                principal_name: member.principal_name || null,
                joining_date: member.joining_date || null,
                role: member.role || 'member',
              },
            });

            if (response.error) {
              return {
                success: false,
                error: response.error.message || 'Failed to create member',
                member,
              };
            }

            const data = response.data;
            if (!data.success) {
              return {
                success: false,
                error: data.error || 'Failed to create member',
                member,
              };
            }

            return {
              success: true,
              uid: data.uid,
              password: data.password,
              member,
            };
          } catch (error: any) {
            return {
              success: false,
              error: error.message || 'Unknown error',
              member,
            };
          }
        })
      );

      results.push(...batchResults);
      
      const current = Math.min(i + BATCH_SIZE, parsedMembers.length);
      setProgress({
        current,
        total: parsedMembers.length,
        percent: Math.round((current / parsedMembers.length) * 100),
      });

      if (i + BATCH_SIZE < parsedMembers.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setImportResults(results);
    setStep('results');
    onComplete();

    const successCount = results.filter(r => r.success).length;
    toast({
      title: 'Import Complete',
      description: `${successCount} of ${results.length} members imported successfully`,
    });
  };

  const downloadCredentials = () => {
    const successfulResults = importResults.filter(r => r.success);
    const csv = [
      ['UID', 'Password', 'First Name', 'Last Name', 'Enrollment Number', 'WhatsApp'].join(','),
      ...successfulResults.map(r => [
        r.uid,
        r.password,
        r.member.first_name,
        r.member.last_name,
        r.member.enrollment_number || '',
        r.member.whatsapp_number || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsg_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const headers = [
      'First Name',
      'Middle Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'Email',
      'Course Duration',
      'College Name',
      'Department',
      'Current Semester',
      'Enrollment Number',
      'WhatsApp Number',
      'Blood Group',
      'Class Coordinator Name',
      'HOD Name',
      'Principal Name',
      'Joining Date',
    ];
    const csv = headers.join(',') + '\nJohn,,Doe,Male,2000-01-15,john@example.com,4 Year,Silver Oak University,Computer Science,3,EN123456,9876543210,A+,Prof. Smith,Dr. Johnson,Dr. Brown,2024-01-01';
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bsg_member_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setStep('upload');
    setParsedMembers([]);
    setImportResults([]);
    setProgress({ current: 0, total: 0, percent: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Import Members</DialogTitle>
              <DialogDescription>
                Upload a CSV file with member details. The file should have columns matching the required fields.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              
              <div
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isProcessing && inputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleInputChange}
                  disabled={isProcessing}
                  className="hidden"
                />
                
                {isProcessing ? (
                  <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin text-primary" />
                ) : (
                  <FileSpreadsheet className={cn(
                    'mx-auto h-12 w-12 mb-4 transition-colors',
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  )} />
                )}
                
                <p className="text-sm font-medium mb-1">
                  {isDragging ? 'Drop CSV file here' : 'Drag & drop CSV file here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Required columns:</strong> First Name, Last Name</p>
                <p><strong>Optional columns:</strong> Middle Name, Gender, Date of Birth, Email, Course Duration, College Name, Department, Semester, Enrollment Number, WhatsApp, Blood Group, etc.</p>
                <p className="text-xs">Column headers are matched automatically (e.g., "First Name", "first_name", "firstname" all work)</p>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>Preview Import Data</DialogTitle>
              <DialogDescription>
                Review {parsedMembers.length} members before importing. Scroll to see all entries.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>WhatsApp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedMembers.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {member.first_name} {member.middle_name || ''} {member.last_name}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {member.college_name || 'Silver Oak University'}
                      </TableCell>
                      <TableCell>{member.academic_department || '-'}</TableCell>
                      <TableCell>{member.enrollment_number || '-'}</TableCell>
                      <TableCell>{member.whatsapp_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedMembers.length} Members
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'importing' && (
          <>
            <DialogHeader>
              <DialogTitle>Importing Members...</DialogTitle>
              <DialogDescription>
                Please wait while members are being created. Do not close this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <Progress value={progress.percent} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progress.current} of {progress.total} members processed ({progress.percent}%)
              </p>
            </div>
          </>
        )}

        {step === 'results' && (
          <>
            <DialogHeader>
              <DialogTitle>Import Results</DialogTitle>
              <DialogDescription>
                {importResults.filter(r => r.success).length} of {importResults.length} members imported successfully
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>UID</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>
                        {result.member.first_name} {result.member.last_name}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">
                          {result.uid || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {result.password ? (
                          <code className="text-sm bg-muted px-1 rounded">
                            {result.password}
                          </code>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-destructive text-sm max-w-[200px] truncate">
                        {result.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              {importResults.some(r => r.success) && (
                <Button variant="outline" onClick={downloadCredentials}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Credentials CSV
                </Button>
              )}
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
