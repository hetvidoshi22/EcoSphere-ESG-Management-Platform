import { itemRoute } from '@/server/crud-route'
import {
  getCsrActivity,
  updateCsrActivity,
  deleteCsrActivity,
} from '@/server/services/social/csr'
import { csrActivityUpdateSchema } from '@/server/validators/social'

export const { GET, PATCH, DELETE } = itemRoute({
  entity: 'csrActivity',
  updateSchema: csrActivityUpdateSchema,
  get: (id) => getCsrActivity(id),
  update: (id, data) => updateCsrActivity(id, data),
  remove: (id) => deleteCsrActivity(id),
})
