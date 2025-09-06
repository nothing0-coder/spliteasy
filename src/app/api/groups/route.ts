import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

// Tell Next.js not to statically optimize this route
export const dynamic = 'force-dynamic' // disables static prerendering

export const runtime = 'edge' // (optional) runs on the Edge runtime

// Helper function to create Supabase client with cookie support for API routes
async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('Supabase user UID →', user?.id)
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  
  const { name } = await req.json()
  
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      created_by: user.id,          // <-- required by RLS
    })
    .select()                       // return the inserted row
  
  if (error) {
    // <-- detailed error handling (see point 5)
    const payload = {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }
    console.error('Supabase insert error →', payload)
    return new Response(JSON.stringify({ error: payload }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('Supabase user UID →', user?.id)
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    const payload = {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }
    console.error('Supabase fetch error →', payload)
    return new Response(JSON.stringify({ error: payload }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data || []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
