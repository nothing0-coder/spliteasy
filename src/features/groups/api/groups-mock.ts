// Mock implementation for testing without Supabase
// This file provides mock data and functions for development/testing

import type { Database } from '@/types/database.types'

type Group = Database['public']['Tables']['groups']['Row']

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

// Mock data storage (in-memory)
let mockGroups: Group[] = []
let nextId = 1

// Mock user ID for testing
const MOCK_USER_ID = 'mock-user-123'

/**
 * Mock implementation of createGroup
 */
export const createGroup = async (name: string): Promise<Group> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Input validation
  if (!name || typeof name !== 'string') {
    throw new GroupError('Group name is required and must be a string', 'INVALID_NAME')
  }
  if (name.trim().length === 0) {
    throw new GroupError('Group name cannot be empty', 'EMPTY_NAME')
  }
  if (name.length > 100) {
    throw new GroupError('Group name must be 100 characters or less', 'NAME_TOO_LONG')
  }
  
  // Check for duplicate names
  const existingGroup = mockGroups.find(g => g.name === name.trim())
  if (existingGroup) {
    throw new GroupError('A group with this name already exists', 'DUPLICATE_NAME')
  }
  
  // Create new group
  const newGroup: Group = {
    id: `mock-group-${nextId++}`,
    name: name.trim(),
    created_by: MOCK_USER_ID,
    created_at: new Date().toISOString()
  }
  
  mockGroups.push(newGroup)
  console.log('Mock: Created group:', newGroup)
  
  return newGroup
}

/**
 * Mock implementation of getGroups
 */
export const getGroups = async (): Promise<Group[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const userGroups = mockGroups.filter(g => g.created_by === MOCK_USER_ID)
  console.log('Mock: Retrieved groups:', userGroups)
  
  return userGroups
}

/**
 * Mock implementation of getGroupById
 */
export const getGroupById = async (id: string): Promise<Group> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const group = mockGroups.find(g => g.id === id && g.created_by === MOCK_USER_ID)
  
  if (!group) {
    throw new GroupError('Group not found or access denied', 'NOT_FOUND')
  }
  
  console.log('Mock: Retrieved group:', group)
  return group
}

/**
 * Mock implementation of updateGroup
 */
export const updateGroup = async (
  id: string, 
  updates: Partial<{ name: string }>
): Promise<Group> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400))
  
  const groupIndex = mockGroups.findIndex(g => g.id === id && g.created_by === MOCK_USER_ID)
  
  if (groupIndex === -1) {
    throw new GroupError('Group not found or access denied', 'NOT_FOUND')
  }
  
  if (updates.name) {
    // Check for duplicate names
    const existingGroup = mockGroups.find(g => g.name === updates.name && g.id !== id)
    if (existingGroup) {
      throw new GroupError('A group with this name already exists', 'DUPLICATE_NAME')
    }
    
    mockGroups[groupIndex] = {
      ...mockGroups[groupIndex],
      name: updates.name.trim()
    }
  }
  
  console.log('Mock: Updated group:', mockGroups[groupIndex])
  return mockGroups[groupIndex]
}

/**
 * Mock implementation of deleteGroup
 */
export const deleteGroup = async (id: string): Promise<void> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const groupIndex = mockGroups.findIndex(g => g.id === id && g.created_by === MOCK_USER_ID)
  
  if (groupIndex === -1) {
    throw new GroupError('Group not found or access denied', 'NOT_FOUND')
  }
  
  mockGroups.splice(groupIndex, 1)
  console.log('Mock: Deleted group with id:', id)
}

// Export types for external use
export type { Group }
