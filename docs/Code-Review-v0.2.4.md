# v0.2.4 Code Review Report

**Date**: 2026-03-19
**Review Scope**: Backend (api/), Frontend (src/), Docker, i18n
**Version**: v0.2.4

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 HIGH | 12 |
| 🟡 MEDIUM | 9 |
| 🟢 LOW | 5 |
| **Total** | **26** |

---

## 🔴 HIGH Priority — Functional Bugs & Security

### 1. Missing try/catch on scanFrpc in /connect endpoint
- **File**: `api/routes/config.ts:83`
- **Issue**: In local mode `/connect`, `await localServiceManager.scanFrpc()` is NOT wrapped in try/catch. If it rejects, it causes an **unhandled promise rejection**.
- **Fix**: Wrap in try/catch with error response.

---

### 2. Command Injection — serviceName / hours unsanitized in SSH mode
- **File**: `api/routes/config.ts:244, 251, 305-310`
- **Issue**: `serviceName`, `lines`, `hours` are interpolated directly into shell commands:
  ```typescript
  cmd = `${prefix}docker ${action} ${serviceName}`;        // line 244
  cmd = `sudo systemctl ${action} ${serviceName}`;         // line 251
  cmd = `docker logs --since ${hours}h --tail ${n} ${serviceName} 2>&1`; // line 305
  cmd = `journalctl -u ${serviceName} --since "${hours} hours ago" ...`;  // line 309
  ```
- **Impact**: Attacker could inject: `; rm -rf /` if they control these parameters.
- **Fix**: Validate with regex like `/^[a-zA-Z0-9_.-]+$/` before any command construction.

---

### 3. Command Injection — same issues in localService.ts
- **File**: `api/services/localService.ts:261, 481-486, 492-496, 505, 514`
- **Issue**: Same pattern — `serviceName` and `hours` directly interpolated into commands:
  ```typescript
  return localExec(`${dockerCmd} ${action} ${serviceName}`, false); // line 486
  return localExec(`systemctl ${action} ${serviceName}`, this.hasSudo); // line 496
  return localExec(`${dockerCmd} logs --tail ${lines} ${sinceFlag} ${serviceName} 2>&1`, false); // line 505
  return localExec(`journalctl -u ${serviceName} ${sinceFlag} -n ${lines} ...`, this.hasSudo); // line 514
  ```
- **Fix**: Same as above — add service name validation.

---

### 4. Unused function getLocalConfigPath
- **File**: `api/routes/config.ts:10-12`
- **Issue**: Function is defined but never called anywhere in the codebase.
- **Fix**: Remove or use it in the local mode config path resolution.

---

### 5. Silent error swallowing in LocalPage.tsx fetchLogs
- **File**: `src/pages/LocalPage.tsx:145`
- **Issue**: `catch { void 0; }` silently ignores log fetch failures. User gets no feedback.
- **Fix**: Show toast/alert on error, or at minimum `console.error`.

---

### 6. Silent error swallowing in Connect.tsx auto-connect
- **File**: `src/pages/Connect.tsx:112-129`
- **Issue**: Auto-connect and scan failures silently ignored. Users see blank screen with no explanation.
- **Fix**: Show user-facing error feedback.

---

### 7. Stale closure in Dashboard.tsx useEffect
- **File**: `src/pages/Dashboard.tsx:156, 498`
- **Issue**:
  - Line 156: `fetchLogs` function missing from dependency array. If `fetchLogs` reference changes, effect uses stale closure.
  - Line 498: `saveToDisk` missing from dependency array.
- **Fix**: Wrap `fetchLogs` in `useCallback`, or add function refs to dependency arrays.

---

### 8. Hardcoded Chinese strings in LocalPage.tsx (i18n missing)
- **File**: `src/pages/LocalPage.tsx:375-386`
- **Issue**: "未检测到正在运行的 frpc", "frpc-gui 正在以本地模式运行...", "请确认：", "重新扫描" are hardcoded Chinese strings not using i18n.
- **Fix**: Add keys to `en.json`/`zh.json`:
  - `dashboard.localNotDetected`
  - `dashboard.localNotDetectedDesc`
  - `dashboard.localRescan`
  - `dashboard.localNotDetectedChecks` (for the checklist items)

---

### 9. Hardcoded strings in Dashboard.tsx (i18n missing)
- **File**: `src/pages/Dashboard.tsx:526, 544-578`
- **Issue**:
  - Line 526: `"Frpc Manager Dashboard"` hardcoded — should be `t('dashboard.title')` (key exists in i18n)
  - Lines 544-578: Chinese strings in Not-running card and Manual Config Loader section not using i18n.
- **Fix**: Replace with `t('...')` calls using existing or new i18n keys.

---

### 10. Port mismatch: app listens on 3001, container exposes 3000
- **Files**: `api/server.ts:9` + `Dockerfile:48` + `docker-compose.*.yml`
- **Issue**:
  ```typescript
  const PORT = process.env.PORT || 3001; // default is 3001
  ```
  But Dockerfile always exposes 3000. If someone runs `docker run ghcr.io/dukaworks/frpc-gui` without `-e PORT=3000`, the app binds to 3001 but the published port is 3000.
- **Fix**: Change `api/server.ts` default to 3000, or change Dockerfile to match.

---

### 11. Hardcoded placeholder path in docker-compose.local.yml
- **File**: `docker-compose.local.yml:35`
- **Issue**:
  ```yaml
  - /path/to/your/frpc.toml:/etc/frp/frpc.toml
  ```
  Literal placeholder path. Running `docker compose -f docker-compose.local.yml up -d` will fail immediately because the file doesn't exist.
- **Fix**: Use `${FRPC_CONFIG_PATH:-./frpc.toml}:/etc/frp/frpc.toml` with an env var default, and add a clear comment.

---

### 12. .github/ not excluded in .dockerignore
- **File**: `.dockerignore:24-26`
- **Issue**: `desktop-release.yml` and CI configuration files are baked into the Docker image.
- **Fix**: Add `.github/` to `.dockerignore`.

---

## 🟡 MEDIUM Priority — Potential Issues

### 13. Silent error swallowing — 11 instances in localService.ts
- **File**: `api/services/localService.ts:158, 231, 267, 278, 291, 342, 359, 380, 432, 443`
- **Issue**: Multiple `catch { void 0; }` blocks silently swallow errors. Legitimate failures (disk full, permission denied) go undetected.
- **Fix**: Log errors at minimum: `console.error('...', error)`.

---

### 14. ev.target?.result null check missing in LocalPage.tsx
- **File**: `src/pages/LocalPage.tsx:229-237`
- **Issue**: `ev.target?.result` could be `undefined`. The `as string` cast is unsafe.
- **Fix**: Add null check: `if (ev.target?.result == null) return;`.

---

### 15. event.target?.result null check missing in Dashboard.tsx
- **File**: `src/pages/Dashboard.tsx:427-443`
- **Issue**: Same as above in the import proxy handler.
- **Fix**: Same — add null check.

---

### 16. .dockerignore missing 20+ files
- **Files**: `.dockerignore` (incomplete)
- **Missing**: `README.md`, `README_zh.md`, `frpc_sample.toml`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`, `vercel.json`, `nodemon.json`, `.env.local`, `.env.local.example`, `index*.html`, `test*.html`, `nul`
- **Impact**: Image bloat (estimated 1-3 MB unnecessary context).
- **Fix**: Add all above to `.dockerignore`.

---

### 17. Race condition: frpc-gui starts before frpc is ready
- **File**: `docker-compose.aio.yml:53-54`
- **Issue**: `depends_on: - frpc` only waits for container to start, not for frpc to be ready. frpc startup takes 1-3 seconds. frpc-gui may scan and get "not running" on first load.
- **Fix**: Add healthcheck to frpc container and use `condition: service_healthy`:
  ```yaml
  frpc:
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:7400/api/status"]
      interval: 5s
      timeout: 3s
      retries: 3
  frpc-gui:
    depends_on:
      frpc:
        condition: service_healthy
  ```

---

### 18. Dead environment variables in docker-compose.aio.yml
- **File**: `docker-compose.aio.yml:44-46, 43`
- **Issue**: `FRPC_WEB_SERVER_ADDR`, `FRPC_WEB_SERVER_PORT`, and `FRPC_CONFIG_PATH` are defined but never read by the application code.
- **Fix**: Either implement the frpc admin API integration, or remove these env vars.

---

### 19. CI does full rebuild every time (no layer caching)
- **File**: `.github/workflows/docker-publish.yml:34-35, 69-71`
- **Issue**: `docker buildx prune -a -f` + `no-cache: true` + `cache-from: ""` + `cache-to: ""` means every CI run is a full rebuild from scratch (5-10 min vs ~1-2 min with cache).
- **Fix**: Use GitHub Actions cache backend:
  ```yaml
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
  ```

---

### 20. DevDependencies installed in builder stage unnecessarily
- **File**: `Dockerfile:10`
- **Issue**: `npm install` in builder stage installs ~17 devDependencies (electron, eslint, typescript, tailwindcss, etc.) that are not needed for Docker build.
- **Fix**: `npm ci --omit=dev` in builder stage, or split into `npm ci` then `npm rebuild`.

---

## 🟢 LOW Priority — Minor / Cosmetic

### 21. Stale package-lock.json alongside pnpm-lock.yaml
- **Files**: `package-lock.json` (root)
- Both npm and pnpm lock files exist. Project uses pnpm.
- **Fix**: Delete `package-lock.json`.

---

### 22. .obsidian/ and .trae/ not in .dockerignore
- **File**: `.dockerignore`
- IDE metadata folders included in Docker image.
- **Fix**: Add `.obsidian/` and `.trae/` to `.dockerignore`.

---

### 23. frpc pinned to v0.67.0 (old)
- **File**: `docker-compose.aio.yml:22`
- frpc v0.67.0 is from 2024. May have known CVEs or miss newer features.
- **Fix**: Update to latest stable v0.61.x or v0.62.x.

---

### 24. App.tsx startup loading uses hardcoded string
- **File**: `src/App.tsx:99-105`
- **Issue**: "Loading..." not using i18n. Should use `t('common.loading')`.
- **Fix**: Replace with i18n call.

---

### 25. No ARM multi-architecture build
- **File**: `.github/workflows/docker-publish.yml`
- **Impact**: ARM servers (Raspberry Pi, Apple Silicon NAS) cannot use native image.
- **Fix**: Add `--platform linux/amd64,linux/arm64` to build-push-action.

---

## Consolidated Fix Priority

### Immediate (fix before next release)
1. **#10** — Port mismatch (users can't access fresh docker run)
2. **#11** — Placeholder path in docker-compose.local.yml
3. **#2/#3** — Command injection sanitization
4. **#1** — Missing try/catch on scanFrpc
5. **#5/#6** — Silent error swallowing feedback

### Soon (next sprint)
6. **#7** — Stale closure in useEffect
7. **#8/#9** — Hardcoded i18n strings
8. **#12** — .dockerignore .github/
9. **#17** — Race condition with frpc startup
10. **#13** — Silent error swallowing (11 instances)

### Later
11. **#19** — CI cache optimization
12. **#25** — ARM build support
13. **#18** — Dead env vars cleanup
14. **#20** — Dev dependencies in builder stage
