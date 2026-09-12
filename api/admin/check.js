// POST /api/admin/check
// Тело: { initData }
// Ответ: { isAdmin: true|false }

import { requireAdmin } from '../_lib/telegram.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ isAdmin: false })
    return
  }
  const admin = requireAdmin(req)
  res.status(200).json({ isAdmin: Boolean(admin) })
}
