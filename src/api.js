const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')
const ACCESS_TOKEN_KEY = 'stockroom_access_token'
const REFRESH_TOKEN_KEY = 'stockroom_refresh_token'
let refreshRequest

function readTokens() {
  return {
    accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY),
  }
}

export function saveTokens(tokens) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function hasTokens() {
  const { accessToken, refreshToken } = readTokens()
  return Boolean(accessToken && refreshToken)
}

async function decodeResponse(response) {
  const text = await response.text()
  let data = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`The API returned an unreadable response (${response.status}).`)
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status}).`)
  }

  return data
}

async function refreshTokens() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const { refreshToken } = readTokens()
      if (!refreshToken) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      const data = await decodeResponse(response)
      saveTokens(data.tokens)
      return data.tokens.access_token
    })().finally(() => {
      refreshRequest = undefined
    })
  }

  return refreshRequest
}

export async function request(path, options = {}, retry = true) {
  const { accessToken } = readTokens()
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshTokens()
      return request(path, options, false)
    } catch (error) {
      clearTokens()
      throw error
    }
  }

  return decodeResponse(response)
}

export const api = {
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }, false),
  logout: (refreshToken) => request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }),
  profile: () => request('/me'),
  products: () => request('/products'),
  createProduct: (product) => request('/products/create', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id, product) => request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  deleteProduct: (id) => request(`/products/${id}/delete`, {
    method: 'DELETE',
  }),
}
