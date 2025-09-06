'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createGroup, GroupError } from '@/features/groups/api'
import { ArrowLeft, Loader2, PlusCircle, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CreateGroupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Group name is required')
      return
    }

    if (formData.name.trim().length > 100) {
      setError('Group name must be 100 characters or less')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Submitting group creation:', { name: formData.name.trim() })
      const group = await createGroup(formData.name.trim())
      console.log('Group created successfully:', group)
      
      // Success! Show toast and redirect to dashboard
      toast.success(`Group "${group.name}" created successfully!`)
      router.push('/dashboard')
    } catch (err) {
      console.error('Group creation failed:', err)
      
      if (err instanceof GroupError) {
        // Show specific error messages based on error code
        switch (err.code) {
          case 'UNAUTHENTICATED':
            setError('Please log in to create groups.')
            break
          case 'DUPLICATE_NAME':
            setError('A group with this name already exists. Please choose a different name.')
            break
          case 'PERMISSION_DENIED':
            setError('Permission denied. Please check your account permissions.')
            break
          case 'CONNECTION_ERROR':
            setError('Unable to connect to the database. Please try again later.')
            break
          case 'RLS_ERROR':
            setError('Security policy error. Please contact support if this persists.')
            break
          default:
            setError(err.message || 'Failed to create group. Please try again.')
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="mb-4 -ml-4" 
            asChild
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <PlusCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Group</h1>
            <p className="text-muted-foreground">
              Set up a new expense-splitting group to track shared costs with friends.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">Group Details</CardTitle>
            <CardDescription>
              Choose a name for your expense-splitting group.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <p className="text-sm font-medium text-destructive">Error</p>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              )}

              {/* Group Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Group Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Vacation Trip, Roommates, Office Lunch"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-11"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.name.length}/100 characters
                </p>
              </div>


              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium"
                  disabled={isLoading || !formData.name.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Group...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Create Group
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>You'll be the owner and can invite others after creation</span>
          </div>
        </div>
      </div>
    </div>
  )
}