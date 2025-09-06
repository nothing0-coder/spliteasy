import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient()
    const { groupId } = await params
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' }, 
        { status: 403 }
      )
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
      console.error('Error fetching group members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch group members' }, 
        { status: 500 }
      )
    }

    // Calculate balances for each member
    const balances = []

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
        console.error(`Error fetching expenses for user ${userId}:`, expensesError)
        return NextResponse.json(
          { error: `Failed to fetch expenses for user ${userId}` }, 
          { status: 500 }
        )
      }

      const totalPaid = expensesData.reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0)

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
        console.error(`Error fetching shares for user ${userId}:`, sharesError)
        return NextResponse.json(
          { error: `Failed to fetch shares for user ${userId}` }, 
          { status: 500 }
        )
      }

      const totalShare = sharesData.reduce((sum: number, participant: { share_amount: number }) => sum + participant.share_amount, 0)

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
    const sortedBalances = balances.sort((a, b) => b.balance - a.balance)

    return NextResponse.json(sortedBalances, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in fetching group balances:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
