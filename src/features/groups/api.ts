// Client-side functions (for use in React components)
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

// Server-side functions (for use in API routes and server components)
export {
  createGroupServer,
  getGroupsServer,
  getGroupByIdServer,
  updateGroupServer,
  deleteGroupServer,
  GroupServerError
} from './api/groups-server'