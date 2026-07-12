import { collectionRoute } from '@/server/crud-route'
import { listCsrActivities, createCsrActivity } from '@/server/services/social/csr'
import { csrActivityCreateSchema } from '@/server/validators/social'

export const { GET, POST } = collectionRoute({
  entity: 'csrActivity',
  createSchema: csrActivityCreateSchema,
  list: () => listCsrActivities(),
  create: (data) => createCsrActivity(data),
})
