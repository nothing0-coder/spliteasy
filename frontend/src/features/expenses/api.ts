import { supabase } from '@/lib/supabase/client'

export async function createExpense(data: {
  group_id: string
  amount: number
  description: string
  paid_by_user_id: string
}) {
  return supabase.from('expenses').insert([data])
}

export async function getExpensesByGroup(groupId: string) {
  return supabase
    .from('expenses')
    .select(`
      *,
      payer:profiles!expenses_paid_by_user_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
}

export async function getExpenseById(id: string) {
  return supabase.from('expenses').select('*').eq('id', id).single()
}

export async function updateExpense(id: string, updates: {
  amount?: number
  description?: string
  paid_by_user_id?: string
}) {
  return supabase.from('expenses').update(updates).eq('id', id)
}

export async function deleteExpense(id: string) {
  return supabase.from('expenses').delete().eq('id', id)
}
