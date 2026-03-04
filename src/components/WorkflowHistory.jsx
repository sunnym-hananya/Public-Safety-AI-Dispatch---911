// Collapsible workflow history panel — shows last 5 completed runs from localStorage.
// Clicking a row restores that run's data into the app.
//
// Props:
//   history  — array of run snapshots (newest first)
//   onLoad   — callback(run) — called when user clicks a history row
//   onClear  — callback() — called when user clicks "Clear History"
function WorkflowHistory({ history, onLoad, onClear }) {
  const { useState } = React;
  const [open, setOpen] = useState(false);

  if (!history || history.length === 0) return null;

  // Relative timestamp: "2 min ago", "just now", etc.
  const relativeTime = (id) => {
    const diff = Date.now() - id;
    if (diff < 60000)      return 'just now';
    if (diff < 3600000)    return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)   return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(id).toLocaleDateString();
  };

  return (
    <div className="workflow-history-section">
      <button className="workflow-log-toggle" onClick={() => setOpen(o => !o)}>
        <span>Workflow History ({history.length} run{history.length !== 1 ? 's' : ''})</span>
        <span className="workflow-log-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="workflow-log-body">
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Click any run to restore it. History is saved in your browser's localStorage.
          </div>

          {history.map((run) => {
            const isDegraded = run.degradedSteps && run.degradedSteps.length > 0;
            return (
              <div
                key={run.id}
                className="history-run-item"
                onClick={() => { onLoad(run); setOpen(false); }}
                title="Click to restore this run"
              >
                <span className="history-run-time">{relativeTime(run.id)}</span>
                <div className="history-run-info">
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>
                    {run.incidentType || 'Unknown'} — {run.urgencyLevel || '?'}
                  </span>
                  {run.location && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {run.location}
                    </span>
                  )}
                </div>
                <span className="history-run-elapsed">
                  {run.elapsed != null ? `${run.elapsed.toFixed(1)}s` : '—'}
                </span>
                {run.confidence != null && (
                  <span style={{
                    fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
                    color: run.confidence >= 80 ? 'var(--success)' : run.confidence >= 60 ? 'var(--warning)' : 'var(--danger)',
                    minWidth: '40px', textAlign: 'right',
                  }}>
                    {run.confidence}%
                  </span>
                )}
                <span className={`history-run-badge ${isDegraded ? 'history-run-badge--degraded' : 'history-run-badge--nominal'}`}>
                  {isDegraded ? 'DEGRADED' : 'NOMINAL'}
                </span>
              </div>
            );
          })}

          <button
            className="workflow-log-export"
            style={{ color: 'var(--danger)', borderColor: 'rgba(255,77,77,0.3)', marginTop: '12px' }}
            onClick={onClear}
          >
            ✕ Clear History
          </button>
        </div>
      )}
    </div>
  );
}
