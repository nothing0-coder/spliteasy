'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import Link from 'next/link'
import { ArrowLeft, Users, DollarSign, BarChart3, Plus } from 'lucide-react'
import { GroupAnalytics } from '@/features/analytics'
import { AddExpenseForm } from '@/features/expenses/components/AddExpenseForm'
import { supabase } from '@/lib/supabase/client'

interface PageProps {
  params: {
    groupId: string
  }
}

export default function GroupPage({ params }: PageProps) {
  const router = useRouter()
  const [group, setGroup] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddExpense, setShowAddExpense] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Get group details
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', params.groupId)
          .single()

        if (groupError || !groupData) {
          setError('Group not found')
          return
        }

        setGroup(groupData)

        // Get expenses for this group
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select(`
            *,
            payer:profiles!expenses_paid_by_user_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', params.groupId)
          .order('created_at', { ascending: false })

        if (expensesError) {
          console.error('Error fetching expenses:', expensesError)
        } else {
          setExpenses(expensesData || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load group data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.groupId])

  const handleExpenseAdded = () => {
    setShowAddExpense(false)
    // Refresh the page data
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Group not found'}</p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
        <p className="text-gray-600 mt-2">
          Created on {new Date(group.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Group Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Group Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Expenses:</span>
                <span className="font-semibold">${totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Number of Expenses:</span>
                <span className="font-semibold">{expenses?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your group and view balances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/dashboard/groups/${params.groupId}/balances`}>
                <Users className="mr-2 h-4 w-4" />
                View Balances
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowAddExpense(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            Latest expenses in this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses && expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-gray-600">
                      Paid by {expense.payer?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${expense.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(expense.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses yet. Add your first expense to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Section */}
      {expenses && expenses.length > 0 && (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Analytics
            </h2>
            <p className="text-gray-600 mt-1">
              Insights into your group's spending patterns
            </p>
          </div>
          <GroupAnalytics groupId={params.groupId} />
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add New Expense"
        size="lg"
      >
        <AddExpenseForm
          groupId={params.groupId}
          onSuccess={handleExpenseAdded}
          onCancel={() => setShowAddExpense(false)}
        />
      </Modal>
    </div>
  )
}
