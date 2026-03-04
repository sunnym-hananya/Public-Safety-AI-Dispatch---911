// Agent 2 verification report section.
// Shows overall confidence, flagged fields, Agent 2 narrative, and human review guidance.
//
// Props:
//   verification — Agent 2 output object (may have degraded:true if Agent 2 failed)
//   elapsed      — final workflow elapsed time in seconds (for the stat card)
function VerificationReport({ verification, elapsed }) {
  // Degraded mode: Agent 2 failed, show a warning panel instead of scores.
  if (verification?.degraded) {
    return (
      <div className="comparison-section">
        <h2 className="comparison-title">Agent 2 — Verification Report</h2>
        <div className="cad-alert cad-alert-danger" style={{ marginBottom: '16px' }}>
          <span className="cad-alert-icon">⚠</span>
          Agent 2 failed — verification skipped. All extracted fields require manual dispatcher review before dispatch.
        </div>
        <div className="alert alert-warning">
          <div>
            <strong>Critical Human Decision Point:</strong> The receiving dispatcher MUST manually
            verify all context extracted by Agent 1. AI confidence scores are unavailable — treat every
            field with maximum scrutiny before committing any resources.
          </div>
        </div>
      </div>
    );
  }

  const reviewCount = verification?.flaggedFields?.length ?? 0;

  return (
    <div className="comparison-section">
      <h2 className="comparison-title">Agent 2 — Verification Report</h2>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{
            color: verification.overallConfidence >= 80 ? 'var(--success)'
                 : verification.overallConfidence >= 60 ? 'var(--warning)'
                 :                                        'var(--danger)',
          }}>
            {verification.overallConfidence}%
          </div>
          <div className="stat-label">Overall Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: reviewCount === 0 ? 'var(--success)' : 'var(--warning)' }}>
            {reviewCount}
          </div>
          <div className="stat-label">Fields Flagged for Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Agents Run</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {elapsed.toFixed(1)}s
          </div>
          <div className="stat-label">Total Workflow Time</div>
        </div>
      </div>

      {/* Review flags */}
      {reviewCount > 0 ? (
        <div className="alert alert-warning">
          <div>
            <strong>
              Human Review Required — {reviewCount} field{reviewCount !== 1 ? 's' : ''} below 80% confidence:
            </strong>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {verification.flaggedFields.map((field, i) => (
                <span key={i} style={{
                  background:   'rgba(255,184,77,0.2)',
                  color:        'var(--warning)',
                  border:       '1px solid rgba(255,184,77,0.4)',
                  padding:      '4px 12px',
                  borderRadius: '6px',
                  fontSize:     '13px',
                  fontWeight:   '600',
                  fontFamily:   "'JetBrains Mono', monospace",
                }}>
                  {field} — {verification.fieldScores[field]?.confidence}%
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <div>
            <strong>All fields verified above 80% confidence.</strong> Dispatcher may proceed with standard protocol.
          </div>
        </div>
      )}

      {/* Agent 2 narrative */}
      <div style={{
        background:   'var(--bg-secondary)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '24px',
        marginTop:    '20px',
      }}>
        <div style={{
          fontSize:      '12px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color:         'var(--text-muted)',
          fontWeight:    '600',
          marginBottom:  '12px',
        }}>
          Agent 2 Assessment
        </div>
        <p style={{ color: 'var(--text-primary)', lineHeight: '1.8', fontSize: '15px' }}>
          {verification.verificationSummary}
        </p>
      </div>

      {/* Human decision boundary */}
      <div className="alert alert-warning" style={{ marginTop: '20px' }}>
        <div>
          <strong>Critical Human Decision Point:</strong> The receiving dispatcher MUST review
          AI-generated context before dispatch. AI provides decision support — humans retain
          authority over all resource allocation and response decisions. The system fails safely:
          if AI confidence is low or the situation is ambiguous, it flags for full human review.
        </div>
      </div>
    </div>
  );
}
