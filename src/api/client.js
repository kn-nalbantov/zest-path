const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
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
