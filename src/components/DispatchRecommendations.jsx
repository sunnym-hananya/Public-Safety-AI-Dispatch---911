// Agent 4 — Dispatch Recommendations section.
// Displays the routing engine's output: priority score breakdown, decision path,
// primary/backup/multi-unit recommendation cards, human-in-loop flags, and an
// "Approve Dispatch" button with confirmation.
//
// Props:
//   routing   — Agent 4 output object
//   onApprove — callback fired when dispatcher approves
//   approved  — boolean; true after approval
function DispatchRecommendations({ routing, onApprove, approved }) {
  const { totalPriority, scoreBreakdown = [], primary, backup, multiUnit = [], decisionPath = [], flags = [], escalationRequired } = routing;

  // ── Score bar (0-100 clamped) ─────────────────────────────────────────────
  function ScoreBar({ score, color }) {
    const pct = Math.min(100, Math.max(0, score));
    return (
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  // ── Unit recommendation card ──────────────────────────────────────────────
  function UnitCard({ unit, label, isPrimary }) {
    if (!unit) return (
      <div className="rec-card rec-card--empty">
        <div className="rec-card-label">{label}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>No unit available</div>
      </div>
    );

    const statusColor = unit.status === 'Available' ? 'var(--success)'
                      : unit.status === 'En Route'  ? 'var(--warning)'
                      :                               'var(--text-muted)';

    return (
      <div className={`rec-card${isPrimary ? ' rec-card--primary' : ''}`}>
        <div className="rec-card-label">{label}</div>
        <div className="rec-card-header">
          <span className="rec-unit-id">{isPrimary && '★ '}{unit.unitId}</span>
          <span style={{ color: statusColor, fontSize: '13px', fontWeight: '600' }}>{unit.status}</span>
        </div>

        <div className="rec-card-meta">
          <span>{unit.unitType}</span>
          <span>{unit.distance} km away</span>
          {unit.eta && <span>ETA ~{unit.eta} min</span>}
        </div>

        <ScoreBar score={unit.score} color={isPrimary ? 'var(--accent-primary)' : 'var(--accent-secondary)'} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
          Score: {unit.score}/100
        </div>

        {unit.capabilities?.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {unit.capabilities.map((cap) => (
              <span key={cap} style={{
                background:   'rgba(0,136,255,0.15)',
                color:        'var(--accent-secondary)',
                border:       '1px solid rgba(0,136,255,0.3)',
                padding:      '2px 8px',
                borderRadius: '4px',
                fontSize:     '11px',
                fontWeight:   '600',
              }}>{cap}</span>
            ))}
          </div>
        )}

        <div className="rec-reasoning">{unit.reasoning}</div>
      </div>
    );
  }

  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Agent 4 — Dispatch Recommendations</h2>

      {/* Human-in-loop flags */}
      {flags.length > 0 && (
        <div className="dispatch-flags">
          {flags.map((flag, i) => (
            <div key={i} className={`cad-alert cad-alert-${flag.severity}`} style={{ marginBottom: '8px' }}>
              <span className="cad-alert-icon">{flag.severity === 'danger' ? '🚨' : '⚠'}</span>
              {flag.message}
            </div>
          ))}
        </div>
      )}

      {/* Priority score + decision path — side by side */}
      <div className="dispatch-grid">

        {/* Left: incident priority score breakdown */}
        <div className="cad-card">
          <div className="cad-card-title">Incident Priority Score</div>
          <div className="score-breakdown">
            {scoreBreakdown.map((row) => (
              <div key={row.factor} className="score-row">
                <span className="score-factor">{row.factor}</span>
                <span className="score-note">{row.note}</span>
                <span className={`score-points${row.points > 0 ? ' score-points--pos' : row.points < 0 ? ' score-points--neg' : ''}`}>
                  {row.points > 0 ? `+${row.points}` : row.points}
                </span>
              </div>
            ))}
            <div className="score-row score-row--total">
              <span className="score-factor">Total Priority</span>
              <span></span>
              <span className="score-total-value">{totalPriority}</span>
            </div>
          </div>
        </div>

        {/* Right: decision path */}
        <div className="cad-card">
          <div className="cad-card-title">Decision Path</div>
          <div className="decision-path">
            {decisionPath.map((item, i) => (
              <React.Fragment key={i}>
                <div className={`decision-step decision-step--${item.ok ? 'ok' : 'fail'}`}>
                  <div className="decision-step-icon">
                    {item.ok ? '✓' : '✗'}
                  </div>
                  <div className="decision-step-body">
                    <div className="decision-step-name">{item.step}</div>
                    <div className="decision-step-result">{item.result}</div>
                    <div className="decision-step-detail">{item.detail}</div>
                  </div>
                </div>
                {i < decisionPath.length - 1 && <div className="decision-connector"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation cards */}
      <div style={{ marginTop: '20px' }}>
        <div className="cad-card-title" style={{ marginBottom: '14px' }}>Recommended Units</div>
        <div className="rec-cards">
          <UnitCard unit={primary} label="Primary Dispatch" isPrimary={true} />
          <UnitCard unit={backup}  label="Backup"           isPrimary={false} />
        </div>

        {/* Multi-unit recommendation */}
        {multiUnit.length > 0 && (
          <div className="cad-card" style={{ marginTop: '16px' }}>
            <div className="cad-card-title">Multi-Unit Recommendation</div>
            <div className="unit-list">
              {multiUnit.map((unit) => (
                <div key={unit.unitId} className="unit-row">
                  <span className="unit-id">{unit.unitId}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', minWidth: '90px' }}>{unit.unitType}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', flex: 1 }}>{unit.reasoning}</span>
                  {unit.eta && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'var(--accent-primary)' }}>
                      ~{unit.eta} min
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve Dispatch */}
      <div style={{ marginTop: '24px' }}>
        {!approved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              className={`approve-btn${escalationRequired ? ' approve-btn--escalate' : ''}`}
              onClick={onApprove}
            >
              {escalationRequired ? '⚠ Approve with Flags' : '✓ Approve Dispatch'}
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Dispatcher must review AI recommendation before authorising dispatch
            </span>
          </div>
        ) : (
          <div className="approve-confirmation">
            <div className="approve-confirmation-icon">✓</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>
                Dispatch Approved by Dispatcher
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>
                In a real system, this would:
                <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                  <li>Transmit dispatch order to <strong>{primary?.unitId || 'selected unit'}</strong> via CAD terminal</li>
                  <li>Open a radio channel and notify the crew</li>
                  <li>Start the incident clock and log the dispatcher's decision</li>
                  <li>Update unit status to <strong>En Route</strong> in the CAD system</li>
                  <li>Notify the caller with estimated arrival time</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
