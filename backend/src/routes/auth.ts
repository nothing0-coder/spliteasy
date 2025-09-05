import express from 'express'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const router = express.Router()

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Valid email is required')
})

// POST /api/auth/login - Send magic link
router.post('/login', async (req, res) => {
  try {
    const { email } = loginSchema.parse(req.body)

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error sending magic link:', error)
      return res.status(400).json({ error: error.message })
    }

    res.json({ message: 'Magic link sent to your email' })
  } catch (error) {
    console.error('Unexpected error in login:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/me - Check authentication status
router.get('/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    
    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    })
  } catch (error) {
    console.error('Unexpected error in auth check:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout - Logout user
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    
    // Sign out the user
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error logging out:', error)
      return res.status(400).json({ error: error.message })
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Unexpected error in logout:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
