import { Component, type ReactNode } from 'react'

/** Keep a failed view from unmounting its surrounding navigation and workspace. Key by route to reset. */
export class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
