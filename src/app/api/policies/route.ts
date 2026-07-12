import { collectionRoute } from '@/server/crud-route'
import { listPolicies, createPolicy } from '@/server/services/governance/policies'
import { policyCreateSchema } from '@/server/validators/governance'
import { sessionUser } from '@/server/errors'

export const { GET, POST } = collectionRoute({
  entity: 'policy',
  createSchema: policyCreateSchema,
  list: (session) => listPolicies(sessionUser(session).id),
  create: (data) => createPolicy(data),
})
