import { getSupabaseServerClient } from '@/lib/supabase/server'
import { cache, CACHE_KEYS, CACHE_TTL, invalidateGroupCache } from '@/lib/cache'
import type { Database } from '@/types/database.types'

// Type definitions for better type safety
type Group = Database['public']['Tables']['groups']['Row']
type GroupInsert = Database['public']['Tables']['groups']['Insert']
type GroupUpdate = Database['public']['Tables']['groups']['Update']

// Custom error class for group operations
export class GroupServerError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'GroupServerError'
  }
}

// Input validation helpers (reused from client version)
const validateGroupName = (name: string): void => {
  if (!name || typeof name !== 'string') {
    throw new GroupServerError('Group name is required and must be a string', 'INVALID_NAME')
  }
  if (name.trim().length === 0) {
    throw new GroupServerError('Group name cannot be empty', 'EMPTY_NAME')
  }
  if (name.length > 100) {
    throw new GroupServerError('Group name must be 100 characters or less', 'NAME_TOO_LONG')
  }
}

const validateGroupId = (id: string): void => {
  if (!id || typeof id !== 'string') {
    throw new GroupServerError('Group ID is required and must be a string', 'INVALID_ID')
  }
  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new GroupServerError('Group ID must be a valid UUID', 'INVALID_UUID')
  }
}


// Helper to get current user ID with proper error handling
const getCurrentUserId = async (supabase: any): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new GroupServerError('Failed to get current user', 'AUTH_ERROR', error)
  }
  
  if (!user) {
    throw new GroupServerError('User must be authenticated', 'UNAUTHENTICATED')
  }
  
  return user.id
}

/**
 * Server-side function to create a new group.
 * Use this in API routes and server components.
 * 
 * @param name - The name of the group (required, max 100 chars)
 * @returns Promise<Group> - The created group object
 * @throws GroupServerError - For validation errors, auth errors, or database errors
 */
export const createGroupServer = async (
  name: string
): Promise<Group> => {
  try {
    // Input validation
    validateGroupName(name)
    
    // Get server client
    const supabase = await getSupabaseServerClient()
    
    // Get current user
    const ownerId = await getCurrentUserId(supabase)
    
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
        throw new GroupServerError('A group with this name already exists', 'DUPLICATE_NAME', error)
      }
      if (error.code === '23503') {
        throw new GroupServerError('Invalid user reference', 'INVALID_USER', error)
      }
      throw new GroupServerError('Failed to create group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupServerError('Group was not created', 'NO_DATA_RETURNED')
    }
    
    // Invalidate cache for the user's groups
    cache.delete(CACHE_KEYS.GROUPS(ownerId))
    
    return data
  } catch (error) {
    // Re-throw GroupServerError instances, wrap others
    if (error instanceof GroupServerError) {
      throw error
    }
    throw new GroupServerError('Unexpected error creating group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Server-side function to fetch all groups for the current user.
 * Use this in API routes and server components.
 * 
 * @returns Promise<Group[]> - Array of groups created by the current user
 * @throws GroupServerError - For auth errors or database errors
 */
export const getGroupsServer = async (): Promise<Group[]> => {
  try {
    // Get server client
    const supabase = await getSupabaseServerClient()
    
    // Get current user for cache key
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new GroupServerError('User must be authenticated', 'UNAUTHENTICATED')
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.GROUPS(user.id)
    const cachedData = cache.get<Group[]>(cacheKey)
    if (cachedData) {
      return cachedData
    }
    
    // Optimized query with proper ordering and error handling
    // RLS policies will automatically filter to only show groups created by the current user
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error:', error)
      throw new GroupServerError('Failed to fetch groups', 'DATABASE_ERROR', error)
    }
    
    const groups = data || []
    
    // Cache the result
    cache.set(cacheKey, groups, CACHE_TTL.GROUPS)
    
    return groups
  } catch (error) {
    if (error instanceof GroupServerError) {
      throw error
    }
    throw new GroupServerError('Unexpected error fetching groups', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Server-side function to fetch a single group by ID.
 * Use this in API routes and server components.
 * 
 * @param id - The UUID of the group to fetch
 * @returns Promise<Group> - The group object
 * @throws GroupServerError - For validation errors, auth errors, or database errors
 */
export const getGroupByIdServer = async (id: string): Promise<Group> => {
  try {
    // Input validation
    validateGroupId(id)
    
    // Get server client
    const supabase = await getSupabaseServerClient()
    
    // Optimized single query - RLS policies will automatically filter to only show groups created by the current user
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new GroupServerError('Group not found or access denied', 'NOT_FOUND', error)
      }
      throw new GroupServerError('Failed to fetch group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupServerError('Group not found or access denied', 'NOT_FOUND')
    }
    
    // Cache the result
    cache.set(CACHE_KEYS.GROUP(id), data, CACHE_TTL.GROUP)
    
    return data
  } catch (error) {
    if (error instanceof GroupServerError) {
      throw error
    }
    throw new GroupServerError('Unexpected error fetching group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Server-side function to update a group.
 * Use this in API routes and server components.
 * 
 * @param id - The UUID of the group to update
 * @param updates - Partial object with name to update
 * @returns Promise<Group> - The updated group object
 * @throws GroupServerError - For validation errors, auth errors, or database errors
 */
export const updateGroupServer = async (
  id: string, 
  updates: Partial<{ name: string }>
): Promise<Group> => {
  try {
    // Input validation
    validateGroupId(id)
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new GroupServerError('At least one field must be provided for update', 'NO_UPDATES')
    }
    
    // Validate individual fields if provided
    if (updates.name !== undefined) {
      validateGroupName(updates.name)
    }
    
    // Get server client
    const supabase = await getSupabaseServerClient()
    
    // Prepare update data with trimmed strings
    const updateData: GroupUpdate = {}
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    
    // Optimized update - RLS policies will automatically ensure only the creator can update
    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new GroupServerError('Group not found or access denied', 'NOT_FOUND', error)
      }
      if (error.code === '23505') {
        throw new GroupServerError('A group with this name already exists', 'DUPLICATE_NAME', error)
      }
      throw new GroupServerError('Failed to update group', 'DATABASE_ERROR', error)
    }
    
    if (!data) {
      throw new GroupServerError('Group not found or access denied', 'NOT_FOUND')
    }
    
    return data
  } catch (error) {
    if (error instanceof GroupServerError) {
      throw error
    }
    throw new GroupServerError('Unexpected error updating group', 'UNEXPECTED_ERROR', error)
  }
}

/**
 * Server-side function to delete a group.
 * Use this in API routes and server components.
 * 
 * @param id - The UUID of the group to delete
 * @returns Promise<void>
 * @throws GroupServerError - For validation errors, auth errors, or database errors
 */
export const deleteGroupServer = async (id: string): Promise<void> => {
  try {
    // Input validation
    validateGroupId(id)
    
    // Get server client
    const supabase = await getSupabaseServerClient()
    
    // Optimized delete - RLS policies will automatically ensure only the creator can delete
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw new GroupServerError('Failed to delete group', 'DATABASE_ERROR', error)
    }
    
    // Note: Supabase doesn't return affected rows count, so we can't verify deletion
    // The RLS policies ensure only the creator can delete, so if no error, it was successful
  } catch (error) {
    if (error instanceof GroupServerError) {
      throw error
    }
    throw new GroupServerError('Unexpected error deleting group', 'UNEXPECTED_ERROR', error)
  }
}

// Export types for external use
export type { Group, GroupInsert, GroupUpdate }
