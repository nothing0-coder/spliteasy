'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getGroupBalances, type GroupBalance } from '../actions/getGroupBalances'

interface GroupBalancesProps {
  groupId: string
}

export function GroupBalances({ groupId }: GroupBalancesProps) {
  const [balances, setBalances] = useState<GroupBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBalances() {
      try {
        setLoading(true)
        setError(null)
        const data = await getGroupBalances(groupId)
        setBalances(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances')
      } finally {
        setLoading(false)
      }
    }

    if (groupId) {
      fetchBalances()
    }
  }, [groupId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount))
  }

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) {
      return {
        text: 'is owed',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    } else if (balance < 0) {
      return {
        text: 'owes',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    } else {
      return {
        text: 'is settled up',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Balances</CardTitle>
          <CardDescription>Loading balances...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Balances</CardTitle>
          <CardDescription>Error loading balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️ Error</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Balances</CardTitle>
          <CardDescription>No members found in this group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">👥</div>
            <p className="text-gray-600">This group doesn&apos;t have any members yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Balances</CardTitle>
        <CardDescription>
          Current balance status for all group members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {balances.map((balance) => {
            const status = getBalanceStatus(balance.balance)
            
            return (
              <div
                key={balance.userId}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${status.bgColor} ${status.borderColor}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                    {balance.avatarUrl ? (
                      <img
                        src={balance.avatarUrl}
                        alt={balance.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {balance.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{balance.fullName}</p>
                    <p className={`text-sm ${status.color}`}>
                      {balance.balance === 0 
                        ? status.text
                        : `${status.text} ${formatCurrency(balance.balance)}`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-semibold ${status.color}`}>
                    {balance.balance === 0 
                      ? '₹0.00'
                      : `${balance.balance > 0 ? '+' : '-'}${formatCurrency(balance.balance)}`
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Total members:</span>
              <span className="font-medium">{balances.length}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>Settled members:</span>
              <span className="font-medium">
                {balances.filter(b => b.balance === 0).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
