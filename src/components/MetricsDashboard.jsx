// Metrics dashboard — shows key performance metrics for the completed workflow.
// Includes a Before/After toggle comparing AI performance to manual process.
//
// Props:
//   logs         — array of completed log entries
//   elapsed      — final elapsed seconds
//   verification — Agent 2 output (may be null / degraded)
//   routing      — Agent 4 output (may be null)
//   cadData      — Agent 3 output (may be null / degraded)
function MetricsDashboard({ logs, elapsed, verification, routing, cadData, manualSteps }) {
  const { useState } = React;
  const [view, setView] = useState('after'); // 'after' | 'before'

  const steps    = manualSteps || MANUAL_PROCESS_STEPS;
  const completed = logs.filter(e => e.duration != null && e.status !== 'running');
  const totalMs   = completed.reduce((sum, e) => sum + e.duration, 0);
  const MANUAL_S  = steps.reduce((s, r) => s + r.duration, 0);

  const STATUS_FILL = {
    success:  'var(--success)',
    degraded: 'var(--warning)',
    error:    'var(--danger)',
  };

  // Derived metric values
  const timeSaved       = Math.max(0, MANUAL_S - elapsed);
  const confidence      = verification?.overallConfidence ?? '—';
  const fieldsF         = verification?.flaggedFields?.length ?? '—';
  const priorityScore   = routing?.totalPriority ?? '—';
  const unitsEvaluated  = cadData?.availableUnits?.length ?? '—';

  const confidenceColor = typeof confidence === 'number'
    ? confidence >= 80 ? 'var(--success)' : confidence >= 60 ? 'var(--warning)' : 'var(--danger)'
    : 'var(--text-muted)';

  const timeSavedColor  = timeSaved > 0 ? 'var(--success)' : 'var(--text-muted)';

  const formatTime = (s) => s >= 60 ? `${Math.floor(s/60)}m ${Math.round(s%60)}s` : `${s.toFixed(1)}s`;

  // Manual process cumulative time for bar widths
  const manualTotal = MANUAL_S;

  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 className="comparison-title" style={{ margin: 0 }}>Performance Metrics</h2>
        <div className="before-after-toggle">
          <button
            className={`before-after-btn${view === 'after' ? ' before-after-btn--active' : ''}`}
            onClick={() => setView('after')}
          >
            After AI
          </button>
          <button
            className={`before-after-btn${view === 'before' ? ' before-after-btn--active' : ''}`}
            onClick={() => setView('before')}
          >
            Before (Manual)
          </button>
        </div>
      </div>

      {view === 'after' ? (
        <>
          {/* ── 6-metric grid ── */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                {formatTime(elapsed)}
              </div>
              <div className="stat-label">Total AI Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: timeSavedColor }}>
                {timeSaved > 0 ? formatTime(timeSaved) : '—'}
              </div>
              <div className="stat-label">Time Saved vs Manual</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: confidenceColor }}>
                {typeof confidence === 'number' ? `${confidence}%` : confidence}
              </div>
              <div className="stat-label">Overall Confidence</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: fieldsF === 0 ? 'var(--success)' : 'var(--warning)' }}>
                {fieldsF}
              </div>
              <div className="stat-label">Fields Flagged</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: typeof priorityScore === 'number' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {priorityScore}
              </div>
              <div className="stat-label">Priority Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: typeof unitsEvaluated === 'number' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {unitsEvaluated}
              </div>
              <div className="stat-label">Units Evaluated</div>
            </div>
          </div>

          {/* ── Per-agent time breakdown ── */}
          {completed.length > 0 && (
            <div className="agent-breakdown">
              <div className="agent-breakdown-title">Agent Time Breakdown</div>
              {completed.map((entry) => {
                const pct   = totalMs > 0 ? Math.max(2, (entry.duration / totalMs) * 100) : 0;
                const fill  = STATUS_FILL[entry.status] || 'var(--accent-primary)';
                return (
                  <div key={entry.id} className="agent-bar-row">
                    <span className="agent-bar-label">{entry.agent.replace(/: .*/, '')}</span>
                    <div className="agent-bar-track">
                      <div className="agent-bar-fill" style={{ width: `${pct}%`, background: fill }}></div>
                    </div>
                    <span className="agent-bar-time">{(entry.duration / 1000).toFixed(2)}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Before: Manual process steps ── */
        <div className="manual-steps">
          <div className="agent-breakdown-title" style={{ marginBottom: '16px' }}>
            Manual Dispatch Process — {formatTime(manualTotal)} total
          </div>
          {steps.map((row, i) => {
            const pct = (row.duration / manualTotal) * 88;
            return (
              <div key={i} className="manual-step-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{row.step}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--warning)' }}>
                    {row.duration}s
                  </span>
                </div>
                <div className="agent-bar-track" style={{ marginBottom: '4px' }}>
                  <div className="manual-step-bar" style={{ width: `${pct}%` }}></div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.note}</div>
              </div>
            );
          })}
          <div style={{
            marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)',
            fontSize: '13px', color: 'var(--success)', fontWeight: '600',
          }}>
            AI workflow completed in {formatTime(elapsed)} — saving {formatTime(timeSaved)} per incident
          </div>
        </div>
      )}
    </div>
  );
}
