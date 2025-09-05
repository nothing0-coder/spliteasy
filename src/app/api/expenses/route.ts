import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, amount, description, category, participants } = body

    // Validate input
    if (!groupId || !amount || !description) {
      return NextResponse.json(
        { error: 'Group ID, amount, and description are required' }, 
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' }, 
        { status: 400 }
      )
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' }, 
        { status: 400 }
      )
    }

    // Verify user is a member of the group
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

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        paid_by_user_id: user.id,
        amount: parseFloat(amount),
        description: description.trim(),
        category: category?.trim() || 'other'
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return NextResponse.json(
        { error: 'Failed to create expense' }, 
        { status: 500 }
      )
    }

    // Add participants
    const participantData = participants.map((participant: any) => ({
      expense_id: expense.id,
      user_id: participant.userId,
      share_amount: parseFloat(participant.shareAmount)
    }))

    const { error: participantsError } = await supabase
      .from('expense_participants')
      .insert(participantData)

    if (participantsError) {
      console.error('Error adding participants:', participantsError)
      // Clean up the expense if participants failed
      await supabase.from('expenses').delete().eq('id', expense.id)
      return NextResponse.json(
        { error: 'Failed to add participants' }, 
        { status: 500 }
      )
    }

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in expense creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' }, 
        { status: 400 }
      )
    }

    // Verify user is a member of the group
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
      return NextResponse.json(
        { error: 'Failed to fetch expenses' }, 
        { status: 500 }
      )
    }

    return NextResponse.json(expenses, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in fetching expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}