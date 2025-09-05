import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If the user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to SplitEasy
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Split expenses easily with friends and family
        </p>
        <Link href="/login">
          <Button size="lg">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
}