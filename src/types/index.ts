// User Role Types
export type UserRole = 
  | 'admin' 
  | 'institute_coordinator' 
  | 'executive_committee' 
  | 'core_committee' 
  | 'member';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  institute_coordinator: 'Institute Coordinator',
  executive_committee: 'Executive Committee',
  core_committee: 'Core Committee',
  member: 'Member',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'admin',
  institute_coordinator: 'coordinator',
  executive_committee: 'executive',
  core_committee: 'core',
  member: 'member',
};

// Member Types
export interface Member {
  id: string;
  uid: string; // BSG001, BSG002, etc.
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  courseDuration: string;
  collegeName: string;
  currentSemester: number;
  enrollmentNumber: string;
  classCoordinatorName: string;
  hodName: string;
  principalName: string;
  whatsappNumber: string;
  aadhaarNumber: string; // Masked in display
  bloodGroup: string;
  profilePhoto?: string;
  status: 'active' | 'inactive';
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Activity Types
export interface Activity {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  registrationEnabled: boolean;
  capacity?: number;
  registeredCount: number;
  createdBy: string;
  createdAt: string;
}

// Announcement Types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  attachmentUrl?: string;
  importance: 'normal' | 'urgent';
  expiryDate?: string;
  createdBy: string;
  createdAt: string;
}

// Meeting Types
export interface Meeting {
  id: string;
  title: string;
  agenda: string;
  date: string;
  time: string;
  location: string;
  momUrl?: string;
  createdBy: string;
  createdAt: string;
}

// Leave Request Types
export interface LeaveRequest {
  id: string;
  memberId: string;
  memberName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  category: 'uniform' | 'scarf' | 'badge' | 'voucher' | 'material';
  totalCount: number;
  assignedCount: number;
  availableCount: number;
  lowStockThreshold: number;
  updatedAt: string;
}

// Attendance Types
export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  eventId: string;
  eventType: 'activity' | 'meeting';
  eventName: string;
  date: string;
  present: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'activity' | 'leave' | 'announcement' | 'meeting' | 'certificate';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  upcomingActivities: number;
  pendingLeaves: number;
  lowStockItems: number;
  averageAttendance: number;
}
