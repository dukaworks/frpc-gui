/**
 * Backend proxy for frps dashboard API.
 * Proxies requests to the frps webServer with Basic Auth headers.
 *
 * Why proxy through backend:
 * - Avoids CORS issues
 * - Credentials never exposed to client-side JavaScript
 * - Works from any deployment mode (Docker, desktop, SSH remote)
 */

import express, { type Request, type Response } from 'express'

const router = express.Router()

// Simple module-level cache — no external dependencies
let cachedConfig: FrpsConfig | null = null

interface FrpsConfig {
  baseUrl: string
  user: string
  password: string
}

export function setFrpsConfig(config: FrpsConfig) {
  cachedConfig = config
  console.log('[frps] config saved:', { baseUrl: config.baseUrl, user: config.user, passwordSet: !!config.password })
}

function getFrpsConfig(): FrpsConfig | null {
  return cachedConfig
}

function getBasicAuthHeader(user: string, password: string): string {
  const encoded = Buffer.from(`${user}:${password}`).toString('base64')
  return `Basic ${encoded}`
}

async function proxyFrps(
  res: Response,
  path: string,
  method: 'GET' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<void> {
  const config = getFrpsConfig()
  console.log('[frps] proxyFrps called, path:', path, 'config:', config ? { baseUrl: config.baseUrl, user: config.user, hasPwd: !!config.password } : null)
  if (!config) {
    res.status(503).json({ error: 'FRPS dashboard URL not configured' })
    return
  }

  const base = config.baseUrl.replace(/\/$/, '')
  const url = `${base}/api/${path.replace(/^\/+/, '')}`
  console.log('[frps] fetching URL:', url)
  const headers: Record<string, string> = {
    Authorization: getBasicAuthHeader(config.user, config.password),
    'Content-Type': 'application/json',
  }
  console.log('[frps] Authorization header:', headers.Authorization)

  try {
    const fetchOptions: RequestInit = { method, headers }
    if (body) fetchOptions.body = JSON.stringify(body)

    const response = await fetch(url, fetchOptions)
    console.log('[frps] FRPS response status:', response.status)

    if (response.status === 204) {
      res.status(204).end()
      return
    }

    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    res.status(response.status).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('[frps] fetch error:', message)
    res.status(502).json({ error: `Failed to connect to FRPS dashboard: ${message}` })
  }
}

// GET /api/frps/info
router.get('/info', async (req: Request, res: Response) => {
  await proxyFrps(res, 'serverinfo')
})

// GET /api/frps/clients
router.get('/clients', async (req: Request, res: Response) => {
  await proxyFrps(res, 'clients')
})

// GET /api/frps/clients/:key
router.get('/clients/:key', async (req: Request, res: Response) => {
  await proxyFrps(res, `clients/${req.params.key}`)
})

// GET /api/frps/proxies/:type (tcp, udp, http, https, stcp, xtcp, sudp)
router.get('/proxies/:type', async (req: Request, res: Response) => {
  await proxyFrps(res, `proxy/${req.params.type}`)
})

// GET /api/frps/proxies/by-name/:name
router.get('/proxies/by-name/:name', async (req: Request, res: Response) => {
  await proxyFrps(res, `proxies/${req.params.name}`)
})

// DELETE /api/frps/proxies/offline — clear offline proxies
router.delete('/proxies/offline', async (req: Request, res: Response) => {
  await proxyFrps(res, 'proxies?status=offline', 'DELETE')
})

// POST /api/frps/config — update the cached FRPS credentials
router.post('/config', (req: Request, res: Response) => {
  const { baseUrl, user, password } = req.body as {
    baseUrl?: string
    user?: string
    password?: string
  }
  if (!baseUrl) {
    res.status(400).json({ error: 'baseUrl is required' })
    return
  }
  setFrpsConfig({
    baseUrl: baseUrl.replace(/\/$/, ''),
    user: user ?? '',
    password: password ?? '',
  })
  res.status(200).json({ success: true })
})

// GET /api/frps/configured — check if credentials are cached (debug only)
router.get('/configured', (req: Request, res: Response) => {
  res.status(200).json({
    configured: getFrpsConfig() !== null,
    baseUrl: getFrpsConfig()?.baseUrl ?? null,
    user: getFrpsConfig()?.user ?? null,
  })
})

export default router
