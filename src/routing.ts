import { assetUrl } from './hosting'
import { moduleIdFromSlug, modulePath, moduleSlug } from './catalog/module-links'

const moduleRoute = /^module\/([a-z0-9-]+)$/

export function moduleHref(id: string) { return assetUrl(modulePath(id)) }

/** Only app destinations participate; assets, downloads and external links keep normal browser behavior. */
export function routeFromUrl(url: URL, appUrl: URL, fallback = 'library'): string | undefined {
  if (url.origin !== appUrl.origin || !url.pathname.startsWith(appUrl.pathname)) return undefined
  const path = url.pathname.slice(appUrl.pathname.length)
  const module = /^module\/([a-z0-9-]+)\/(?:index\.html)?$/.exec(path)
  if (path && path !== 'index.html' && !module) return undefined
  const route = url.hash.slice(1) || (module ? 'module/' + module[1] : fallback)
  const nativeRoute = route.replace(/^module\/([a-z0-9-]+)(?=\?|$)/, (_match, slug: string) => 'module/' + moduleIdFromSlug(slug))
  // The forum's account page replaced the separate activity page; old #activity links open it.
  return route === 'remixes' ? 'module-sets' : route === 'activity' ? 'account' : route.startsWith('remix/') ? 'module-set/' + route.slice(6) : nativeRoute
}

export function canonicalRouteUrl(url: URL, appUrl: URL, moduleIds: readonly string[]): URL {
  const route = routeFromUrl(url, appUrl)
  if (!route) return url
  const module = moduleRoute.exec(route)
  const publicRoute = route.replace(/^module\/([a-z0-9-]+)(?=\?|$)/, (_match, id: string) => 'module/' + moduleSlug(id))
  const target = module && moduleIds.includes(module[1])
    ? new URL(modulePath(module[1]), appUrl)
    : url.hash ? new URL('#' + publicRoute, appUrl) : url
  target.search = url.search
  return target
}

export function getRoute(fallback = 'library') {
  return routeFromUrl(new URL(window.location.href), new URL(document.baseURI), fallback) ?? fallback
}

export function startRouting(moduleIds: readonly string[]) {
  const appUrl = new URL(document.baseURI)
  // Resolve the relative build base once, so client-side navigation cannot move asset URLs.
  document.querySelector('base')?.setAttribute('href', appUrl.href)
  function canonicalize() {
    const current = new URL(window.location.href)
    const target = canonicalRouteUrl(current, appUrl, moduleIds)
    if (target.href !== current.href) window.history.replaceState(window.history.state, '', target)
  }
  function notifyRoute() { window.dispatchEvent(new Event('hashchange')) }
  canonicalize()
  window.addEventListener('hashchange', canonicalize)
  window.addEventListener('popstate', notifyRoute)
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a') : null
    if (!anchor || !anchor.hasAttribute('href') || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
    const target = new URL(anchor.href)
    if (routeFromUrl(target, appUrl) === undefined) return
    event.preventDefault()
    if (target.href === window.location.href) return
    window.history.pushState(null, '', target)
    notifyRoute()
  })
}
