'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash and search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const code = searchParams.get('code')
        const error = searchParams.get('error') || hashParams.get('error')
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')

        if (error) {
          console.error('Auth error:', error, errorDescription)
          setStatus('error')
          setErrorMessage(errorDescription || 'Authentication failed')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        if (code) {
          // Handle OAuth callback
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            setStatus('error')
            setErrorMessage('Failed to complete authentication')
            setTimeout(() => router.replace('/login'), 3000)
            return
          }

          if (data.session) {
            setStatus('success')
            setTimeout(() => router.replace('/dashboard'), 1000)
            return
          }
        }

        // Handle magic link or existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('error')
          setErrorMessage('Failed to verify session')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        if (session) {
          setStatus('success')
          setTimeout(() => router.replace('/dashboard'), 1000)
        } else {
          setStatus('error')
          setErrorMessage('No valid session found')
          setTimeout(() => router.replace('/login'), 3000)
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        setStatus('error')
        setErrorMessage('An unexpected error occurred')
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="rounded-full h-8 w-8 bg-green-500 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600">Sign in successful! Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="rounded-full h-8 w-8 bg-red-500 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 mb-2">Sign in failed</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="text-xs text-muted-foreground mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  )
}
