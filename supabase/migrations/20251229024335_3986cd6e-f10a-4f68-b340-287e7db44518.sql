-- =============================================
-- Security Hardening Migration
-- =============================================

-- a) Update RLS policies to explicitly check for authenticated users (auth.uid() IS NOT NULL)
-- b) Improve leave_requests privacy with stronger isolation
-- c) Ensure user_roles immutability - only admins can modify

-- =============================================
-- 1. PROFILES TABLE - Add auth.uid() IS NOT NULL checks
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Recreate with explicit authentication checks
CREATE POLICY "Users can view own profile or admins view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_or_coordinator(auth.uid()) OR 
    (user_id = auth.uid())
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- =============================================
-- 2. LEAVE_REQUESTS TABLE - Strengthen privacy
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own leave" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create leave request" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can update leave" ON public.leave_requests;

-- Recreate with explicit authentication and strict ownership
CREATE POLICY "Users can view own leave requests only" 
ON public.leave_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Users can ONLY see their own requests
    user_id = auth.uid() OR 
    -- Admins/coordinators can see all for management purposes
    is_admin_or_coordinator(auth.uid())
  )
);

CREATE POLICY "Users can create own leave request" 
ON public.leave_requests 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Admins can update leave requests" 
ON public.leave_requests 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- =============================================
-- 3. USER_ROLES TABLE - Ensure immutability
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles or admins view all" ON public.user_roles;

-- Recreate with strict admin-only modification
CREATE POLICY "Users can view own role or admins view all" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

-- Only admins can INSERT roles (for new user creation)
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Only admins can UPDATE roles (for role changes)
CREATE POLICY "Only admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Only admins can DELETE roles
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::user_role)
);

-- =============================================
-- 4. OTHER SENSITIVE TABLES - Add auth checks
-- =============================================

-- ATTENDANCE TABLE
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;

CREATE POLICY "Users can view own attendance" 
ON public.attendance 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid())
  )
);

CREATE POLICY "Admins can manage attendance" 
ON public.attendance 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- CERTIFICATES TABLE
DROP POLICY IF EXISTS "Users can view own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can manage certificates" ON public.certificates;

CREATE POLICY "Users can view own certificates" 
ON public.certificates 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid())
  )
);

CREATE POLICY "Admins can manage certificates" 
ON public.certificates 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Admins can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- RESOURCE_ASSIGNMENTS TABLE
DROP POLICY IF EXISTS "Users can view own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.resource_assignments;

CREATE POLICY "Users can view own assignments" 
ON public.resource_assignments 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid())
  )
);

CREATE POLICY "Admins can manage assignments" 
ON public.resource_assignments 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin_or_coordinator(auth.uid())
);

-- ACTIVITY_REGISTRATIONS TABLE
DROP POLICY IF EXISTS "Users can view own registrations or admins view all" ON public.activity_registrations;
DROP POLICY IF EXISTS "Users can register themselves" ON public.activity_registrations;
DROP POLICY IF EXISTS "Users can unregister themselves" ON public.activity_registrations;

CREATE POLICY "Users can view own registrations or admins view all" 
ON public.activity_registrations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid())
  )
);

CREATE POLICY "Users can register themselves" 
ON public.activity_registrations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Users can unregister themselves" 
ON public.activity_registrations 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_admin_or_coordinator(auth.uid())
  )
);