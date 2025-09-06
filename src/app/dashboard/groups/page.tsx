'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, AlertCircle } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  totalExpenses: number;
  createdAt: Date;
}

interface GroupsResponse {
  groups: Group[];
  total: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const data: GroupsResponse = await response.json();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Groups</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchGroups} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Groups</h1>
          <p className="text-gray-600 mt-2">
            Manage your expense groups and track shared costs
          </p>
        </div>
        <Link href="/dashboard/groups/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </Link>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Users className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Groups Yet</h2>
          <p className="text-gray-600 mb-6 max-w-md">
            You haven&apos;t joined or created any groups yet. Start by creating your first group to track shared expenses.
          </p>
          <Link href="/dashboard/groups/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{groups.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {groups.reduce((sum, group) => sum + group.memberCount, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(groups.reduce((sum, group) => sum + group.totalExpenses, 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groups List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{group.name}</span>
                      <Users className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    {group.description && (
                      <CardDescription className="line-clamp-2">
                        {group.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Members:</span>
                        <span className="font-medium">{group.memberCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Expenses:</span>
                        <span className="font-medium">
                          {formatCurrency(group.totalExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {formatDate(group.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
