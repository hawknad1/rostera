export function e2eAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL?.trim()
  const password = process.env.E2E_ADMIN_PASSWORD?.trim()
  if (!email || !password) {
    return null
  }
  return { email, password }
}

export function e2eStaffCredentials() {
  const email = process.env.E2E_STAFF_EMAIL?.trim()
  const password = process.env.E2E_STAFF_PASSWORD?.trim()
  if (!email || !password) {
    return null
  }
  return { email, password }
}
