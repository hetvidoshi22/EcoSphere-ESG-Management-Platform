import { itemRoute } from '@/server/crud-route'
import {
  getComplianceIssue,
  updateComplianceIssue,
  deleteComplianceIssue,
} from '@/server/services/governance/compliance'
import { complianceUpdateSchema } from '@/server/validators/governance'

export const { GET, PATCH, DELETE } = itemRoute({
  entity: 'complianceIssue',
  updateSchema: complianceUpdateSchema,
  get: (id) => getComplianceIssue(id),
  update: (id, data) => updateComplianceIssue(id, data),
  remove: (id) => deleteComplianceIssue(id),
})
