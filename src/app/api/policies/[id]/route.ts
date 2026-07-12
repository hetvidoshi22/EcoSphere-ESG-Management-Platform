import { itemRoute } from '@/server/crud-route'
import { getPolicy, updatePolicy, deletePolicy } from '@/server/services/governance/policies'
import { policyUpdateSchema } from '@/server/validators/governance'

export const { GET, PATCH, DELETE } = itemRoute({
  entity: 'policy',
  updateSchema: policyUpdateSchema,
  get: (id) => getPolicy(id),
  update: (id, data) => updatePolicy(id, data),
  remove: (id) => deletePolicy(id),
})
