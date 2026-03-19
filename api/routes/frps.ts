/**
 * Backend proxy for frps dashboard API.
 * Proxies requests to the frps webServer (typically port 7500)
 * with Basic Auth headers injected from settings.
 *
 * Why proxy through backend:
 * - Avoids CORS issues (browser can't directly call frps from user's browser)
 * - Credentials never exposed to client-side JavaScript
 * - Works from any deployment mode (Docker, desktop, SSH remote)
 */

import express, { type Request, type Response } from 'express'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const NodeCache = require('node-cache')

const router = express.Router()

// Cache frps config so it's available across requests without re-reading from body
const frpsConfigCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })

interface FrpsConfig {
  baseUrl: string
  user: string
  password: string
}

export function setFrpsConfig(config: FrpsConfig) {
  frpsConfigCache.set('frps-config', config)
}

function getFrpsConfig(): FrpsConfig | null {
  return (frpsConfigCache.get('frps-config') as FrpsConfig | undefined) ?? null
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
  if (!config) {
    res.status(503).json({ error: 'FRPS dashboard URL not configured' })
    return
  }

  const base = config.baseUrl.replace(/\/$/, '')
  const url = `${base}/api/${path.replace(/^\/+/, '')}`
  const headers: Record<string, string> = {
    Authorization: getBasicAuthHeader(config.user, config.password),
    'Content-Type': 'application/json',
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
    }
    if (body) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)

    if (response.status === 204) {
      res.status(204).end()
      return
    }

    const text = await response.text()

    // frps dashboard may return non-JSON on error
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    res.status(response.status).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
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

// GET /api/frps/proxies/:type  (tcp, udp, http, https, stcp, xtcp, sudp)
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

// POST /api/frps/config — update the cached FRPS credentials (called on settings save)
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

// GET /api/frps/configured — check if FRPS credentials are cached
router.get('/configured', (req: Request, res: Response) => {
  res.status(200).json({ configured: getFrpsConfig() !== null })
})

export default router
