// Displays a colour-coded confidence percentage pill.
// Score thresholds: ≥90 green, ≥70 amber, <70 red.
// Depends on: getConfidenceStyle() (src/utils.js)
function ConfidenceBadge({ score }) {
  const s = getConfidenceStyle(score);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '700',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      marginLeft: '8px',
      fontFamily: "'JetBrains Mono', monospace",
      verticalAlign: 'middle',
    }}>
      {score}%
    </span>
  );
}
