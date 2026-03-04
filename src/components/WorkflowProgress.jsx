// Five-step horizontal progress indicator for the multi-agent workflow.
// Props:
//   step          — current workflow step
//   degradedSteps — array of step IDs that completed in degraded mode (default [])
function WorkflowProgress({ step, degradedSteps = [] }) {
  const steps = [
    { id: 'extracting',  label: 'Agent 1: Extract',    desc: 'Analyzing transcript' },
    { id: 'verifying',   label: 'Agent 2: Verify',     desc: 'Scoring confidence'   },
    { id: 'cad-lookup',  label: 'Agent 3: CAD Lookup', desc: 'Querying databases'   },
    { id: 'routing',     label: 'Agent 4: Routing',    desc: 'Ranking units'        },
    { id: 'complete',    label: 'Complete',             desc: 'Ready for dispatch'   },
  ];

  const stepOrder  = { extracting: 0, verifying: 1, 'cad-lookup': 2, routing: 3, complete: 4, error: 4 };
  const currentIdx = stepOrder[step] ?? -1;

  const getStatus = (idx, stepId) => {
    if (degradedSteps.includes(stepId)) return 'degraded';
    if (currentIdx > idx)               return 'complete';
    if (currentIdx === idx)             return 'active';
    return 'pending';
  };

  return (
    <div className="workflow-progress">
      {steps.map((s, i) => {
        const status = getStatus(i, s.id);
        const isPassed = status === 'complete' || status === 'degraded';
        return (
          <React.Fragment key={s.id}>
            <div className={`workflow-step workflow-step-${status}`}>
              <div className="workflow-step-icon">
                {status === 'complete'
                  ? '✓'
                  : status === 'degraded'
                    ? '⚠'
                    : status === 'active'
                      ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', display: 'inline-block' }}></span>
                      : '○'}
              </div>
              <div className="workflow-step-text">
                <div className="workflow-step-label">{s.label}</div>
                <div className="workflow-step-desc">
                  {status === 'degraded' ? 'Degraded — bypassed' : s.desc}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`workflow-connector workflow-connector-${isPassed ? 'complete' : 'pending'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
