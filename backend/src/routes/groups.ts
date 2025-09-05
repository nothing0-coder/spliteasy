import express from 'express'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import type { Database } from '@/types/database.types'

const router = express.Router()

// Type definitions
type Group = Database['public']['Tables']['groups']['Row']

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be 100 characters or less')
})

// Middleware to authenticate user
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' })
  }
}

// Apply authentication middleware to all routes
router.use(authenticateUser)

// POST /api/groups - Create a new group
router.post('/', async (req, res) => {
  try {
    const { name } = createGroupSchema.parse(req.body)

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        created_by: req.user.id
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      if (groupError.code === '23505') {
        return res.status(400).json({ error: 'A group with this name already exists' })
      }
      return res.status(500).json({ error: 'Failed to create group' })
    }

    // Add the creator as a member of the group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: req.user.id,
        role: 'admin'
      })

    if (memberError) {
      console.error('Error adding creator to group:', memberError)
      // Group was created but member addition failed
      return res.status(500).json({ 
        error: 'Group created but failed to add you as a member' 
      })
    }

    res.status(201).json(group)
  } catch (error) {
    console.error('Unexpected error in group creation:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/groups - Get all groups for the current user
router.get('/', async (req, res) => {
  try {
    // Get groups where user is a member
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner (
          user_id,
          role
        )
      `)
      .eq('group_members.user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching groups:', error)
      return res.status(500).json({ error: 'Failed to fetch groups' })
    }

    res.json(groups || [])
  } catch (error) {
    console.error('Unexpected error in fetching groups:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/groups/:id - Get a specific group
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Get group with member check
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner (
          user_id,
          role
        )
      `)
      .eq('id', id)
      .eq('group_members.user_id', req.user.id)
      .single()

    if (error) {
      console.error('Error fetching group:', error)
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Group not found or access denied' })
      }
      return res.status(500).json({ error: 'Failed to fetch group' })
    }

    res.json(group)
  } catch (error) {
    console.error('Unexpected error in fetching group:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/groups/:id/balances - Get group balances
router.get('/:id/balances', async (req, res) => {
  try {
    const { id } = req.params

    // First verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', req.user.id)
      .single()

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    // Get all expenses for the group with participants
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:profiles!expenses_paid_by_user_id_fkey (
          full_name,
          avatar_url
        ),
        participants:expense_participants (
          user_id,
          share_amount,
          user:profiles!expense_participants_user_id_fkey (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('group_id', id)

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return res.status(500).json({ error: 'Failed to fetch expenses' })
    }

    // Calculate balances
    const balances: { [userId: string]: { name: string; balance: number } } = {}
    
    expenses?.forEach(expense => {
      const payerId = expense.paid_by_user_id
      const payerName = expense.payer?.full_name || 'Unknown'
      
      // Initialize payer if not exists
      if (!balances[payerId]) {
        balances[payerId] = { name: payerName, balance: 0 }
      }
      
      // Add amount paid
      balances[payerId].balance += expense.amount
      
      // Subtract shares from participants
      expense.participants?.forEach((participant: any) => {
        const participantId = participant.user_id
        const participantName = participant.user?.full_name || 'Unknown'
        
        if (!balances[participantId]) {
          balances[participantId] = { name: participantName, balance: 0 }
        }
        
        balances[participantId].balance -= participant.share_amount
      })
    })

    res.json({ balances })
  } catch (error) {
    console.error('Unexpected error in fetching balances:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
