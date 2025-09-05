import express from 'express'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import type { Database } from '@/types/database.types'

const router = express.Router()

// Type definitions
type Expense = Database['public']['Tables']['expenses']['Row']

// Validation schemas
const createExpenseSchema = z.object({
  groupId: z.string().uuid('Valid group ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be 500 characters or less'),
  category: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string().uuid('Valid user ID is required'),
    shareAmount: z.number().positive('Share amount must be greater than 0')
  })).min(1, 'At least one participant is required')
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

// POST /api/expenses - Create a new expense
router.post('/', async (req, res) => {
  try {
    const { groupId, amount, description, category, participants } = createExpenseSchema.parse(req.body)

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single()

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        paid_by_user_id: req.user.id,
        amount: parseFloat(amount.toString()),
        description: description.trim(),
        category: category?.trim() || 'other'
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return res.status(500).json({ error: 'Failed to create expense' })
    }

    // Add participants
    const participantData = participants.map((participant: any) => ({
      expense_id: expense.id,
      user_id: participant.userId,
      share_amount: parseFloat(participant.shareAmount.toString())
    }))

    const { error: participantsError } = await supabase
      .from('expense_participants')
      .insert(participantData)

    if (participantsError) {
      console.error('Error adding participants:', participantsError)
      // Clean up the expense if participants failed
      await supabase.from('expenses').delete().eq('id', expense.id)
      return res.status(500).json({ error: 'Failed to add participants' })
    }

    res.status(201).json(expense)
  } catch (error) {
    console.error('Unexpected error in expense creation:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/expenses - Get expenses for a group
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query

    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ error: 'Group ID is required' })
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single()

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    // Get expenses for the group
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
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return res.status(500).json({ error: 'Failed to fetch expenses' })
    }

    res.json(expenses || [])
  } catch (error) {
    console.error('Unexpected error in fetching expenses:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/expenses/:id - Get a specific expense
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Get expense with participants
    const { data: expense, error: expenseError } = await supabase
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
      .eq('id', id)
      .single()

    if (expenseError) {
      console.error('Error fetching expense:', expenseError)
      if (expenseError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Expense not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch expense' })
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', expense.group_id)
      .eq('user_id', req.user.id)
      .single()

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    res.json(expense)
  } catch (error) {
    console.error('Unexpected error in fetching expense:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
