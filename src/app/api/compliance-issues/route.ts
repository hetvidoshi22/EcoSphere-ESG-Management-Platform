import { collectionRoute } from '@/server/crud-route'
import {
  listComplianceIssues,
  createComplianceIssue,
} from '@/server/services/governance/compliance'
import { complianceCreateSchema } from '@/server/validators/governance'

export const { GET, POST } = collectionRoute({
  entity: 'complianceIssue',
  createSchema: complianceCreateSchema,
  list: () => listComplianceIssues(),
  create: (data) => createComplianceIssue(data),
})
