import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getDiversity } from '@/server/services/social/diversity'

export const GET = withAuth(async () => {
  return NextResponse.json(await getDiversity())
})
