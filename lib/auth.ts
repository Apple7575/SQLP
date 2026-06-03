export const AUTH_COOKIE = 'sqlp_auth'

export async function computeToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`sqlp::${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
