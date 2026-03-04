// IncomingCallScreen — displayed when a scenario is selected and callPhase === 'incoming'.
// Shows a pulsing incoming-call notification with caller details and a large ANSWER button.
//
// Props:
//   scenario  — full DEMO_SCENARIO object (label, emoji, urgency, urgencyClass, callerInfo)
//   onAnswer  — () => void  called when operator clicks ANSWER
//   onDismiss — () => void  called when operator dismisses / changes their mind
function IncomingCallScreen({ scenario, onAnswer, onDismiss }) {
  if (!scenario) return null;
  const ci = scenario.callerInfo || {};

  return (
    <div className="incoming-call-screen">
      <div className="incoming-call-card">
        {/* Animated rings */}
        <div className="ring-pulse-wrapper">
          <div className="ring-pulse ring-pulse--1"></div>
          <div className="ring-pulse ring-pulse--2"></div>
          <div className="ring-pulse ring-pulse--3"></div>
          <div className="phone-icon-wrap">&#128222;</div>
        </div>

        <div className="incoming-label">INCOMING 911 CALL</div>

        <div className="caller-phone">{ci.phone || 'Unknown Number'}</div>
        <div className="caller-meta">
          <span>{ci.area || 'Unknown Area'}</span>
          <span className="caller-dot">&middot;</span>
          <span>{ci.callType || 'Wireless'}</span>
        </div>

        <div className="incoming-scenario-badge">
          <span style={{ marginRight: '6px' }}>{scenario.emoji}</span>
          <span>{scenario.label}</span>
          <span className={`badge badge-${scenario.urgencyClass}`} style={{ marginLeft: '8px' }}>{scenario.urgency}</span>
        </div>

        <button className="answer-btn" onClick={onAnswer}>
          &#128222;&nbsp; ANSWER CALL
        </button>

        <button className="dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
