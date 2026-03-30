/**
 * Prefix a path under `public/` with the app base (e.g. `/horse/` on GitHub Pages).
 */
export function publicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const p = path.replace(/^\//, '')
  if (base === '/') return `/${p}`
  return `${base.replace(/\/$/, '')}/${p}`
}
