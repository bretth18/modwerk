import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="back-link" href={href}><Icon name="back" size={15} />{children}</a>
}
