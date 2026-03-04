// Left card showing the raw 911 call transcript, call metadata, and
// a summary of what is broken in the legacy transfer process.
// Accepts an optional `call` prop (same shape as MOCK_CALL). Falls back to MOCK_CALL.
function TranscriptCard({ call }) {
  const effectiveCall = call || MOCK_CALL;

  const renderTranscriptLine = (line, i) => {
    if (line.startsWith('Operator:') || line.startsWith('EMS Dispatcher:')) {
      return (
        <div key={i}>
          <span className="speaker">{line.split(':')[0]}:</span>
          {line.split(':').slice(1).join(':')}
        </div>
      );
    }
    if (line.startsWith('Caller:')) {
      return (
        <div key={i}>
          <span className="speaker" style={{ color: 'var(--warning)' }}>
            {line.split(':')[0]}:
          </span>
          {line.split(':').slice(1).join(':')}
        </div>
      );
    }
    return (
      <div key={i} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {line}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Current Process</span>
        <span className="badge badge-danger">BROKEN</span>
      </div>

      <div className="transcript-box">
        {effectiveCall.transcript.split('\n').map(renderTranscriptLine)}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {effectiveCall.metadata.transferDelay}
          </div>
          <div className="stat-label">Transfer Delay</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {effectiveCall.metadata.questionsRepeated}
          </div>
          <div className="stat-label">Questions Repeated</div>
        </div>
      </div>

      <div className="alert alert-warning">
        <div>
          <strong>Critical Problems:</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>4+ minute wait while caller is panicked</li>
            <li>Primary operator occupies line during wait</li>
            <li>Receiving dispatcher starts from zero context</li>
            <li>Patient information must be re-explained</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
