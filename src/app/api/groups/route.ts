import { NextRequest, NextResponse } from 'next/server'
import { createGroupServer, getGroupsServer, GroupServerError } from '@/features/groups/api/groups-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' }, 
        { status: 400 }
      )
    }

    // Use the server function to create group
    const group = await createGroupServer(name.trim())

    // Add the creator as a member of the group
    const supabase = await import('@/lib/supabase/server').then(m => m.getSupabaseServerClient())
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) {
        console.error('Error adding creator to group:', memberError)
        // Group was created but member addition failed
        return NextResponse.json(
          { error: 'Group created but failed to add you as a member' }, 
          { status: 500 }
        )
      }
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in group creation:', error)
    
    if (error instanceof GroupServerError) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Use the server function to get groups
    const groups = await getGroupsServer()
    return NextResponse.json(groups, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in fetching groups:', error)
    
    if (error instanceof GroupServerError) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
