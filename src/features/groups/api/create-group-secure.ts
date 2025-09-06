import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// Type definitions
type Group = Database['public']['Tables']['groups']['Row']
type GroupInsert = Database['public']['Tables']['groups']['Insert']

// Custom error class for detailed error handling
export class SecureGroupError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
    public userAction?: string
  ) {
    super(message)
    this.name = 'SecureGroupError'
  }
}

/**
 * Securely creates a new group in Supabase for the authenticated user
 * 
 * @param groupName - The name of the group to create
 * @returns Promise<{ groupId: string, groupName: string }> - Success response with group details
 * @throws SecureGroupError - For authentication, validation, or database errors
 */
export async function createGroupSecure(groupName: string): Promise<{ groupId: string, groupName: string }> {
  try {
    // Step 1: Validate input
    if (!groupName || typeof groupName !== 'string') {
      throw new SecureGroupError(
        'Group name is required and must be a string',
        'INVALID_INPUT',
        { providedName: groupName },
        'Please provide a valid group name'
      )
    }

    const trimmedName = groupName.trim()
    if (trimmedName.length === 0) {
      throw new SecureGroupError(
        'Group name cannot be empty',
        'EMPTY_NAME',
        { providedName: groupName },
        'Please enter a group name'
      )
    }

    if (trimmedName.length > 100) {
      throw new SecureGroupError(
        'Group name must be 100 characters or less',
        'NAME_TOO_LONG',
        { providedName: groupName, length: trimmedName.length },
        'Please shorten the group name'
      )
    }

    console.log('🔐 Starting secure group creation process...')
    console.log('📝 Group name:', trimmedName)

    // Step 2: Get authenticated user's UUID
    console.log('🔍 Getting authenticated user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Authentication error:', authError)
      throw new SecureGroupError(
        `Authentication failed: ${authError.message}`,
        'AUTH_ERROR',
        authError,
        'Please try logging in again'
      )
    }

    if (!user) {
      console.error('❌ No authenticated user found')
      throw new SecureGroupError(
        'User not authenticated. Please log in to create groups.',
        'UNAUTHENTICATED',
        null,
        'Please log in to your account'
      )
    }

    console.log('✅ User authenticated successfully')
    console.log('👤 User ID:', user.id)
    console.log('📧 User email:', user.email)

    // Step 3: Prepare insert data with exact user UUID
    const insertData: GroupInsert = {
      name: trimmedName,
      created_by: user.id  // Must be exact user UUID for RLS policies
    }

    console.log('📦 Insert data prepared:', insertData)

    // Step 4: Insert new group record
    console.log('💾 Inserting group into database...')
    const { data, error } = await supabase
      .from('groups')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      
      // Handle specific Supabase error codes
      switch (error.code) {
        case '42501':
          throw new SecureGroupError(
            'Permission denied. Row Level Security policy blocked the operation.',
            'PERMISSION_DENIED',
            error,
            'Please ensure you are logged in and try again'
          )
        
        case '23502':
          throw new SecureGroupError(
            'Null constraint violation. The created_by field cannot be null.',
            'NULL_CONSTRAINT_VIOLATION',
            error,
            'Please log in and try again'
          )
        
        case '23505':
          throw new SecureGroupError(
            'A group with this name already exists. Please choose a different name.',
            'DUPLICATE_NAME',
            error,
            'Please enter a unique group name'
          )
        
        case '23503':
          throw new SecureGroupError(
            'Foreign key constraint violation. Invalid user reference.',
            'INVALID_USER_REFERENCE',
            error,
            'Please log out and log back in'
          )
        
        case 'PGRST301':
          throw new SecureGroupError(
            'Database connection failed. Please check your connection.',
            'CONNECTION_ERROR',
            error,
            'Please check your internet connection and try again'
          )
        
        default:
          if (error.message.includes('row-level security')) {
            throw new SecureGroupError(
              `Row Level Security Policy Error: ${error.message}`,
              'RLS_POLICY_ERROR',
              error,
              'Please contact support if this persists'
            )
          }
          
          throw new SecureGroupError(
            `Database error: ${error.message}`,
            'DATABASE_ERROR',
            error,
            'Please try again or contact support'
          )
      }
    }

    if (!data) {
      throw new SecureGroupError(
        'Group was not created. No data returned from database.',
        'NO_DATA_RETURNED',
        null,
        'Please try again'
      )
    }

    // Step 5: Log success and return result
    console.log('🎉 Group created successfully!')
    console.log('🆔 Group ID:', data.id)
    console.log('📝 Group Name:', data.name)
    console.log('👤 Created By:', data.created_by)
    console.log('📅 Created At:', data.created_at)

    return {
      groupId: data.id,
      groupName: data.name
    }

  } catch (error) {
    // Re-throw SecureGroupError instances, wrap others
    if (error instanceof SecureGroupError) {
      throw error
    }
    
    console.error('💥 Unexpected error in createGroupSecure:', error)
    throw new SecureGroupError(
      'An unexpected error occurred while creating the group',
      'UNEXPECTED_ERROR',
      error,
      'Please try again or contact support'
    )
  }
}

/**
 * Helper function to test the secure group creation
 * This can be used for debugging and testing
 */
export async function testSecureGroupCreation(): Promise<void> {
  console.log('🧪 Testing secure group creation...')
  
  try {
    // Test with a unique name
    const testName = `Test Group ${Date.now()}`
    const result = await createGroupSecure(testName)
    
    console.log('✅ Test successful!')
    console.log('📊 Result:', result)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof SecureGroupError) {
      console.error('Error Code:', error.code)
      console.error('User Action:', error.userAction)
    }
  }
}

// Export types for external use
export type { Group, GroupInsert }
