
# Plan: Add Custom Password Support for Password Reset

## Overview
Enable admins to set custom passwords when resetting member passwords, in addition to the existing auto-generate option. The backend edge function already supports this - we just need to update the UI.

## Current State Analysis

### Backend (Already Working)
The `reset-password` edge function at `supabase/functions/reset-password/index.ts` already accepts an optional `new_password` parameter:
- If `new_password` is provided, it uses that password
- If not provided, it auto-generates a secure 16-character password

### Frontend (Needs Update)
The Reset Password dialog in `src/pages/Members.tsx` (lines 1060-1122) currently:
- Only shows a confirmation message
- Automatically generates a random password
- Does not allow admin to enter a custom password

---

## Implementation Plan

### Phase 1: Update Reset Password Dialog UI

**File:** `src/pages/Members.tsx`

**Changes:**
1. Add a new state variable `customPassword` to store admin-entered password
2. Add a toggle to switch between "Auto-generate" and "Custom password" modes
3. Add a password input field that appears when custom mode is selected
4. Add password visibility toggle for the custom password field
5. Add password validation (minimum 6 characters)

**New UI Layout:**
```text
+------------------------------------------+
|  Reset Password                          |
|  ----------------------------------------|
|  Member: John Doe                        |
|                                          |
|  Password Type:                          |
|  [Auto-generate] [Custom Password]       |
|                                          |
|  (If Custom selected):                   |
|  New Password: [______________] [Eye]    |
|  Min. 6 characters                       |
|                                          |
|  [Cancel]            [Reset Password]    |
+------------------------------------------+
```

### Phase 2: Update Password Reset Handler

**File:** `src/pages/Members.tsx`

**Changes to `handleResetPassword` function:**
1. Check if custom password mode is selected
2. Validate custom password length (minimum 6 characters)
3. Pass `new_password` to edge function when custom password is provided
4. Show appropriate success message based on mode used

**Updated API call:**
```typescript
const response = await supabase.functions.invoke('reset-password', {
  body: { 
    user_id: resetPasswordMember.userId,
    new_password: useCustomPassword ? customPassword : undefined
  },
});
```

---

## Technical Details

### State Variables to Add
```typescript
const [useCustomPassword, setUseCustomPassword] = useState(false);
const [customPassword, setCustomPassword] = useState('');
const [showCustomPassword, setShowCustomPassword] = useState(false);
```

### Validation Rules
- Custom password minimum length: 6 characters (matching existing member creation validation)
- Disable "Reset Password" button if custom mode is selected but password is too short

### Reset State on Dialog Close
When the dialog closes, reset all password-related states:
- `customPassword` → ''
- `useCustomPassword` → false
- `showCustomPassword` → false

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Members.tsx` | Add custom password UI, state management, and update handler |

## Security Considerations
- Password is transmitted over HTTPS to the edge function
- Edge function already validates admin role before allowing password reset
- Custom password follows same security path as auto-generated password

## Implementation Steps
1. Add new state variables for custom password functionality
2. Update the Reset Password dialog UI with toggle and input field
3. Modify `handleResetPassword` to pass custom password when provided
4. Add password visibility toggle using Eye/EyeOff icons
5. Add validation feedback for password length
6. Reset all states when dialog closes

