// Run before the body is parsed so the static fallback never flashes during startup.
document.documentElement.classList.add('app-js')
window.addEventListener('error', event => {
  // Keep the page readable if the app bundle fails to load or execute.
  if (event.target === window || event.target?.tagName === 'SCRIPT') {
    document.documentElement.classList.remove('app-js')
  }
}, true)
