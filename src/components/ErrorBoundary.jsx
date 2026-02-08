import { Component } from 'react'
import { logError } from '../utils/errorLogger'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logError(error, {
      componentName: this.props.name || 'ErrorBoundary',
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-text-muted/40 mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-surface border border-border text-white hover:border-accent/30 transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
