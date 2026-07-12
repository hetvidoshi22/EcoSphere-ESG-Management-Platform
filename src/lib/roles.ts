export type Role =
  | 'ADMIN'
  | 'ESG_MANAGER'
  | 'HR_MANAGER'
  | 'AUDITOR'
  | 'COMPLIANCE_OFFICER'
  | 'EMPLOYEE'

/**
 * Client-side permission helpers for showing/hiding UI affordances only.
 * The server permission matrix (permissions.ts) is the authoritative gate
 * and independently returns 403 — this just avoids offering dead buttons.
 */
export const can = {
  manageCsr: (r: Role) => r === 'ADMIN' || r === 'HR_MANAGER',
  joinActivity: (r: Role) => r === 'ADMIN' || r === 'HR_MANAGER' || r === 'EMPLOYEE',
  approveParticipation: (r: Role) => r === 'ADMIN' || r === 'HR_MANAGER',
  managePolicy: (r: Role) => r === 'ADMIN' || r === 'COMPLIANCE_OFFICER',
  acknowledge: (r: Role) => r === 'ADMIN' || r === 'COMPLIANCE_OFFICER' || r === 'EMPLOYEE',
  manageAudit: (r: Role) => r === 'ADMIN' || r === 'AUDITOR',
  manageCompliance: (r: Role) =>
    r === 'ADMIN' || r === 'COMPLIANCE_OFFICER' || r === 'AUDITOR',
  resolveCompliance: (r: Role) => r === 'ADMIN' || r === 'COMPLIANCE_OFFICER',
  recalculate: (r: Role) => r === 'ADMIN' || r === 'ESG_MANAGER',
  remove: (r: Role) => r === 'ADMIN',
}
