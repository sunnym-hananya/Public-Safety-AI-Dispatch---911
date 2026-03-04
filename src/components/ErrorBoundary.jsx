// React class-based error boundary.
// Catches unhandled JS errors in any child component tree and renders a recovery
// panel instead of crashing the entire app.
//
// Usage: wrap the root render or any subtree that might throw.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background:   'rgba(255,77,77,0.08)',
          border:       '1px solid rgba(255,77,77,0.3)',
          borderRadius: '12px',
          padding:      '32px',
          margin:       '20px 0',
          textAlign:    'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>⚠</div>
          <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--danger)', marginBottom: '10px' }}>
            Unexpected Component Error
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.7' }}>
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding:      '8px 24px',
              background:   'rgba(255,77,77,0.15)',
              color:        'var(--danger)',
              border:       '1px solid rgba(255,77,77,0.4)',
              borderRadius: '8px',
              cursor:       'pointer',
              fontSize:     '13px',
              fontWeight:   '600',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
