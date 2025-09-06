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

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        created_at,
        created_by,
        profiles!groups_created_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('Error fetching group:', groupError)
      return NextResponse.json(
        { error: 'Group not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json(group, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in fetching group:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Check if user is an admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this group' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Group name cannot be empty' }, 
        { status: 400 }
      )
    }

    // Update the group
    const updateData: Record<string, string | null> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single()

    if (groupError) {
      console.error('Error updating group:', groupError)
      return NextResponse.json(
        { error: 'Failed to update group' }, 
        { status: 500 }
      )
    }

    return NextResponse.json(group, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in updating group:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if user is the creator of the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' }, 
        { status: 404 }
      )
    }

    if (group.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the group creator can delete this group' }, 
        { status: 403 }
      )
    }

    // Delete the group (this should cascade delete related records)
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete group' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Group deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in deleting group:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
