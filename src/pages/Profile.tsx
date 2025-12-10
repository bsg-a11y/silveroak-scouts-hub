import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pencil, 
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  Building,
  Shield,
  Award,
  ClipboardCheck,
  FileText
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@/types';

// Mock user profile data
const mockProfile = {
  uid: 'BSG001',
  firstName: 'Rahul',
  middleName: 'Kumar',
  lastName: 'Sharma',
  gender: 'male',
  dateOfBirth: '2003-05-15',
  courseDuration: '4 Years',
  collegeName: 'Silver Oak University',
  currentSemester: 5,
  enrollmentNumber: 'SOU2022001',
  classCoordinatorName: 'Dr. Amit Patel',
  hodName: 'Prof. Sneha Mehta',
  principalName: 'Dr. Rajesh Kumar',
  whatsappNumber: '+91 98765 43210',
  email: 'rahul.sharma@sou.edu.in',
  bloodGroup: 'O+',
  status: 'active',
  role: 'member' as UserRole,
  joinedDate: '2022-08-01',
};

const mockActivityHistory = [
  { id: 1, name: 'Tree Plantation Drive', date: '2024-11-15', attended: true },
  { id: 2, name: 'First Aid Training', date: '2024-11-10', attended: true },
  { id: 3, name: 'Community Service', date: '2024-10-28', attended: false },
  { id: 4, name: 'Leadership Workshop', date: '2024-10-15', attended: true },
];

const mockCertificates = [
  { id: 1, name: 'Scout Basic Training', issuedDate: '2023-03-15', event: 'Basic Training Camp' },
  { id: 2, name: 'First Aid Certificate', issuedDate: '2024-01-20', event: 'First Aid Training' },
];

const mockLeaveHistory = [
  { id: 1, from: '2024-11-01', to: '2024-11-02', reason: 'Family function', status: 'approved' },
  { id: 2, from: '2024-10-15', to: '2024-10-15', reason: 'Medical appointment', status: 'approved' },
];

export default function Profile() {
  const fullName = `${mockProfile.firstName} ${mockProfile.middleName} ${mockProfile.lastName}`.trim();
  const attendancePercentage = Math.round(
    (mockActivityHistory.filter(a => a.attended).length / mockActivityHistory.length) * 100
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="h-24 w-24 md:h-32 md:w-32">
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-display">
                    {mockProfile.firstName[0]}{mockProfile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="mt-4">
                  <Pencil className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold font-display text-foreground">
                      {fullName}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <code className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-mono font-medium">
                        {mockProfile.uid}
                      </code>
                      <Badge variant={mockProfile.status === 'active' ? 'active' : 'inactive'}>
                        {mockProfile.status === 'active' ? 'Active Member' : 'Inactive'}
                      </Badge>
                      <Badge variant="member">
                        {ROLE_LABELS[mockProfile.role]}
                      </Badge>
                    </div>
                  </div>
                  <Button>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="text-sm font-medium">{mockProfile.whatsappNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-medium">{mockProfile.dateOfBirth}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Blood Group</p>
                      <p className="text-sm font-medium">{mockProfile.bloodGroup}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <ClipboardCheck className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{attendancePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{mockActivityHistory.length}</p>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{mockCertificates.length}</p>
                  <p className="text-xs text-muted-foreground">Certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{mockLeaveHistory.length}</p>
                  <p className="text-xs text-muted-foreground">Leaves Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <Tabs defaultValue="academic">
            <CardHeader className="border-b border-border/50 pb-0">
              <TabsList>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="leaves">Leave History</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="academic" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Academic Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Enrollment Number</span>
                        <span className="font-medium">{mockProfile.enrollmentNumber}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Current Semester</span>
                        <span className="font-medium">Semester {mockProfile.currentSemester}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Course Duration</span>
                        <span className="font-medium">{mockProfile.courseDuration}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">College</span>
                        <span className="font-medium">{mockProfile.collegeName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      Institute Contacts
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Class Coordinator</span>
                        <span className="font-medium">{mockProfile.classCoordinatorName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">HOD</span>
                        <span className="font-medium">{mockProfile.hodName}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Principal</span>
                        <span className="font-medium">{mockProfile.principalName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <div className="space-y-3">
                  {mockActivityHistory.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                    >
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">{activity.date}</p>
                      </div>
                      <Badge variant={activity.attended ? 'success' : 'danger'}>
                        {activity.attended ? 'Present' : 'Absent'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="certificates" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockCertificates.map((cert) => (
                    <Card key={cert.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <Award className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{cert.name}</h4>
                            <p className="text-sm text-muted-foreground">{cert.event}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Issued: {cert.issuedDate}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="leaves" className="mt-0">
                <div className="space-y-3">
                  {mockLeaveHistory.map((leave) => (
                    <div 
                      key={leave.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                    >
                      <div>
                        <p className="font-medium">{leave.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {leave.from} {leave.from !== leave.to && `to ${leave.to}`}
                        </p>
                      </div>
                      <Badge variant={leave.status === 'approved' ? 'success' : 'warning'}>
                        {leave.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
