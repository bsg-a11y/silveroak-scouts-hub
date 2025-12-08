import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  UserX
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@/types';

// Mock member data
const mockMembers = [
  {
    id: '1',
    uid: 'BSG001',
    firstName: 'Rahul',
    middleName: 'Kumar',
    lastName: 'Sharma',
    gender: 'male',
    collegeName: 'Silver Oak University',
    currentSemester: 5,
    enrollmentNumber: 'SOU2022001',
    whatsappNumber: '9876543210',
    bloodGroup: 'O+',
    status: 'active',
    role: 'member' as UserRole,
  },
  {
    id: '2',
    uid: 'BSG002',
    firstName: 'Priya',
    middleName: '',
    lastName: 'Patel',
    gender: 'female',
    collegeName: 'Silver Oak University',
    currentSemester: 3,
    enrollmentNumber: 'SOU2023045',
    whatsappNumber: '9876543211',
    bloodGroup: 'A+',
    status: 'active',
    role: 'core_committee' as UserRole,
  },
  {
    id: '3',
    uid: 'BSG003',
    firstName: 'Amit',
    middleName: 'Singh',
    lastName: 'Rajput',
    gender: 'male',
    collegeName: 'Silver Oak University',
    currentSemester: 7,
    enrollmentNumber: 'SOU2021089',
    whatsappNumber: '9876543212',
    bloodGroup: 'B+',
    status: 'inactive',
    role: 'executive_committee' as UserRole,
  },
  {
    id: '4',
    uid: 'BSG004',
    firstName: 'Sneha',
    middleName: 'Dinesh',
    lastName: 'Mehta',
    gender: 'female',
    collegeName: 'Silver Oak University',
    currentSemester: 5,
    enrollmentNumber: 'SOU2022156',
    whatsappNumber: '9876543213',
    bloodGroup: 'AB+',
    status: 'active',
    role: 'institute_coordinator' as UserRole,
  },
];

export default function Members() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = mockMembers.filter(
    (member) =>
      member.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: UserRole) => {
    const variants: Record<UserRole, 'admin' | 'coordinator' | 'executive' | 'core' | 'member'> = {
      admin: 'admin',
      institute_coordinator: 'coordinator',
      executive_committee: 'executive',
      core_committee: 'core',
      member: 'member',
    };
    return variants[role];
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold font-display">{mockMembers.length}</p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold font-display text-secondary">
                {mockMembers.filter(m => m.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold font-display text-muted-foreground">
                {mockMembers.filter(m => m.status === 'inactive').length}
              </p>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Committee Members</p>
              <p className="text-2xl font-bold font-display text-primary">
                {mockMembers.filter(m => m.role !== 'member').length}
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
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {member.firstName[0]}{member.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.firstName} {member.middleName} {member.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.whatsappNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 rounded bg-muted text-sm font-mono">
                          {member.uid}
                        </code>
                      </TableCell>
                      <TableCell>{member.enrollmentNumber}</TableCell>
                      <TableCell>Sem {member.currentSemester}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.status === 'active' ? (
                          <span className="status-active">Active</span>
                        ) : (
                          <span className="status-inactive">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
