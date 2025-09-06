'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface GroupAnalyticsData {
  totalSpent: number
  expenses: Array<{
    id: string
    amount: number
    description: string
    created_at: string
    paid_by_user_id: string
    payer_name: string
  }>
  spendingTrends: Array<{
    date: string
    amount: number
  }>
  topSpenders: Array<{
    name: string
    amount: number
  }>
}

export async function getGroupAnalytics(groupId: string): Promise<GroupAnalyticsData> {
  const supabase = await getSupabaseServerClient()

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Verify that the current user is a member of the group
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    throw new Error('You are not a member of this group')
  }

  // Fetch all expenses for the group with payer information
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      id,
      amount,
      description,
      created_at,
      paid_by_user_id,
      profiles!expenses_paid_by_user_id_fkey (
        full_name
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (expensesError) {
    throw new Error('Failed to fetch expenses')
  }

  if (!expenses || expenses.length === 0) {
    return {
      totalSpent: 0,
      expenses: [],
      spendingTrends: [],
      topSpenders: []
    }
  }

  // Calculate total spent
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Process expenses data
  const processedExpenses = expenses.map(expense => ({
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    created_at: expense.created_at,
    paid_by_user_id: expense.paid_by_user_id,
    payer_name: (expense.profiles as any)?.full_name || 'Unknown'
  }))

  // Generate spending trends (group by date)
  const spendingByDate = new Map<string, number>()
  
  expenses.forEach(expense => {
    const date = new Date(expense.created_at).toISOString().split('T')[0]
    const current = spendingByDate.get(date) || 0
    spendingByDate.set(date, current + expense.amount)
  })

  const spendingTrends = Array.from(spendingByDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate top spenders
  const spendingByUser = new Map<string, { name: string; amount: number }>()
  
  expenses.forEach(expense => {
    const userId = expense.paid_by_user_id
    const userName = (expense.profiles as any)?.full_name || 'Unknown'
    const current = spendingByUser.get(userId) || { name: userName, amount: 0 }
    spendingByUser.set(userId, {
      name: current.name,
      amount: current.amount + expense.amount
    })
  })

  const topSpenders = Array.from(spendingByUser.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10) // Top 10 spenders

  return {
    totalSpent,
    expenses: processedExpenses,
    spendingTrends,
    topSpenders
  }
}
