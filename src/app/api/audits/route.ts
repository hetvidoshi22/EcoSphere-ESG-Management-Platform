import { collectionRoute } from '@/server/crud-route'
import { listAudits, createAudit } from '@/server/services/governance/audits'
import { auditCreateSchema } from '@/server/validators/governance'

export const { GET, POST } = collectionRoute({
  entity: 'audit',
  createSchema: auditCreateSchema,
  list: () => listAudits(),
  create: (data) => createAudit(data),
})
