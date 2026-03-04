// Expandable workflow execution log.
// Shows a timestamped step timeline with agent, status, duration, and any errors.
// Includes a JSON export button for developer inspection.
//
// Props:
//   logs — array of {
//     id, agent, status ('running'|'success'|'degraded'|'error'),
//     message, startedAt (ms epoch), duration (ms|null), error (string|null)
//   }
function WorkflowLog({ logs }) {
  const { useState } = React;
  const [open, setOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  const STATUS_ICON = {
    running:  <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></span>,
    success:  <span style={{ color: 'var(--success)',  fontWeight: '700' }}>✓</span>,
    degraded: <span style={{ color: 'var(--warning)',  fontWeight: '700' }}>⚠</span>,
    error:    <span style={{ color: 'var(--danger)',   fontWeight: '700' }}>✗</span>,
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `psap-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workflow-log-section">
      <button className="workflow-log-toggle" onClick={() => setOpen(o => !o)}>
        <span>Workflow Log ({logs.length} step{logs.length !== 1 ? 's' : ''})</span>
        <span className="workflow-log-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="workflow-log-body">
          <div className="workflow-log-entries">
            {logs.map((entry) => (
              <div key={entry.id} className={`log-entry log-entry--${entry.status}`}>
                <div className="log-entry-icon">
                  {STATUS_ICON[entry.status] || <span style={{ color: 'var(--text-muted)' }}>○</span>}
                </div>
                <div className="log-entry-body">
                  <div className="log-entry-header">
                    <span className="log-entry-agent">{entry.agent}</span>
                    <span className="log-entry-time">
                      {new Date(entry.startedAt).toLocaleTimeString([], { hour12: false })}
                    </span>
                    {entry.duration != null && (
                      <span className="log-entry-duration">
                        {(entry.duration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                  <div className="log-entry-message">{entry.message}</div>
                  {entry.error && (
                    <div className="log-entry-error">{entry.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="workflow-log-export" onClick={exportJSON}>
            ↓ Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
