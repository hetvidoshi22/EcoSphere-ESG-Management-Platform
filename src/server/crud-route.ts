import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { z } from 'zod'
import { withAuth } from '@/server/api-helpers'
import { requirePermission } from '@/server/permissions'

type Entity = Parameters<typeof requirePermission>[1]
type Ctx = { session: Session; params?: Promise<Record<string, string>> }

async function readBody(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}))
}

/** Standard collection endpoints: GET list + POST create, permission-guarded. */
export function collectionRoute<S extends z.ZodType>(opts: {
  entity: Entity
  createSchema: S
  list: (session: Session) => Promise<unknown[]>
  create: (data: z.infer<S>, session: Session) => Promise<unknown>
}) {
  const GET = withAuth(async (_req, ctx) => {
    const c = ctx as Ctx
    requirePermission(c.session, opts.entity, 'read')
    return NextResponse.json(await opts.list(c.session))
  })
  const POST = withAuth(async (req, ctx) => {
    const c = ctx as Ctx
    requirePermission(c.session, opts.entity, 'create')
    const data = opts.createSchema.parse(await readBody(req)) as z.infer<S>
    return NextResponse.json(await opts.create(data, c.session), { status: 201 })
  })
  return { GET, POST }
}

/** Standard item endpoints: GET read + PATCH update + DELETE, permission-guarded. */
export function itemRoute<S extends z.ZodType>(opts: {
  entity: Entity
  updateSchema: S
  get: (id: string) => Promise<unknown>
  update: (id: string, data: z.infer<S>) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}) {
  const GET = withAuth(async (_req, ctx) => {
    const c = ctx as Ctx
    requirePermission(c.session, opts.entity, 'read')
    const { id } = (await c.params) ?? {}
    return NextResponse.json(await opts.get(id))
  })
  const PATCH = withAuth(async (req, ctx) => {
    const c = ctx as Ctx
    requirePermission(c.session, opts.entity, 'update')
    const { id } = (await c.params) ?? {}
    const data = opts.updateSchema.parse(await readBody(req)) as z.infer<S>
    return NextResponse.json(await opts.update(id, data))
  })
  const DELETE = withAuth(async (_req, ctx) => {
    const c = ctx as Ctx
    requirePermission(c.session, opts.entity, 'delete')
    const { id } = (await c.params) ?? {}
    return NextResponse.json(await opts.remove(id))
  })
  return { GET, PATCH, DELETE }
}
