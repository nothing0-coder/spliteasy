# Group Management API

This module provides optimized, strongly typed functions for managing expense-splitting groups in SplitEasy. The functions are designed for production use with 100+ concurrent users and include comprehensive error handling, input validation, and performance optimizations.

## Features

- ✅ **Strongly Typed**: Full TypeScript support with generated database types
- ✅ **Production Ready**: Optimized for 100+ concurrent users
- ✅ **Comprehensive Error Handling**: Custom error classes with specific error codes
- ✅ **Input Validation**: Client-side and server-side validation
- ✅ **Row Level Security**: Built-in security with Supabase RLS policies
- ✅ **Performance Optimized**: Efficient queries with proper indexing
- ✅ **Dual API**: Both client-side and server-side functions available

## Quick Start

### Client-Side Usage (React Components)

```typescript
import { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, GroupError } from '@/features/groups/api'

// Create a new group
try {
  const group = await createGroup('Vacation Trip', 'Our summer vacation expenses')
  console.log('Created group:', group)
} catch (error) {
  if (error instanceof GroupError) {
    console.error('Group error:', error.message, error.code)
  }
}

// Get all user's groups
try {
  const groups = await getGroups()
  console.log('User groups:', groups)
} catch (error) {
  console.error('Failed to fetch groups:', error)
}

// Get specific group
try {
  const group = await getGroupById('group-uuid-here')
  console.log('Group details:', group)
} catch (error) {
  console.error('Failed to fetch group:', error)
}

// Update group
try {
  const updatedGroup = await updateGroup('group-uuid-here', {
    name: 'Updated Group Name',
    description: 'Updated description'
  })
  console.log('Updated group:', updatedGroup)
} catch (error) {
  console.error('Failed to update group:', error)
}

// Delete group
try {
  await deleteGroup('group-uuid-here')
  console.log('Group deleted successfully')
} catch (error) {
  console.error('Failed to delete group:', error)
}
```

### Server-Side Usage (API Routes)

```typescript
// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createGroupServer, getGroupsServer, GroupServerError } from '@/features/groups/api'

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()
    const group = await createGroupServer(name, description)
    return NextResponse.json({ success: true, data: group })
  } catch (error) {
    if (error instanceof GroupServerError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const groups = await getGroupsServer()
    return NextResponse.json({ success: true, data: groups })
  } catch (error) {
    if (error instanceof GroupServerError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## API Reference

### Client-Side Functions

#### `createGroup(name: string, description?: string): Promise<Group>`

Creates a new group with the specified name and optional description.

**Parameters:**
- `name` (string, required): Group name (max 100 characters)
- `description` (string, optional): Group description (max 500 characters)

**Returns:** Promise resolving to the created Group object

**Throws:** `GroupError` for validation or database errors

#### `getGroups(): Promise<Group[]>`

Fetches all groups owned by the current user.

**Returns:** Promise resolving to array of Group objects

**Throws:** `GroupError` for authentication or database errors

#### `getGroupById(id: string): Promise<Group>`

Fetches a single group by ID (only if user is the owner).

**Parameters:**
- `id` (string, required): Valid UUID of the group

**Returns:** Promise resolving to the Group object

**Throws:** `GroupError` for validation, authentication, or database errors

#### `updateGroup(id: string, updates: Partial<{ name: string; description: string }>): Promise<Group>`

Updates a group with the provided changes.

**Parameters:**
- `id` (string, required): Valid UUID of the group
- `updates` (object, required): Partial object with name and/or description

**Returns:** Promise resolving to the updated Group object

**Throws:** `GroupError` for validation, authentication, or database errors

#### `deleteGroup(id: string): Promise<void>`

Deletes a group (only if user is the owner).

**Parameters:**
- `id` (string, required): Valid UUID of the group

**Returns:** Promise resolving to void

**Throws:** `GroupError` for validation, authentication, or database errors

### Server-Side Functions

Server-side functions have the same API as client-side functions but with `Server` suffix:

- `createGroupServer(name, description?)`
- `getGroupsServer()`
- `getGroupByIdServer(id)`
- `updateGroupServer(id, updates)`
- `deleteGroupServer(id)`

These functions use the server-side Supabase client and are optimized for use in API routes and server components.

## Error Handling

All functions throw custom error classes with specific error codes:

### `GroupError` / `GroupServerError`

```typescript
class GroupError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  )
}
```

**Common Error Codes:**
- `INVALID_NAME`: Group name validation failed
- `INVALID_ID`: Invalid UUID format
- `UNAUTHENTICATED`: User not authenticated
- `NOT_FOUND`: Group not found or access denied
- `DUPLICATE_NAME`: Group name already exists
- `DATABASE_ERROR`: Database operation failed
- `UNEXPECTED_ERROR`: Unexpected error occurred

## Performance Optimizations

### Database Level
- **Indexes**: Optimized indexes on `owner_id` and `created_at`
- **RLS Policies**: Efficient row-level security policies
- **Single Queries**: Minimized database round trips

### Application Level
- **Input Validation**: Client-side validation reduces server load
- **Error Handling**: Specific error codes for better debugging
- **Type Safety**: Compile-time type checking prevents runtime errors
- **Connection Pooling**: Supabase handles connection pooling automatically

### Concurrency Handling
- **Row Level Security**: Prevents data races and unauthorized access
- **Optimistic Locking**: Supabase handles concurrent updates safely
- **Connection Limits**: Supabase manages connection limits automatically

## Security Features

- **Authentication Required**: All operations require authenticated users
- **Ownership Validation**: Users can only access groups they own
- **Input Sanitization**: All inputs are validated and sanitized
- **SQL Injection Protection**: Supabase client prevents SQL injection
- **RLS Policies**: Database-level security policies

## Database Schema

The functions work with the following groups table schema:

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Migration

Run the provided SQL migration to create the groups table with proper RLS policies:

```sql
-- See: supabase/migrations/001_create_groups_table_with_rls.sql
```

## Best Practices

1. **Always handle errors**: Use try-catch blocks and check error types
2. **Validate inputs**: Client-side validation improves UX
3. **Use appropriate functions**: Client functions for components, server functions for API routes
4. **Handle loading states**: Show loading indicators during async operations
5. **Cache results**: Consider caching group lists for better performance
6. **Monitor errors**: Log errors for debugging and monitoring

## Examples

See the example usage above and check the test files for comprehensive examples of error handling and edge cases.