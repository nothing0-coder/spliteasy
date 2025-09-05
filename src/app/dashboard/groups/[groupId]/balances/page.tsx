import { GroupBalances } from '@/features/groups'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: {
    groupId: string
  }
}

export default function GroupBalancesPage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/groups/${params.groupId}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Group
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">Group Balances</h1>
        <p className="text-gray-600 mt-2">
          View who owes money and who is owed money in this group.
        </p>
      </div>
      
      <GroupBalances groupId={params.groupId} />
    </div>
  )
}
