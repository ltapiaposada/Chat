export function getAuthToken() {
  if (typeof window === 'undefined') return ''

  try {
    const raw = window.localStorage.getItem('auth')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return typeof parsed?.token === 'string' ? parsed.token : ''
  } catch {
    return ''
  }
}

export function getAuthHeaders() {
  const token = getAuthToken()
  if (!token) return {}

  return {
    Authorization: `Bearer ${token}`
  }
}

export function withAuthToken(url: string) {
  const token = getAuthToken()
  if (!token) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}
