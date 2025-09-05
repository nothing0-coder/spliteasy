'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'

interface SendGroupInvitationParams {
  groupId: string
  groupName: string
  inviteeEmail: string
  inviterName: string
}

export async function sendGroupInvitation({
  groupId,
  groupName,
  inviteeEmail,
  inviterName
}: SendGroupInvitationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Verify that the current user is an admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return { success: false, error: 'You are not authorized to invite members to this group' }
    }

    // Check if the invitee already exists in the system
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', inviteeEmail) // This would need to be adjusted based on your user lookup logic

    // For now, we'll create a simple invitation record
    // In a real implementation, you'd integrate with an email service like SendGrid, Resend, etc.
    
    const invitationData = {
      group_id: groupId,
      invited_email: inviteeEmail,
      invited_by: user.id,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    // Store the invitation (you'd need to create an invitations table)
    // For now, we'll just log the invitation
    console.log('Group invitation:', {
      groupName,
      inviteeEmail,
      inviterName,
      invitationLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${groupId}`
    })

    // In a real implementation, you would:
    // 1. Send an email using a service like Resend, SendGrid, or AWS SES
    // 2. Store the invitation in a database table
    // 3. Handle invitation acceptance/rejection

    return { success: true }
  } catch (error) {
    console.error('Error sending group invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation' 
    }
  }
}

// Example email template (for reference)
export const getInvitationEmailTemplate = (
  groupName: string,
  inviterName: string,
  invitationLink: string
) => ({
  subject: `You're invited to join "${groupName}" on SplitEasy`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You're invited to join a group!</h2>
      <p>Hi there!</p>
      <p><strong>${inviterName}</strong> has invited you to join the expense-splitting group "<strong>${groupName}</strong>" on SplitEasy.</p>
      <p>SplitEasy makes it easy to track and split expenses with friends, family, or colleagues.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Join Group
        </a>
      </div>
      <p>If you don't have a SplitEasy account yet, you'll be able to create one when you click the link above.</p>
      <p>If you're not interested in joining this group, you can simply ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This invitation was sent by ${inviterName}. If you believe this was sent in error, please contact them directly.
      </p>
    </div>
  `,
  text: `
    You're invited to join a group!
    
    ${inviterName} has invited you to join the expense-splitting group "${groupName}" on SplitEasy.
    
    SplitEasy makes it easy to track and split expenses with friends, family, or colleagues.
    
    Join the group: ${invitationLink}
    
    If you don't have a SplitEasy account yet, you'll be able to create one when you click the link above.
    
    If you're not interested in joining this group, you can simply ignore this email.
    
    This invitation was sent by ${inviterName}. If you believe this was sent in error, please contact them directly.
  `
})
