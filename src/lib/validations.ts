import { z } from 'zod';

// Custom validation for enrollment number based on semester
const enrollmentValidation = z.string()
  .optional()
  .nullable()
  .or(z.literal(''))
  .superRefine((val, ctx) => {
    if (!val || val === '') return; // Empty is allowed
    
    // Check if it starts with 'T' (1st semester) or is numeric only (other semesters)
    const startsWithT = /^T\d{13}$/i.test(val);
    const isNumericOnly = /^\d{13}$/.test(val);
    
    if (!startsWithT && !isNumericOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enrollment number must be either T followed by 13 digits (for 1st sem) or exactly 13 digits (for other sems)',
      });
    }
  });

// Member validation schema
export const memberSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  middle_name: z.string().trim().max(50, 'Middle name must be less than 50 characters').optional().nullable().or(z.literal('')),
  last_name: z.string().trim().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable().or(z.literal('')),
  course_duration: z.string().max(50).optional().nullable().or(z.literal('')),
  college_name: z.string().max(200).optional().nullable().or(z.literal('')),
  current_semester: z.number().int().min(1).max(12).optional().nullable(),
  enrollment_number: enrollmentValidation,
  class_coordinator_name: z.string().max(100).optional().nullable().or(z.literal('')),
  hod_name: z.string().max(100).optional().nullable().or(z.literal('')),
  principal_name: z.string().max(100).optional().nullable().or(z.literal('')),
  whatsapp_number: z.string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      return /^\d{10}$/.test(val);
    }, { message: 'WhatsApp number must be exactly 10 digits' }),
  aadhaar_number: z.string().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits').optional().nullable().or(z.literal('')),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
  role: z.enum(['admin', 'coordinator', 'executive', 'core', 'member']).optional(),
});

// Enrollment validation with semester context
export const validateEnrollmentNumber = (enrollmentNumber: string, semester: number | null | undefined): string | null => {
  if (!enrollmentNumber || enrollmentNumber === '') return null;
  
  if (semester === 1) {
    // 1st semester: must start with T followed by 13 digits
    if (!/^T\d{13}$/i.test(enrollmentNumber)) {
      return 'For 1st semester, enrollment number must start with "T" followed by 13 digits (total 14 characters)';
    }
  } else if (semester && semester > 1) {
    // Other semesters: must be exactly 13 digits
    if (!/^\d{13}$/.test(enrollmentNumber)) {
      return 'For semester 2 and above, enrollment number must be exactly 13 digits';
    }
  } else {
    // No semester specified, accept both formats
    const startsWithT = /^T\d{13}$/i.test(enrollmentNumber);
    const isNumericOnly = /^\d{13}$/.test(enrollmentNumber);
    if (!startsWithT && !isNumericOnly) {
      return 'Enrollment number must be either T followed by 13 digits (for 1st sem) or exactly 13 digits (for other sems)';
    }
  }
  
  return null;
};

export type ValidatedMemberData = z.infer<typeof memberSchema>;

// Leave request validation schema
export const leaveRequestSchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reason: z.string().trim().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
}).refine(data => new Date(data.from_date) <= new Date(data.to_date), {
  message: 'From date must be before or equal to to date',
  path: ['from_date'],
});

// Activity validation schema
export const activitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  activity_time: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  registration_enabled: z.boolean().optional(),
});

// Announcement validation schema  
export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().trim().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  importance: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// Meeting validation schema
export const meetingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  agenda: z.string().max(2000, 'Agenda must be less than 2000 characters').optional().nullable(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  meeting_time: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
});

// Certificate validation schema
export const certificateSchema = z.object({
  name: z.string().trim().min(1, 'Certificate name is required').max(200),
  event_name: z.string().trim().min(1, 'Event name is required').max(200),
  user_id: z.string().uuid('Invalid user ID'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  certificate_url: z.string().url().optional().nullable(),
});

// Validation helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.errors.map(e => e.message).join(', ');
  return { success: false, error: errorMessage };
}
