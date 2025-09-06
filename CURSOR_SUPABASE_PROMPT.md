# Cursor Supabase Integration Prompt

## 🎯 Complete Cursor Prompt for Supabase Operations

Copy and paste this prompt into Cursor for comprehensive Supabase integration:

```
You are an intelligent AI agent integrated with Supabase via Cursor. Your task is to securely interact with the Supabase database following these principles:

## Database Schema Context:
- **Groups Table**: id (UUID, PK), name (TEXT, NOT NULL), created_by (UUID, FK to auth.users), created_at (TIMESTAMPTZ)
- **RLS Policies**: All operations require created_by = auth.uid() for user data isolation
- **Authentication**: Use supabase.auth.getUser() to get current user
- **Error Handling**: Handle codes 42501 (permission), 23502 (null), 23505 (duplicate), 23503 (foreign key)

## Security Requirements:
1. Always verify user authentication before database operations
2. Use exact user UUID from auth.getUser() for created_by fields
3. Respect Row Level Security policies
4. Handle all Supabase error codes with specific messages
5. Log operations for debugging and security auditing

## Code Pattern:
```typescript
// 1. Authenticate user
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) throw new Error("User not authenticated")

// 2. Prepare data with user UUID
const insertData = { name: inputName, created_by: user.id }

// 3. Execute with error handling
const { data, error } = await supabase
  .from('table_name')
  .insert(insertData)
  .select()
  .single()

if (error) {
  // Handle specific error codes
  switch (error.code) {
    case '42501': throw new Error("Permission denied")
    case '23502': throw new Error("Null constraint violation")
    // ... other codes
  }
}

return data
```

## Current Task:
[Describe your specific Supabase operation here]

Provide complete, secure, and well-documented code with comprehensive error handling.
```

## 🔧 Specific Operation Prompts

### For Group Creation:
```
Create a secure function to add a new group in Supabase for the logged-in user, verifying user authentication, inserting group with name and created_by, handling all errors and respecting RLS policies. Include detailed logging and specific error messages for each failure scenario.
```

### For Data Retrieval:
```
Create a secure function to retrieve user's groups from Supabase, ensuring proper authentication, respecting RLS policies, and handling all possible error scenarios with specific error messages.
```

### For Updates:
```
Create a secure function to update a group in Supabase, verifying user ownership through RLS policies, handling authentication errors, and providing detailed error messages for permission and constraint violations.
```

### For Deletions:
```
Create a secure function to delete a group in Supabase, ensuring user ownership verification, proper authentication checks, and comprehensive error handling for all failure scenarios.
```

## 📋 Error Code Reference

| Code | Meaning | User Action |
|------|---------|-------------|
| 42501 | Permission denied (RLS) | Check authentication |
| 23502 | Null constraint violation | Provide required fields |
| 23505 | Unique constraint violation | Use unique values |
| 23503 | Foreign key constraint | Check referenced data |
| PGRST301 | Connection error | Check network/credentials |

## 🛡️ Security Checklist

- [ ] User authentication verified
- [ ] User UUID used for created_by
- [ ] RLS policies respected
- [ ] Input validation performed
- [ ] Error codes handled specifically
- [ ] Sensitive data not logged
- [ ] Operations logged for audit

## 📝 Example Usage

```typescript
// Import the secure function
import { createGroupSecure } from '@/features/groups/api/create-group-secure'

// Use in your component
try {
  const result = await createGroupSecure('My New Group')
  console.log('Group created:', result.groupId)
} catch (error) {
  if (error instanceof SecureGroupError) {
    console.error('Error:', error.message)
    console.error('User Action:', error.userAction)
  }
}
```

This prompt provides comprehensive context for Cursor to generate secure, well-structured Supabase code with proper error handling and security considerations.
