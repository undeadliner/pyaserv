#!/usr/bin/env bun
/**
 * One-shot onboarding: `bun run setup`.
 *
 * Writes NODE_AUTH_TOKEN into .env.local so subsequent `bun install` works
 * without manual config. Bun auto-loads .env.local before resolving the
 * dependency graph, so the `${NODE_AUTH_TOKEN}` placeholder in .npmrc is
 * interpolated transparently.
 *
 * Token source:
 *   1. Existing NODE_AUTH_TOKEN env (no-op if already there — CI path).
 *   2. `git credential fill host=github.com` — same helper `git push` uses.
 *   3. `gh auth token`.
 *
 * If the token's OAuth scopes don't include `read:packages`, we print the
 * exact remediation command and exit non-zero so the dev catches it now,
 * not at the next install.
 *
 * Why no preinstall hook: bun runs lifecycle scripts AFTER dependency
 * resolution. By the time preinstall fires, the registry has already
 * returned 401. Setup needs to happen explicitly, before the first install.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ENV_PATH = join(process.cwd(), '.env.local')

if (process.env['NODE_AUTH_TOKEN']) {
  console.log('[setup] NODE_AUTH_TOKEN already in env — nothing to do.')
  process.exit(0)
}

const fromGitCredential = (): string => {
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString()
    return out.match(/^password=(.+)$/m)?.[1]?.trim() ?? ''
  } catch {
    return ''
  }
}

const fromGhCli = (): string => {
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const checkScopes = async (token: string): Promise<ReadonlyArray<string>> => {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (res.headers.get('x-oauth-scopes') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const token = fromGitCredential() || fromGhCli()

if (!token) {
  console.error('[setup] Could not get a GitHub token from either git credential helper or gh CLI.')
  console.error('[setup] Run one of:')
  console.error('[setup]   git clone https://github.com/anything    # seed the credential helper')
  console.error('[setup]   gh auth login                            # if you prefer the gh CLI')
  process.exit(1)
}

const scopes = await checkScopes(token)
const hasPackages =
  scopes.includes('read:packages') ||
  scopes.includes('write:packages') ||
  scopes.length === 0 // fine-grained PATs report empty x-oauth-scopes; trust them
if (!hasPackages) {
  console.error(`[setup] Token works but lacks 'read:packages' scope (has: ${scopes.join(', ')}).`)
  console.error('[setup] One-time fix:')
  console.error('[setup]   gh auth refresh -h github.com -s read:packages')
  console.error("[setup] Then re-run 'bun run setup'.")
  process.exit(1)
}

const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
const stripped = existing
  .split(/\r?\n/)
  .filter((line) => !line.startsWith('NODE_AUTH_TOKEN='))
  .join('\n')
  .replace(/\n+$/, '')
const next = (stripped ? `${stripped}\n` : '') + `NODE_AUTH_TOKEN=${token}\n`
writeFileSync(ENV_PATH, next, { mode: 0o600 })

console.log('[setup] Wrote NODE_AUTH_TOKEN to .env.local.')
console.log('[setup] Now run: bun install')
