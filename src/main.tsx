import { CommunityProvider } from './community/CommunityContext'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { startRouting } from './routing'
import { MODULES } from './catalog/modules'

startRouting(MODULES.map(module => module.id))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommunityProvider><App /></CommunityProvider>
  </StrictMode>,
)
