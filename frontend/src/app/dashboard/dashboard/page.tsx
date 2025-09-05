import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { PlusCircle, Users, Calendar, ArrowRight } from 'lucide-react'
import { getGroupsServer, GroupServerError, type Group } from '@/features/groups/api'

export default async function DashboardPage() {
  let groups: Group[] = []
  let error: string | null = null

  try {
    // Use our optimized server-side function to fetch groups
    groups = await getGroupsServer()
  } catch (err) {
    console.error('Error fetching groups:', err)
    if (err instanceof GroupServerError) {
      error = err.message
    } else {
      error = 'Failed to load groups. Please try again.'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Groups</h1>
              <p className="text-muted-foreground mt-1">
                Manage your expense-splitting groups and track shared costs.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/groups/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Group
              </Link>
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-destructive">Error loading groups</p>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}

          {/* Groups Grid */}
          {!error && groups && groups.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groups.map((group) => (
                <Card key={group.id} className="group hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                          {group.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Group Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Creator</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(group.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                        asChild
                      >
                        <Link href={`/dashboard/groups/${group.id}`} className="flex items-center justify-center gap-2">
                          View Group
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !error ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-full bg-muted p-6 mb-6">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              
              <div className="text-center space-y-3 max-w-md">
                <h2 className="text-2xl font-semibold">No groups yet</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Get started by creating your first expense-splitting group. 
                  Invite friends and start tracking shared costs together.
                </p>
              </div>
              
              <div className="mt-8 space-y-3">
                <Button asChild size="lg">
                  <Link href="/dashboard/groups/create" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create Your First Group
                  </Link>
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  It only takes a few seconds to get started
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
