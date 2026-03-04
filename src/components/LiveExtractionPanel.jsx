// LiveExtractionPanel — right panel shown during 'in_call' phase.
// Shows agent status pills, incrementally-populating extraction fields,
// and streaming verification notes.
//
// Props:
//   partialExtraction — object (incrementally built extraction)
//   agentStatuses     — { extract, verify, cad, routing } each 'idle'|'working'|'done'|'error'
//   verificationNotes — Array<{ type: 'ok'|'warning', text }>

// ── Sub-component: single agent status pill ────────────────────────────────
function AgentPill({ label, status }) {
  const cls = status === 'working' ? 'agent-pill agent-pill--working'
            : status === 'done'    ? 'agent-pill agent-pill--done'
            : status === 'error'   ? 'agent-pill agent-pill--error'
            :                        'agent-pill';

  let icon;
  if (status === 'working') {
    icon = React.createElement('span', { className: 'spinner', style: { width: '11px', height: '11px', borderWidth: '2px', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' } });
  } else if (status === 'done')  { icon = React.createElement('span', { style: { marginRight: '4px' } }, '\u2713'); }
  else if (status === 'error') { icon = React.createElement('span', { style: { marginRight: '4px' } }, '\u2717'); }
  else                         { icon = React.createElement('span', { style: { marginRight: '4px', opacity: '0.4' } }, '\u25CB'); }

  return React.createElement('div', { className: cls }, icon, label);
}

// ── Sub-component: single extraction field ─────────────────────────────────
function LiveField({ label, value, children }) {
  const hasValue = value !== undefined && value !== null && value !== '';
  return (
    <div className={`live-field${hasValue ? ' live-field--populated' : ''}`}>
      <div className="live-field-label">{label}</div>
      <div className="live-field-value">
        {hasValue
          ? children
          : <span className="live-field-empty">&#8212;</span>
        }
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
function LiveExtractionPanel({ partialExtraction, agentStatuses, verificationNotes }) {
  const ext = partialExtraction || {};
  const symptoms = ext.situation?.symptoms || [];

  return (
    <div className="live-extraction-panel">
      {/* Header */}
      <div className="live-panel-header">
        <span className="live-panel-title">Live AI Extraction</span>
        <span className="badge badge-warning" style={{ fontSize: '11px' }}>IN PROGRESS</span>
      </div>

      {/* Agent status row */}
      <div className="agent-status-row">
        <AgentPill label="A1 Extract" status={agentStatuses.extract} />
        <AgentPill label="A2 Verify"  status={agentStatuses.verify} />
        <AgentPill label="A3 CAD"     status={agentStatuses.cad} />
        <AgentPill label="A4 Route"   status={agentStatuses.routing} />
      </div>

      {/* Live extraction fields */}
      <div className="live-fields-section">
        <LiveField label="Incident Type" value={ext.incidentType}>
          <span className="tag">{ext.incidentType}</span>
        </LiveField>

        <LiveField label="Urgency Level" value={ext.urgencyLevel}>
          <span className={`badge badge-${ext.urgencyLevel === 'CRITICAL' ? 'danger' : ext.urgencyLevel === 'HIGH' ? 'warning' : 'info'}`}>
            {ext.urgencyLevel}
          </span>
        </LiveField>

        <LiveField label="Location" value={ext.location?.address}>
          {ext.location?.address}
          {ext.location?.unit && <span style={{ opacity: 0.7 }}>, Unit {ext.location.unit}</span>}
        </LiveField>

        <LiveField label="Chief Complaint" value={ext.situation?.chiefComplaint}>
          {ext.situation?.chiefComplaint}
        </LiveField>

        <LiveField label="Symptoms" value={symptoms.length > 0 ? symptoms : null}>
          <ul className="live-symptom-list">
            {symptoms.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </LiveField>

        <LiveField label="Timeline" value={ext.situation?.timeline}>
          {ext.situation?.timeline}
        </LiveField>

        <LiveField label="Medical History" value={ext.situation?.priorMedicalInfo}>
          {ext.situation?.priorMedicalInfo}
        </LiveField>

        <LiveField label="Caller" value={ext.caller?.relationship}>
          {ext.caller?.relationship}
          {ext.caller?.emotionalState && <span style={{ opacity: 0.7 }}> &mdash; {ext.caller.emotionalState}</span>}
        </LiveField>
      </div>

      {/* Verification notes */}
      <div className="verification-notes">
        <div className="vnotes-title">Agent Notes</div>
        {verificationNotes.length === 0
          ? <div className="vnote-empty">Listening&#8230;</div>
          : verificationNotes.map((n, i) => (
              <div key={i} className={`vnote vnote--${n.type}`}>
                {n.type === 'ok' ? '\u2713' : '\u26A0'} {n.text}
              </div>
            ))
        }
      </div>
    </div>
  );
}
