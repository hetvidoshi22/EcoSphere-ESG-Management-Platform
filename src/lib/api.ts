/** Thin fetch wrapper for client mutations/queries against our route handlers. */
export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function parse(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  })
  const data = await parse(res)
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `Request failed (${res.status})`
    throw new ApiError(String(msg), res.status, data)
  }
  return data as T
}

export const apiGet = <T,>(url: string) => apiFetch<T>(url)
export const apiPost = <T,>(url: string, body?: unknown) =>
  apiFetch<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
export const apiPatch = <T,>(url: string, body?: unknown) =>
  apiFetch<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
export const apiDelete = <T,>(url: string) => apiFetch<T>(url, { method: 'DELETE' })
