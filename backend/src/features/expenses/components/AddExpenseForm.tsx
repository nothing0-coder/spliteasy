'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { Plus, Minus, Loader2, DollarSign, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Participant {
  userId: string
  name: string
  shareAmount: number
}

interface AddExpenseFormProps {
  groupId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddExpenseForm({ groupId, onSuccess, onCancel }: AddExpenseFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([])
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'other'
  })
  const [participants, setParticipants] = useState<Participant[]>([])

  // Fetch group members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select(`
            user_id,
            profiles!inner (
              id,
              full_name
            )
          `)
          .eq('group_id', groupId)

        if (error) throw error

        const memberList = data.map(item => ({
          id: item.user_id,
          full_name: (item.profiles as any).full_name || 'Unknown'
        }))

        setMembers(memberList)
        
        // Initialize participants with all members
        const initialParticipants = memberList.map(member => ({
          userId: member.id,
          name: member.full_name,
          shareAmount: 0
        }))
        setParticipants(initialParticipants)
      } catch (err) {
        console.error('Error fetching members:', err)
        setError('Failed to load group members')
      }
    }

    fetchMembers()
  }, [groupId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError(null)
  }

  const updateParticipantShare = (userId: string, shareAmount: number) => {
    setParticipants(prev => 
      prev.map(p => 
        p.userId === userId 
          ? { ...p, shareAmount: Math.max(0, shareAmount) }
          : p
      )
    )
  }

  const distributeEqually = () => {
    const totalAmount = parseFloat(formData.amount) || 0
    const sharePerPerson = totalAmount / participants.length
    
    setParticipants(prev => 
      prev.map(p => ({ ...p, shareAmount: sharePerPerson }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.amount || !formData.description.trim()) {
      setError('Amount and description are required')
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    const totalShares = participants.reduce((sum, p) => sum + p.shareAmount, 0)
    if (Math.abs(totalShares - amount) > 0.01) {
      setError('Total shares must equal the expense amount')
      return
    }

    const activeParticipants = participants.filter(p => p.shareAmount > 0)
    if (activeParticipants.length === 0) {
      setError('At least one participant must have a share amount')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          amount: formData.amount,
          description: formData.description.trim(),
          category: formData.category,
          participants: activeParticipants
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create expense')
      }

      // Success
      toast.success('Expense added successfully!')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error creating expense:', err)
      setError(err instanceof Error ? err.message : 'Failed to create expense')
    } finally {
      setIsLoading(false)
    }
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Loading group members...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Expense
        </CardTitle>
        <CardDescription>
          Create a new expense and split it among group members
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

          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="other">Other</option>
                <option value="food">Food & Dining</option>
                <option value="transport">Transportation</option>
                <option value="accommodation">Accommodation</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="utilities">Utilities</option>
                <option value="travel">Travel</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="What was this expense for?"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          {/* Participants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Split Among Members</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeEqually}
                disabled={isLoading || !formData.amount}
              >
                Split Equally
              </Button>
            </div>

            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.userId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{participant.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateParticipantShare(participant.userId, participant.shareAmount - 1)}
                      disabled={isLoading || participant.shareAmount <= 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={participant.shareAmount}
                      onChange={(e) => updateParticipantShare(participant.userId, parseFloat(e.target.value) || 0)}
                      disabled={isLoading}
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateParticipantShare(participant.userId, participant.shareAmount + 1)}
                      disabled={isLoading}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Check */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-sm">
                <span>Total shares:</span>
                <span className={`font-medium ${
                  Math.abs(participants.reduce((sum, p) => sum + p.shareAmount, 0) - (parseFloat(formData.amount) || 0)) < 0.01
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  ${participants.reduce((sum, p) => sum + p.shareAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
