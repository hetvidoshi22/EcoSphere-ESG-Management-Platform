'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from './api'
import type { Role } from './roles'
import type { FormOptions } from '@/server/services/options'

export function useCurrentUser(): {
  id: string | undefined
  name: string | null | undefined
  role: Role
  departmentId: string | null
} {
  const { data } = useSession()
  const u = data?.user as
    | { id?: string; name?: string | null; role?: Role; departmentId?: string | null }
    | undefined
  return {
    id: u?.id,
    name: u?.name,
    role: (u?.role ?? 'EMPLOYEE') as Role,
    departmentId: u?.departmentId ?? null,
  }
}

export function useOptions() {
  return useQuery<FormOptions>({
    queryKey: ['options'],
    queryFn: () => apiGet<FormOptions>('/api/options'),
    staleTime: 60_000,
  })
}
