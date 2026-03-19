// Temporary debug endpoint — REMOVE before next production push
export default function handler(req, res) {
  const adminEmail = process.env.ADMIN_EMAIL || ''
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const nextauthSecret = process.env.NEXTAUTH_SECRET || ''
  const nextauthUrl = process.env.NEXTAUTH_URL || ''

  res.status(200).json({
    ADMIN_EMAIL: {
      defined: !!process.env.ADMIN_EMAIL,
      length: adminEmail.length,
      trimmedLength: adminEmail.trim().length,
      hasLeadingTrailingSpace: adminEmail !== adminEmail.trim(),
    },
    ADMIN_PASSWORD: {
      defined: !!process.env.ADMIN_PASSWORD,
      length: adminPassword.length,
      trimmedLength: adminPassword.trim().length,
      hasLeadingTrailingSpace: adminPassword !== adminPassword.trim(),
    },
    NEXTAUTH_SECRET: {
      defined: !!process.env.NEXTAUTH_SECRET,
      length: nextauthSecret.length,
    },
    NEXTAUTH_URL: {
      defined: !!process.env.NEXTAUTH_URL,
      value: nextauthUrl,
    },
  })
}
