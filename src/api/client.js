const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: isForm
      ? { ...(options.headers ?? {}) }
      : {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export function fetchAuthStatus() {
  return request('/api/auth/status')
}

export function fetchMe() {
  return request('/api/auth/me')
}

export function startGuestSession() {
  return request('/api/auth/guest', { method: 'POST', body: '{}' })
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST', body: '{}' })
}

export function googleAuthUrl() {
  return `${API_BASE}/api/auth/google`
}

export function fetchSkills() {
  return request('/api/skills')
}

export function fetchSkillTasks(slug) {
  return request(`/api/skills/${slug}/tasks`)
}

export function checkTaskAnswer(slug, taskId, selectedIds) {
  return request(`/api/skills/${slug}/check`, {
    method: 'POST',
    body: JSON.stringify({ taskId, selectedIds }),
  })
}

export function submitPlate(slug, { file, skipped = false } = {}) {
  const body = new FormData()
  body.append('skipped', skipped ? 'true' : 'false')
  if (file) body.append('photo', file)
  return request(`/api/skills/${slug}/plate`, {
    method: 'POST',
    body,
  })
}

export function fetchSocialFeed() {
  return request('/api/social/feed')
}

export function fetchInventory() {
  return request('/api/inventory')
}

export function sendAiChat(messages) {
  return request('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}
