import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// Type definitions for better type safety
type Group = Database['public']['Tables']['groups']['Row']
type GroupInsert = Database['public']['Tables']['groups']['Insert']
type GroupUpdate = Database['public']['Tables']['groups']['Update']

// Custom error class for group operations
export class GroupError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'GroupError'
  }
}

// Input validation helpers
const validateGroupName = (name: string): void => {
  if (!name || typeof name !== 'string') {
    throw new GroupError('Group name is required and must be a string', 'INVALID_NAME')
  }
  if (name.trim().length === 0) {
    throw new GroupError('Group name cannot be empty', 'EMPTY_NAME')
  }
  if (name.length > 100) {
    throw new GroupError('Group name must be 100 characters or less', 'NAME_TOO_LONG')
  }
}

const validateGroupId = (id: string): void => {
  if (!id || typeof id !== 'string') {
    throw new GroupError('Group ID is required and must be a string', 'INVALID_ID')
  }
  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new GroupError('Group ID must be a valid UUID', 'INVALID_UUID')
  }
}


// Helper to get current user ID with proper error handling
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new GroupError('Failed to get current user', 'AUTH_ERROR', error)
  }
  
  if (!user) {
    throw new GroupError('User must be authenticated', 'UNAUTHENTICATED')
  }
  
  return user.id
}

/**
 * Creates a new group with the specified name.
 * The current user automatically becomes the creator of the group.
 * 
 * @param name - The name of the group (required, max 100 chars)
 * @returns Promise<Group> - The created group object
 * @throws GroupError - For validation errors, auth errors, or database errors
 */
export const createGroup = async (
  name: string
): Promise<Group> => {
  try {
    // Input validation
    validateGroupName(name)
    
    // Get current user
    const ownerId = await getCurrentUserId()
    
    // Prepare insert data
    const insertData: GroupInsert = {
      name: name.trim(),
      created_by: ownerId
    }
    
    // Insert group with optimized query
    const { data, error } = await supabase
      .from('groups')
      .insert(insertData)
      .select('*')
      .single()
    
    if (error) {
      // Handle specific database errors
      if (error.code === '23505') {
        throw new GroupError('A group with this name already exists', 'DUPLICATE_NAME', error)
      }
      if (error.code === '23503') {
        throw new GroupError('Invalid user reference', 'INVALID_USER', error)
      }
      throw new GroupError('Failed to create group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupError('Group was not created', 'NO_DATA_RETURNED')
    }
    
    return data
  } catch (error) {
    // Re-throw GroupError instances, wrap others
    if (error instanceof GroupError) {
      throw error
    }
    throw new GroupError('Unexpected error creating group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Fetches all groups that the current user created.
 * Uses optimized query with proper indexing.
 * 
 * @returns Promise<Group[]> - Array of groups created by the current user
 * @throws GroupError - For auth errors or database errors
 */
export const getGroups = async (): Promise<Group[]> => {
  try {
    // Get current user
    const ownerId = await getCurrentUserId()
    
    // Optimized query with proper ordering and error handling
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', ownerId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new GroupError('Failed to fetch groups', 'DATABASE_ERROR', error)
    }
    
    return data || []
  } catch (error) {
    if (error instanceof GroupError) {
      throw error
    }
    throw new GroupError('Unexpected error fetching groups', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Fetches a single group by ID.
 * Only returns the group if the current user is the creator.
 * 
 * @param id - The UUID of the group to fetch
 * @returns Promise<Group> - The group object
 * @throws GroupError - For validation errors, auth errors, or database errors
 */
export const getGroupById = async (id: string): Promise<Group> => {
  try {
    // Input validation
    validateGroupId(id)
    
    // Get current user
    const ownerId = await getCurrentUserId()
    
    // Optimized single query with ownership check
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .eq('created_by', ownerId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new GroupError('Group not found or access denied', 'NOT_FOUND', error)
      }
      throw new GroupError('Failed to fetch group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupError('Group not found or access denied', 'NOT_FOUND')
    }
    
    return data
  } catch (error) {
    if (error instanceof GroupError) {
      throw error
    }
    throw new GroupError('Unexpected error fetching group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Updates a group with the provided changes.
 * Only the group creator can update the group.
 * 
 * @param id - The UUID of the group to update
 * @param updates - Partial object with name to update
 * @returns Promise<Group> - The updated group object
 * @throws GroupError - For validation errors, auth errors, or database errors
 */
export const updateGroup = async (
  id: string, 
  updates: Partial<{ name: string }>
): Promise<Group> => {
  try {
    // Input validation
    validateGroupId(id)
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new GroupError('At least one field must be provided for update', 'NO_UPDATES')
    }
    
    // Validate individual fields if provided
    if (updates.name !== undefined) {
      validateGroupName(updates.name)
    }
    
    // Get current user
    const ownerId = await getCurrentUserId()
    
    // Prepare update data with trimmed strings
    const updateData: GroupUpdate = {}
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    
    // Optimized update with ownership check
    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', ownerId)
      .select('*')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new GroupError('Group not found or access denied', 'NOT_FOUND', error)
      }
      if (error.code === '23505') {
        throw new GroupError('A group with this name already exists', 'DUPLICATE_NAME', error)
      }
      throw new GroupError('Failed to update group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupError('Group not found or access denied', 'NOT_FOUND')
    }
    
    return data
  } catch (error) {
    if (error instanceof GroupError) {
      throw error
    }
    throw new GroupError('Unexpected error updating group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Deletes a group by ID.
 * Only the group creator can delete the group.
 * This operation is irreversible.
 * 
 * @param id - The UUID of the group to delete
 * @returns Promise<void>
 * @throws GroupError - For validation errors, auth errors, or database errors
 */
export const deleteGroup = async (id: string): Promise<void> => {
  try {
    // Input validation
    validateGroupId(id)
    
    // Get current user
    const ownerId = await getCurrentUserId()
    
    // Optimized delete with ownership check
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('created_by', ownerId)
    
    if (error) {
      throw new GroupError('Failed to delete group', 'DATABASE_ERROR', error)
    }
    
    // Note: Supabase doesn't return affected rows count, so we can't verify deletion
    // The RLS policies ensure only the creator can delete, so if no error, it was successful
  } catch (error) {
    if (error instanceof GroupError) {
      throw error
    }
    throw new GroupError('Unexpected error deleting group', 'UNEXPECTED_ERROR', error)
  }
}

// Export types for external use
export type { Group, GroupInsert, GroupUpdate }
