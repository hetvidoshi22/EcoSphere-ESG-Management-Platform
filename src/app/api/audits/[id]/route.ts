import { itemRoute } from '@/server/crud-route'
import { getAudit, updateAudit, deleteAudit } from '@/server/services/governance/audits'
import { auditUpdateSchema } from '@/server/validators/governance'

export const { GET, PATCH, DELETE } = itemRoute({
  entity: 'audit',
  updateSchema: auditUpdateSchema,
  get: (id) => getAudit(id),
  update: (id, data) => updateAudit(id, data),
  remove: (id) => deleteAudit(id),
})
