const PREFIX = 'cmacica_ventas_lock:'
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

function storageKey(identifier) {
  return `${PREFIX}${identifier}`
}

function read(identifier) {
  try {
    const raw = localStorage.getItem(storageKey(identifier))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function write(identifier, data) {
  localStorage.setItem(storageKey(identifier), JSON.stringify(data))
}

export function localCheckLock(identifier) {
  const data = read(identifier)
  if (!data) return { locked: false, attempts: 0 }
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    return { locked: true, attempts: data.attempts || MAX_ATTEMPTS }
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    localStorage.removeItem(storageKey(identifier))
    return { locked: false, attempts: 0 }
  }
  return { locked: false, attempts: data.attempts || 0 }
}

export function localRecordFailed(identifier) {
  const current = localCheckLock(identifier)
  if (current.locked) return current
  const attempts = (current.attempts || 0) + 1
  const locked = attempts >= MAX_ATTEMPTS
  write(identifier, { attempts, lockedUntil: locked ? Date.now() + LOCK_MS : null })
  return { locked, attempts }
}

export function localClearAttempts(identifier) {
  localStorage.removeItem(storageKey(identifier))
}
