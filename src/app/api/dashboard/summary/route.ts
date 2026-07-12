import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getDashboardSummary } from '@/server/services/dashboard'

export const GET = withAuth(async () => {
  return NextResponse.json(await getDashboardSummary())
})
