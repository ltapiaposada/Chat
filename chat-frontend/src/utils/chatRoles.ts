const STAFF_ROLES = new Set(['agent', 'supervisor', 'admin'])

export function isStaffRole(role?: string | null): boolean {
  return Boolean(role && STAFF_ROLES.has(role))
}
