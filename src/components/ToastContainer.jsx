// Toast notification system.
// Renders a stack of auto-dismissing banners in the top-right corner.
//
// Props:
//   toasts      — array of { id, type ('success'|'warning'|'error'|'info'), message }
//   removeToast — fn(id) called on auto-dismiss or manual close
//
// State is owned by the parent (App). Each Toast auto-dismisses after 5 seconds
// using a per-item useEffect with cleanup to avoid stale timer issues.

const TOAST_META = {
  success: { border: 'rgba(0,212,170,0.4)',   bg: 'rgba(0,212,170,0.12)',   color: 'var(--success)',          icon: '✓' },
  warning: { border: 'rgba(255,184,77,0.4)',  bg: 'rgba(255,184,77,0.12)',  color: 'var(--warning)',          icon: '⚠' },
  error:   { border: 'rgba(255,77,77,0.4)',   bg: 'rgba(255,77,77,0.12)',   color: 'var(--danger)',           icon: '✗' },
  info:    { border: 'rgba(0,136,255,0.4)',   bg: 'rgba(0,136,255,0.12)',   color: 'var(--accent-secondary)', icon: 'ℹ' },
};

function Toast({ toast, onDismiss }) {
  const { useEffect } = React;
  const meta = TOAST_META[toast.type] || TOAST_META.info;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id]);

  return (
    <div className="toast" style={{ borderColor: meta.border, background: meta.bg }}>
      <span style={{ color: meta.color, fontWeight: '700', flexShrink: 0, fontSize: '15px' }}>
        {meta.icon}
      </span>
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
        {toast.message}
      </span>
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}
