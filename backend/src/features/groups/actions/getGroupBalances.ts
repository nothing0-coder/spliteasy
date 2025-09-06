'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface GroupBalance {
  userId: string
  fullName: string
  avatarUrl: string | null
  balance: number
}

export async function getGroupBalances(groupId: string): Promise<GroupBalance[]> {
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

  // Fetch all members of the group with their profile information
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select(`
      user_id,
      profiles!inner (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId)

  if (membersError) {
    throw new Error('Failed to fetch group members')
  }

  // Calculate balances for each member
  const balances: GroupBalance[] = []

  for (const member of members) {
    const userId = member.user_id
    const profile = member.profiles

    // Calculate total paid by this user
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('group_id', groupId)
      .eq('paid_by_user_id', userId)

    if (expensesError) {
      throw new Error(`Failed to fetch expenses for user ${userId}`)
    }

    const totalPaid = expensesData.reduce((sum, expense) => sum + expense.amount, 0)

    // Calculate total share for this user
    const { data: sharesData, error: sharesError } = await supabase
      .from('expense_participants')
      .select(`
        share_amount,
        expenses!inner (
          group_id
        )
      `)
      .eq('user_id', userId)
      .eq('expenses.group_id', groupId)

    if (sharesError) {
      throw new Error(`Failed to fetch shares for user ${userId}`)
    }

    const totalShare = sharesData.reduce((sum, participant) => sum + participant.share_amount, 0)

    // Calculate final balance (positive means they are owed money, negative means they owe money)
    const balance = totalPaid - totalShare

    balances.push({
      userId,
      fullName: (profile as { full_name?: string }).full_name || 'Unknown User',
      avatarUrl: (profile as { avatar_url?: string }).avatar_url || null,
      balance
    })
  }

  // Sort by balance descending (people owed money first)
  return balances.sort((a, b) => b.balance - a.balance)
}
