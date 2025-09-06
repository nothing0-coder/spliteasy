// Client-side functions (for use in React components)
// Note: createGroup now uses the secure implementation internally
export {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  GroupError,
  type Group,
  type GroupInsert,
  type GroupUpdate
} from './api/groups'

// Export the secure function directly for users who want explicit access
export { createGroupSecure, SecureGroupError } from './api/create-group-secure'
