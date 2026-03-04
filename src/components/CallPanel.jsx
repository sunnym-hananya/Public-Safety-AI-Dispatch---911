// CallPanel — streaming chat-style view of the live 911 call.
// Messages appear one at a time with a typing indicator before each.
//
// Props:
//   lines       — Array<{ speaker: 'operator'|'caller', text: string }>
//   typingFor   — 'operator' | 'caller' | null  (shows "..." before next message)
//   callSeconds — number  (integer seconds since call was answered)
//   callPhase   — 'in_call' | 'complete'
function CallPanel({ lines, typingFor, callSeconds, callPhase }) {
  const { useRef, useEffect } = React;

  const messagesRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [lines, typingFor]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="call-panel">
      {/* Header bar */}
      <div className="call-header">
        {callPhase === 'complete' ? (
          <span className="call-timer call-timer--ended">&#10003; CALL ENDED</span>
        ) : (
          <span className="call-timer">&#128308; LIVE CALL &mdash; {formatTime(callSeconds)}</span>
        )}
        <span className="call-header-label">
          {callPhase === 'complete' ? 'Context Captured' : 'Active Call In Progress'}
        </span>
      </div>

      {/* Message stream */}
      <div className="call-messages" ref={messagesRef}>
        {lines.map((line, i) => (
          <div key={i} className={`call-bubble-wrapper call-bubble-wrapper--${line.speaker}`}>
            <span className="call-speaker-label">
              {line.speaker === 'operator' ? 'OPERATOR' : 'CALLER'}
            </span>
            <div className={`call-bubble call-bubble--${line.speaker}`}>
              {line.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingFor && (
          <div className={`call-bubble-wrapper call-bubble-wrapper--${typingFor}`}>
            <span className="call-speaker-label">
              {typingFor === 'operator' ? 'OPERATOR' : 'CALLER'}
            </span>
            <div className={`call-bubble call-bubble--${typingFor} call-bubble--typing`}>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
