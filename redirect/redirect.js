// octamod.app is now only a signpost: it sends every visitor to the same page on modwerk.app.
// The path, query and fragment are kept, so shared links and the links in account mail still work.
export const TARGET = 'https://modwerk.app'

export function destination(where) {
  // "//host" and "/\host" would otherwise be read as another site. Browsers already turn "\" into "/".
  const path = '/' + where.pathname.replace(/\\/g, '/').replace(/^\/+/, '').replace(/(^|\/)index\.html$/, '$1')
  const url = TARGET + path + where.search + where.hash
  try { if (new URL(url).origin === TARGET) return url } catch { /* Fall through to the home page. */ }
  return TARGET + '/'
}

const here = globalThis.location
if (here) here.replace(destination(here))
