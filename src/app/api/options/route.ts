import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getFormOptions } from '@/server/services/options'

export const GET = withAuth(async () => {
  return NextResponse.json(await getFormOptions())
})
