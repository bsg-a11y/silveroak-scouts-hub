
# Plan: Fix Create Member Function and Improve Reliability

## Problem Summary
The "2x function" error is not a load capacity issue. The portal can handle significantly more members than the current 16. The error is coming from:
1. A potentially slow operation in the edge function (`listUsers()` fetching all users)
2. Validation errors returning as 400 status codes

## Solution

### Phase 1: Optimize the Create Member Edge Function

**File:** `supabase/functions/create-member/index.ts`

**Changes:**
1. Replace the inefficient `listUsers()` call with a targeted query:
   - Current code fetches ALL users to check if an email exists
   - New code will use `getUserByEmail()` or a direct query for the specific email only

2. Add better error logging to help debug future issues

3. Add a timeout wrapper for database operations

```text
Current (slow):
const { data: authUsers } = await adminClient.auth.admin.listUsers();
const existingAuthUser = authUsers?.users?.find(u => u.email === emailToCheck);

Optimized:
const { data: existingUser } = await adminClient
  .from('auth.users')
  .select('id')
  .eq('email', emailToCheck)
  .maybeSingle();
```

### Phase 2: Add User-Friendly Error Messages

**File:** `src/hooks/useMembers.ts`

**Changes:**
- Improve error message display to show exactly what went wrong
- Add retry logic for transient failures
- Show specific validation errors to the user

### Phase 3: Add Request Timeout Handling

**File:** `supabase/functions/create-member/index.ts`

**Changes:**
- Wrap long-running operations with timeout protection
- Add comprehensive logging for each step
- Return descriptive errors for each failure point

---

## Technical Details

### Edge Function Limits
- **CPU Time Limit**: 2 seconds (cumulative processing time)
- **Wall Clock Limit**: 150 seconds (total request time)
- **Memory**: 256MB default

The current 1.2-1.7 second execution times are fine, but the `listUsers()` call will become slower as users grow.

### Estimated Capacity
With the optimizations:
- The portal can easily handle **hundreds to thousands of members**
- Concurrent member creation: ~10-20 simultaneous requests
- Database capacity is not a limiting factor

### Files to Modify
1. `supabase/functions/create-member/index.ts` - Optimize user lookup
2. `src/hooks/useMembers.ts` - Better error handling
3. `supabase/config.toml` - Add function configuration if needed

### Implementation Steps
1. Update the edge function to use efficient user lookup
2. Deploy and test member creation
3. Add better error messages in the frontend
4. Monitor logs for any remaining issues

