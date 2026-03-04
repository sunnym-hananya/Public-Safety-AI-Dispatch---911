// Workflow execution timeline — three stacked sections:
//   1. AI vs Manual comparison bars (elapsed vs 5m 33s manual process)
//   2. Per-agent segmented bar — click a segment to open its detail panel
//   3. Detail panel — shows on segment click
//
// Props:
//   logs    — array of log entries (same shape as WorkflowLog)
//   elapsed — final elapsed time in seconds
function WorkflowTimeline({ logs, elapsed }) {
  const { useState } = React;
  const [selected, setSelected] = useState(null); // index of clicked segment

  // Only render completed entries that have a real duration
  const completed = logs.filter(e => e.duration != null && e.status !== 'running');
  if (completed.length === 0) return null;

  const totalMs = completed.reduce((sum, e) => sum + e.duration, 0);
  const MANUAL_SECONDS = 333; // total manual process time from MANUAL_PROCESS_STEPS

  const STATUS_COLOR = {
    success:  { bg: 'rgba(0,212,170,0.18)',  border: 'rgba(0,212,170,0.5)',  fill: 'var(--success)' },
    degraded: { bg: 'rgba(255,184,77,0.18)', border: 'rgba(255,184,77,0.5)', fill: 'var(--warning)' },
    error:    { bg: 'rgba(255,77,77,0.18)',  border: 'rgba(255,77,77,0.5)',  fill: 'var(--danger)'  },
  };

  const STATUS_ICON = { success: '✓', degraded: '⚠', error: '✗' };

  // Derive short agent code from agent string like "Agent 1: Extract" → "A1"
  const shortCode = (agent) => {
    const m = agent.match(/Agent\s+(\d+)/i);
    return m ? `A${m[1]}` : agent.slice(0, 2).toUpperCase();
  };

  const aiBarPct   = Math.min(96, (elapsed / MANUAL_SECONDS) * 96);
  const manualPct  = 96;

  const formatElapsed = (s) => s >= 60 ? `${Math.floor(s/60)}m ${Math.round(s%60)}s` : `${s.toFixed(1)}s`;

  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Workflow Timeline</h2>

      {/* ── 1. AI vs Manual comparison bars ── */}
      <div className="timeline-compare">
        <div className="timeline-compare-row">
          <span className="timeline-compare-label">AI Workflow</span>
          <div className="timeline-compare-track">
            <div className="timeline-compare-bar ai-bar" style={{ width: `${aiBarPct}%` }}>
              <span className="timeline-bar-label">{formatElapsed(elapsed)}</span>
            </div>
          </div>
        </div>
        <div className="timeline-compare-row">
          <span className="timeline-compare-label">Manual Process</span>
          <div className="timeline-compare-track">
            <div className="timeline-compare-bar manual-bar" style={{ width: `${manualPct}%` }}>
              <span className="timeline-bar-label">5m 33s</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px', textAlign: 'right' }}>
          {MANUAL_SECONDS > elapsed
            ? `${formatElapsed(MANUAL_SECONDS - elapsed)} faster than manual dispatch`
            : 'Comparable to manual process'}
        </div>
      </div>

      {/* ── 2. Per-agent segmented bar ── */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Agent Execution Breakdown — click segment for details
        </div>
        <div className="timeline-segments">
          {completed.map((entry, i) => {
            const pct    = Math.max(8, (entry.duration / totalMs) * 100);
            const colors = STATUS_COLOR[entry.status] || STATUS_COLOR.success;
            const isSelected = selected === i;
            return (
              <div
                key={entry.id}
                className={`timeline-segment${isSelected ? ' timeline-segment--selected' : ''}`}
                style={{ width: `${pct}%`, background: colors.bg, borderColor: colors.border }}
                onClick={() => setSelected(isSelected ? null : i)}
                title={`${entry.agent} — ${(entry.duration / 1000).toFixed(2)}s`}
              >
                <div className="timeline-segment-name">{shortCode(entry.agent)}</div>
                <div className="timeline-segment-time">{(entry.duration / 1000).toFixed(1)}s</div>
                <div className="timeline-segment-icon" style={{ color: colors.fill }}>
                  {STATUS_ICON[entry.status] || '?'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Detail panel ── */}
      {selected !== null && completed[selected] && (() => {
        const entry  = completed[selected];
        const colors = STATUS_COLOR[entry.status] || STATUS_COLOR.success;
        return (
          <div className="timeline-detail" style={{ borderColor: colors.border }}>
            <div className="timeline-detail-header">
              <span style={{ fontWeight: '700' }}>{entry.agent}</span>
              <span className="timeline-detail-badge" style={{ background: colors.bg, color: colors.fill, borderColor: colors.border }}>
                {entry.status.toUpperCase()}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                {(entry.duration / 1000).toFixed(3)}s
              </span>
            </div>
            <div className="timeline-detail-message">{entry.message}</div>
            {entry.error && (
              <div className="timeline-detail-error">{entry.error}</div>
            )}
            <div className="timeline-detail-meta">
              Started: {new Date(entry.startedAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
