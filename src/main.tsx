import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n/config'
import './index.css'

function renderFatalError(message: string, detail?: unknown) {
  const rootElement = document.getElementById('root')
  if (!rootElement) return
  const detailText = (() => {
    if (!detail) return ''
    try {
      if (detail instanceof Error) return detail.stack || detail.message
      return typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)
    } catch {
      return String(detail)
    }
  })()

  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #0b1220; color: #fff;">
      <div style="max-width: 900px; width: 100%; background: #111827; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,.35); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
        <div style="font-size: 16px; font-weight: 800; margin-bottom: 10px;">前端启动失败</div>
        <div style="font-size: 13px; line-height: 1.6; opacity: .95; margin-bottom: 12px;">${message}</div>
        ${detailText ? `<pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.5; background: #0b1220; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); overflow: auto; max-height: 55vh;">${detailText.replace(/</g, '&lt;')}</pre>` : ''}
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  renderFatalError('捕获到脚本错误（window.error）。', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  renderFatalError('捕获到未处理的 Promise 异常（unhandledrejection）。', event.reason)
})

const rootElement = document.getElementById('root')

if (rootElement) {
  const root = createRoot(rootElement)
  try {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (err) {
    renderFatalError('React 渲染阶段抛异常（同步）。', err)
  }
} else {
  renderFatalError('Root element not found')
}
