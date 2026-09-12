// Общий код для всех api/admin/*.js — не является отдельным endpoint'ом
// (папка с подчёркиванием Vercel не превращает в route).

import crypto from 'node:crypto'

export function validateTelegramInitData(initData, botToken) {
  if (!initData) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const pairs = []
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== hash) return null

  const userJson = params.get('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

// Проверяет initData и что пользователь — админ (его id есть в ADMIN_CHAT_IDS).
// Возвращает объект пользователя, либо null если не прошёл проверку.
export function requireAdmin(req) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const adminIds = (process.env.ADMIN_CHAT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const { initData } = req.body || {}
  const user = validateTelegramInitData(initData, botToken)
  if (!user?.id) return null
  if (!adminIds.includes(String(user.id))) return null
  return user
}
