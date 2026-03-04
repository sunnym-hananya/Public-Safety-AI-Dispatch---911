// Wraps a single extracted context field with a label, optional confidence badge,
// Agent 2 note, and a red border highlight when confidence < 80%.
// Props:
//   label        — display label string
//   fieldKey     — key into verification.fieldScores (e.g. 'incidentType')
//   verification — Agent 2 output object (may be null while Agent 2 is running)
//   children     — the field value to render
// Depends on: ConfidenceBadge (src/components/ConfidenceBadge.jsx)
function ExtractionField({ label, fieldKey, verification, children }) {
  const score      = verification?.fieldScores?.[fieldKey]?.confidence;
  const note       = verification?.fieldScores?.[fieldKey]?.note;
  const needsReview = score !== undefined && score < 80;

  return (
    <div className={`context-field${needsReview ? ' needs-review' : ''}`}>
      <div className="context-field-label">
        {label}
        {score !== undefined && <ConfidenceBadge score={score} />}
      </div>
      <div className="context-field-value">{children}</div>
      {note && <div className="field-note">{note}</div>}
    </div>
  );
}
