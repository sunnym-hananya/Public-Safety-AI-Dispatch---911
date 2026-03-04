// Static "Impact vs Legacy Process" stats shown after workflow completes.
function ImpactStats() {
  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Impact vs Legacy Process</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">4:18</div>
          <div className="stat-label">Time Saved Per Transfer</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">100%</div>
          <div className="stat-label">Context Preserved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">3x</div>
          <div className="stat-label">Operator Capacity</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Questions Repeated</div>
        </div>
      </div>
    </div>
  );
}
