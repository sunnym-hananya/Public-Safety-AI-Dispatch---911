// Root application component.
// Owns all workflow state, orchestrates the four-agent pipeline, and composes the layout.
// All child components and constants are loaded as globals via index.html script tags.
//
// IMPORTANT: This destructuring must include every React hook used by any child component,
// because Babel standalone runs each file in global scope and child components are called
// AFTER this file executes — so these become globally available to them.
const { useState, useRef, useEffect } = React;

function App() {
  // ── Workflow state ─────────────────────────────────────────────────────────
  const [apiKey,           setApiKey]           = useState('');
  const [step,             setStep]             = useState('idle');
  const [extraction,       setExtraction]       = useState(null);
  const [verification,     setVerification]     = useState(null);
  const [cadData,          setCadData]          = useState(null);
  const [routing,          setRouting]          = useState(null);
  const [dispatchApproved, setDispatchApproved] = useState(false);
  const [errorMsg,         setErrorMsg]         = useState('');
  const [elapsed,          setElapsed]          = useState(0);

  // ── Observability & error-handling state ──────────────────────────────────
  const [logs,          setLogs]          = useState([]);
  const [toasts,        setToasts]        = useState([]);
  const [degradedSteps, setDegradedSteps] = useState([]);
  const [testMode,      setTestMode]      = useState(null); // null | 'agent1-fail' | 'cad-timeout' | 'low-confidence'
  const [showDevTools,  setShowDevTools]  = useState(false);

  // ── Demo Mode & History ────────────────────────────────────────────────────
  const [demoMode, setDemoMode] = useState(false);
  const [history,  setHistory]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('psap_history') || '[]'); } catch { return []; }
  });

  // ── Demo Polish: scenarios, speed, presentation mode ──────────────────────
  const [selectedScenario,  setSelectedScenario]  = useState(null); // scenario id
  const [autoPlay,          setAutoPlay]          = useState(false);
  const [speed,             setSpeed]             = useState(1);    // 0.5 | 1 | 2
  const [presentationMode,  setPresentationMode]  = useState(false);

  // ── Live call simulation ───────────────────────────────────────────────────
  const [callPhase,         setCallPhase]         = useState('idle'); // idle|incoming|in_call|complete
  const [callSeconds,       setCallSeconds]       = useState(0);
  const [displayedLines,    setDisplayedLines]    = useState([]);
  const [typingFor,         setTypingFor]         = useState(null);  // 'operator'|'caller'|null
  const [partialExtraction, setPartialExtraction] = useState({});
  const [agentStatuses,     setAgentStatuses]     = useState({ extract: 'idle', verify: 'idle', cad: 'idle', routing: 'idle' });
  const [verificationNotes, setVerificationNotes] = useState([]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const logCounterRef = useRef(0);  // monotonic ID source for logs + toasts
  // Refs for keyboard handler — avoids stale closure over frequently-changing state
  const isRunningRef        = useRef(false);
  const stepRef             = useRef('idle');
  const selectedScenarioRef = useRef(null);
  // Refs for answerCall() async callbacks — avoid stale closures
  const callTimerRef    = useRef(null);
  const callTimeoutRefs = useRef([]);
  const partialExtRef   = useRef({});
  const cadDataRef      = useRef(null);

  // ── Log helpers ───────────────────────────────────────────────────────────
  // startLog: adds a running entry, returns its id for endLog to update later.
  const startLog = (entry) => {
    const id = ++logCounterRef.current;
    setLogs(prev => [...prev, { ...entry, id, startedAt: Date.now(), duration: null }]);
    return id;
  };

  // endLog: finalises a log entry (calculates duration automatically).
  const endLog = (id, updates) => {
    setLogs(prev => prev.map(e =>
      e.id === id ? { ...e, ...updates, duration: Date.now() - e.startedAt } : e
    ));
  };

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast    = (type, message) => {
    const id = ++logCounterRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Multi-agent workflow ──────────────────────────────────────────────────
  // ── History helpers ────────────────────────────────────────────────────────
  const loadFromHistory = (run) => {
    setExtraction(run.extraction);
    setVerification(run.verification);
    setCadData(run.cadData);
    setRouting(run.routing);
    setElapsed(run.elapsed);
    setDegradedSteps(run.degradedSteps || []);
    setLogs(run.logs || []);
    setStep('complete');
    setDispatchApproved(false);
    setToasts([]);
    addToast('info', `Restored: ${run.incidentType} from ${new Date(run.id).toLocaleTimeString()}`);
  };

  // ── Export helpers ────────────────────────────────────────────────────────
  const copyContextToClipboard = () => {
    if (!extraction) return;
    const lines = [
      `PSAP Context Transfer — ${new Date().toLocaleString()}`,
      ``,
      `INCIDENT TYPE: ${extraction.incidentType}`,
      `URGENCY: ${extraction.urgencyLevel}`,
      `LOCATION: ${extraction.location?.address}`,
      `CHIEF COMPLAINT: ${extraction.situation?.chiefComplaint}`,
      `SYMPTOMS: ${extraction.situation?.symptoms?.join(', ')}`,
      `HAZARDS: ${extraction.hazards?.join(', ') || 'None'}`,
      `CALLER: ${extraction.caller?.relationship} — ${extraction.caller?.emotionalState}`,
      `PRIORITY NOTES: ${extraction.priorityNotes}`,
      ``,
      `AI CONFIDENCE: ${verification?.overallConfidence ?? 'N/A'}%`,
      `FIELDS FLAGGED: ${verification?.flaggedFields?.length ?? 0}`,
    ];
    if (routing?.primary) {
      lines.push(`RECOMMENDED UNIT: ${routing.primary.unitId} (${routing.primary.type})`);
    }
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => addToast('success', 'Context copied to clipboard'))
      .catch(() => addToast('error', 'Clipboard copy failed'));
  };

  const printDispatchSummary = () => {
    if (!extraction) return;
    const win = window.open('', '_blank');
    if (!win) { addToast('error', 'Pop-up blocked — allow pop-ups and retry'); return; }
    const flagCount = verification?.flaggedFields?.length ?? 0;
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Summary</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; max-width: 800px; margin: 0 auto; color: #111; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; color: #555; }
  .field { display: flex; gap: 12px; margin-bottom: 6px; font-size: 14px; }
  .label { font-weight: bold; min-width: 160px; color: #333; }
  .warn { background: #fff3cd; padding: 10px 14px; border-left: 4px solid #f0a500; margin: 16px 0; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head><body>
<h1>PSAP Dispatch Summary — ${new Date().toLocaleString()}</h1>
<div class="field"><span class="label">Incident Type</span><span>${extraction.incidentType}</span></div>
<div class="field"><span class="label">Urgency Level</span><span><strong>${extraction.urgencyLevel}</strong></span></div>
<div class="field"><span class="label">Location</span><span>${extraction.location?.address}</span></div>
<div class="field"><span class="label">Chief Complaint</span><span>${extraction.situation?.chiefComplaint}</span></div>
<div class="field"><span class="label">Symptoms</span><span>${extraction.situation?.symptoms?.join(', ')}</span></div>
<div class="field"><span class="label">Hazards</span><span>${extraction.hazards?.join(', ') || 'None identified'}</span></div>
<div class="field"><span class="label">Caller</span><span>${extraction.caller?.relationship} — ${extraction.caller?.emotionalState}</span></div>
<div class="field"><span class="label">Priority Notes</span><span>${extraction.priorityNotes}</span></div>
${routing?.primary ? `<div class="field"><span class="label">Recommended Unit</span><span>${routing.primary.unitId} (${routing.primary.type}) — ETA ${routing.primary.eta} min</span></div>` : ''}
<h2>AI Verification</h2>
<div class="field"><span class="label">Overall Confidence</span><span>${verification?.overallConfidence ?? 'N/A'}%</span></div>
<div class="field"><span class="label">Fields Flagged</span><span>${flagCount}</span></div>
${flagCount > 0 ? `<div class="warn"><strong>Human Review Required:</strong> ${verification.flaggedFields.join(', ')}</div>` : ''}
<div class="warn"><strong>Critical Human Decision Point:</strong> AI provides decision support only — dispatcher retains full authority over resource allocation.</div>
<div class="footer">Generated by PSAP Context Transfer AI — ${new Date().toISOString()}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ── Presentation mode — toggle body class ─────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('presentation-mode', presentationMode);
    return () => document.body.classList.remove('presentation-mode');
  }, [presentationMode]);

  // ── Reset helper ──────────────────────────────────────────────────────────
  const resetWorkflow = () => {
    setStep('idle');
    setExtraction(null); setVerification(null); setCadData(null); setRouting(null);
    setDispatchApproved(false); setErrorMsg(''); setLogs([]); setDegradedSteps([]);
    clearInterval(timerRef.current);
    // Clear live call state
    clearInterval(callTimerRef.current);
    callTimeoutRefs.current.forEach(clearTimeout);
    callTimeoutRefs.current = [];
    setCallPhase('idle');
    setCallSeconds(0);
    setDisplayedLines([]);
    setTypingFor(null);
    setPartialExtraction({});
    partialExtRef.current = {};
    setAgentStatuses({ extract: 'idle', verify: 'idle', cad: 'idle', routing: 'idle' });
    setVerificationNotes([]);
    cadDataRef.current = null;
  };

  // ── Scenario selection ────────────────────────────────────────────────────
  const selectScenario = (id) => {
    const newId = id === selectedScenarioRef.current ? null : id; // toggle off if same
    setSelectedScenario(newId);
    selectedScenarioRef.current = newId;
    resetWorkflow();
    if (newId) setCallPhase('incoming');
  };

  // ── Live call simulation ──────────────────────────────────────────────────
  const answerCall = () => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === selectedScenarioRef.current);
    if (!scenario || !scenario.lines) return;

    const effectiveKey = demoMode ? 'demo' : apiKey;
    const TYPING_DURATION     = 1500; // ms to show "..." before message appears
    const CHECKPOINT_DELAY    = 300;  // ms after line appears before checkpoint fires
    const AGENT_WORKING_MS    = 1600; // ms agents show 'working' state

    // Reset prior call data
    setStep('idle');
    setExtraction(null); setVerification(null); setCadData(null); setRouting(null);
    setDispatchApproved(false); setLogs([]); setDegradedSteps([]);
    setDisplayedLines([]);
    setTypingFor(null);
    setPartialExtraction({});
    partialExtRef.current = {};
    setAgentStatuses({ extract: 'idle', verify: 'idle', cad: 'idle', routing: 'idle' });
    setVerificationNotes([]);
    cadDataRef.current = null;
    callTimeoutRefs.current.forEach(clearTimeout);
    callTimeoutRefs.current = [];

    setCallPhase('in_call');

    // Call timer
    setCallSeconds(0);
    clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);

    // Build the full schedule up-front (absolute ms from t=0)
    let cursor = 0;
    scenario.lines.forEach((line, idx) => {
      const typingStart = cursor + line.delay;
      const lineAppear  = typingStart + TYPING_DURATION;
      cursor = lineAppear;

      const t1 = setTimeout(() => setTypingFor(line.speaker), typingStart / speed);
      const t2 = setTimeout(() => {
        setTypingFor(null);
        setDisplayedLines(prev => [...prev, { speaker: line.speaker, text: line.text }]);
      }, lineAppear / speed);
      callTimeoutRefs.current.push(t1, t2);

      // Check if any checkpoint fires after this line
      (scenario.checkpoints || []).forEach(cp => {
        if (cp.afterLine !== idx) return;
        const cpAt = (lineAppear + CHECKPOINT_DELAY) / speed;

        const t3 = setTimeout(() => {
          setAgentStatuses(prev => ({ ...prev, extract: 'working', verify: 'working' }));

          const t4 = setTimeout(() => {
            // Merge checkpoint fields into partialExtraction
            const merged = deepMerge(partialExtRef.current, cp.fields || {});
            partialExtRef.current = merged;
            setPartialExtraction({ ...merged });

            if (cp.agentNote) {
              setVerificationNotes(prev => [...prev, cp.agentNote]);
            }
            setAgentStatuses(prev => ({ ...prev, extract: 'done', verify: 'done' }));

            // CAD lookup
            if (cp.triggerCad) {
              setAgentStatuses(prev => ({ ...prev, cad: 'working' }));
              fetch('http://localhost:3000/cad-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: effectiveKey, extraction: partialExtRef.current }),
              })
                .then(r => r.json())
                .then(cad => {
                  cadDataRef.current = cad;
                  setCadData(cad);
                  setAgentStatuses(prev => ({ ...prev, cad: 'done' }));
                })
                .catch(() => setAgentStatuses(prev => ({ ...prev, cad: 'error' })));
            }

            // Routing (polls until cadData available, then fires)
            if (cp.triggerRouting) {
              setAgentStatuses(prev => ({ ...prev, routing: 'working' }));
              const waitForCad = () => new Promise(resolve => {
                if (cadDataRef.current) { resolve(cadDataRef.current); return; }
                const poll = setInterval(() => {
                  if (cadDataRef.current) { clearInterval(poll); resolve(cadDataRef.current); }
                }, 100);
                callTimeoutRefs.current.push(poll);
              });
              waitForCad().then(cad =>
                fetch('http://localhost:3000/routing', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ apiKey: effectiveKey, extraction: partialExtRef.current, verification: scenario.verification, cadData: cad }),
                })
              )
                .then(r => r.json())
                .then(routeData => {
                  setRouting(routeData);
                  setAgentStatuses(prev => ({ ...prev, routing: 'done' }));
                  // Transition to complete
                  const tComplete = setTimeout(() => {
                    clearInterval(callTimerRef.current);
                    setExtraction(scenario.extraction);
                    setVerification(scenario.verification);
                    setStep('complete');
                    setCallPhase('complete');
                    // Save to history
                    setHistory(prev => {
                      const snap = {
                        id: Date.now(), timestamp: new Date().toISOString(),
                        elapsed: 0, degradedSteps: [],
                        incidentType: scenario.extraction?.incidentType,
                        urgencyLevel: scenario.extraction?.urgencyLevel,
                        location: scenario.extraction?.location?.address,
                        confidence: scenario.verification?.overallConfidence,
                        priority: routeData?.totalPriority,
                        primaryUnit: routeData?.primary?.unitId,
                        logs: [], extraction: scenario.extraction,
                        verification: scenario.verification,
                        cadData: cadDataRef.current, routing: routeData,
                      };
                      const next = [snap, ...prev].slice(0, 5);
                      try { localStorage.setItem('psap_history', JSON.stringify(next)); } catch {}
                      return next;
                    });
                  }, 800);
                  callTimeoutRefs.current.push(tComplete);
                })
                .catch(() => {
                  setAgentStatuses(prev => ({ ...prev, routing: 'error' }));
                  // Still complete the call phase
                  setExtraction(scenario.extraction);
                  setVerification(scenario.verification);
                  setStep('complete');
                  setCallPhase('complete');
                });
            }
          }, AGENT_WORKING_MS);
          callTimeoutRefs.current.push(t4);
        }, cpAt);
        callTimeoutRefs.current.push(t3);
      });
    });
  };

  // ── Legacy batch workflow (kept for history-load re-runs) ─────────────────
  const runWorkflow = async (overrideScenarioId = null) => {
    if (!demoMode && !apiKey) { alert('Please enter your Anthropic API key (or enable Demo Mode)'); return; }

    const effectiveScenarioId = overrideScenarioId ?? selectedScenarioRef.current;
    const scenario = effectiveScenarioId ? DEMO_SCENARIOS.find(s => s.id === effectiveScenarioId) : null;

    const effectiveKey = demoMode ? 'demo' : apiKey;
    const delay = ms => new Promise(r => setTimeout(r, ms / speed));

    // Local accumulators — avoid stale-closure issues when building the snapshot.
    const localDegradedArr = [];
    const finalLogs        = [];

    // Reset all state before starting.
    setStep('extracting');
    setExtraction(null);
    setVerification(null);
    setCadData(null);
    setRouting(null);
    setDispatchApproved(false);
    setErrorMsg('');
    setElapsed(0);
    setLogs([]);
    setToasts([]);
    setDegradedSteps([]);

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 100);

    try {
      // ── Agent 1: Extract (CRITICAL — retry once, 15s timeout) ─────────────
      // If Agent 1 fails after retry, the entire workflow aborts.
      const a1LogId = startLog({
        agent: 'Agent 1: Extract', status: 'running',
        message: 'Analyzing transcript with Claude...', error: null,
      });

      let ext;
      try {
        if (demoMode) {
          await delay(900);
          ext = scenario?.extraction || MOCK_EXTRACTION_RESULT;
        } else {
          ext = await withTimeout(
            retryWithBackoff(async () => {
              if (testMode === 'agent1-fail') throw new Error('Simulated failure (test mode)');
              const r = await fetch('http://localhost:3000/extract', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ apiKey: effectiveKey, transcript: MOCK_CALL.transcript }),
              });
              const d = await r.json();
              if (d.error) throw new Error(d.error.message || d.error);
              return parseJSON(d.content[0].text);
            }, 1, 1000),
            15000, 'Agent 1'
          );
        }
      } catch (err) {
        endLog(a1LogId, { status: 'error', message: 'Extraction failed after retry', error: err.message });
        addToast('error', `Agent 1 failed: ${err.message}`);
        throw err; // Critical — abort the workflow
      }

      endLog(a1LogId, { status: 'success', message: 'Context extracted successfully' });
      addToast('success', 'Agent 1: Context extracted from transcript');
      setExtraction(ext);

      // ── Agent 2: Verify (DEGRADABLE — 10s timeout) ────────────────────────
      // On failure, continues with DEGRADED_VERIFICATION (all fields flagged).
      setStep('verifying');
      const a2LogId = startLog({
        agent: 'Agent 2: Verify', status: 'running',
        message: 'Scoring confidence of extracted fields...', error: null,
      });

      let ver;
      try {
        if (demoMode) {
          await delay(700);
          ver = scenario?.verification || MOCK_HIGH_CONFIDENCE_VERIFICATION;
        } else if (testMode === 'low-confidence') {
          // Dev Tools: inject pre-baked low-confidence verification (no API call).
          ver = MOCK_LOW_CONFIDENCE_VERIFICATION;
        } else {
          ver = await withTimeout(
            (async () => {
              const r = await fetch('http://localhost:3000/verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ apiKey: effectiveKey, transcript: MOCK_CALL.transcript, extraction: ext }),
              });
              const d = await r.json();
              if (d.error) throw new Error(d.error.message || d.error);
              return parseJSON(d.content[0].text);
            })(),
            10000, 'Agent 2'
          );
        }
        endLog(a2LogId, {
          status: 'success',
          message: `Verification complete — ${ver.overallConfidence}% overall confidence`,
        });
        addToast(
          ver.overallConfidence >= 70 ? 'success' : 'warning',
          `Agent 2: ${ver.overallConfidence}% overall confidence`
        );
      } catch (err) {
        endLog(a2LogId, {
          status: 'degraded',
          message: 'Verification failed — continuing with unverified extraction',
          error: err.message,
        });
        addToast('warning', 'Agent 2 unavailable — workflow continues without verification');
        ver = DEGRADED_VERIFICATION;
        localDegradedArr.push('verifying');
        setDegradedSteps(prev => [...prev, 'verifying']);
      }
      setVerification(ver);

      // ── Agent 3: CAD Lookup (DEGRADABLE — 5s timeout) ─────────────────────
      // On failure, continues with DEGRADED_CAD (no units, address unverified).
      setStep('cad-lookup');
      const a3LogId = startLog({
        agent: 'Agent 3: CAD Lookup', status: 'running',
        message: 'Querying address GIS and unit databases...', error: null,
      });

      let cad;
      try {
        cad = await withTimeout(
          (async () => {
            if (testMode === 'cad-timeout') {
              // Dev Tools: hold longer than the 5s timeout to trigger it.
              await delay(7000);
            }
            const r = await fetch('http://localhost:3000/cad-lookup', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ apiKey: effectiveKey, extraction: ext }),
            });
            const d = await r.json();
            if (d.error) throw new Error(d.error);
            return d;
          })(),
          5000, 'Agent 3'
        );
        endLog(a3LogId, {
          status: 'success',
          message: `CAD lookup complete — address ${cad.addressValid ? 'verified' : 'not found in GIS'}`,
        });
        addToast(
          cad.addressValid ? 'success' : 'warning',
          `Agent 3: Address ${cad.addressValid ? 'verified in GIS' : 'not in GIS database'}`
        );
      } catch (err) {
        endLog(a3LogId, {
          status: 'degraded',
          message: 'CAD lookup failed — no database data available',
          error: err.message,
        });
        addToast('warning', 'Agent 3 timed out — continuing without CAD data');
        cad = DEGRADED_CAD;
        localDegradedArr.push('cad-lookup');
        setDegradedSteps(prev => [...prev, 'cad-lookup']);
      }
      setCadData(cad);

      // ── Agent 4: Routing (DEGRADABLE — deterministic, no timeout needed) ──
      setStep('routing');
      const a4LogId = startLog({
        agent: 'Agent 4: Routing', status: 'running',
        message: 'Scoring and ranking available units...', error: null,
      });

      let route = null;
      try {
        const r = await fetch('http://localhost:3000/routing', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ apiKey: effectiveKey, extraction: ext, verification: ver, cadData: cad }),
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        route = d;
        endLog(a4LogId, {
          status: 'success',
          message: `Routing complete — priority ${d.totalPriority}${d.primary ? `, primary: ${d.primary.unitId}` : ', no unit available'}`,
        });
        addToast('success', `Agent 4: ${d.primary ? `${d.primary.unitId} recommended` : 'No units available'}`);
      } catch (err) {
        endLog(a4LogId, {
          status: 'degraded',
          message: 'Routing engine failed — manual dispatch required',
          error: err.message,
        });
        addToast('warning', 'Agent 4 unavailable — manual dispatch required');
        localDegradedArr.push('routing');
        setDegradedSteps(prev => [...prev, 'routing']);
      }
      setRouting(route);

      setStep('complete');

      // ── Save run snapshot to localStorage (max 5 runs) ──
      const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
      // Capture log entries from state — endLog runs synchronously in reducer so
      // we re-read via functional update trick; instead use the local log array.
      setLogs(currentLogs => {
        const snap = {
          id:            Date.now(),
          timestamp:     new Date().toISOString(),
          elapsed:       finalElapsed,
          degradedSteps: localDegradedArr,
          incidentType:  ext?.incidentType,
          urgencyLevel:  ext?.urgencyLevel,
          location:      ext?.location?.address,
          confidence:    ver?.overallConfidence,
          priority:      route?.totalPriority,
          primaryUnit:   route?.primary?.unitId,
          logs:          currentLogs,
          extraction:    ext,
          verification:  ver,
          cadData:       cad,
          routing:       route,
        };
        setHistory(prev => {
          const next = [snap, ...prev].slice(0, 5);
          try { localStorage.setItem('psap_history', JSON.stringify(next)); } catch {}
          return next;
        });
        return currentLogs; // no change to logs
      });

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      clearInterval(timerRef.current);
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const isRunning = callPhase === 'in_call' || ['extracting', 'verifying', 'cad-lookup', 'routing'].includes(step);
  // Keep refs in sync so keyboard handler always sees latest values without stale closure
  isRunningRef.current = isRunning;
  stepRef.current = step;
  // Convenience alias for active scenario object
  const activeScenario = DEMO_SCENARIOS.find(s => s.id === selectedScenario) || null;

  // System health: drives the header indicator badge.
  const systemHealth =
    isRunning                                    ? 'live'
    : step === 'error'                           ? 'fault'
    : step === 'complete' && degradedSteps.length > 0 ? 'degraded'
    : step === 'complete'                        ? 'nominal'
    : null;

  const HEALTH_LABELS = {
    live:     '● LIVE',
    nominal:  '✓ SYSTEM NOMINAL',
    degraded: '⚠ DEGRADED MODE',
    fault:    '✗ SYSTEM FAULT',
  };

  const statusBadge = {
    idle:         { cls: 'badge-info',    label: 'READY'    },
    extracting:   { cls: 'badge-warning', label: 'AGENT 1'  },
    verifying:    { cls: 'badge-warning', label: 'AGENT 2'  },
    'cad-lookup': { cls: 'badge-warning', label: 'AGENT 3'  },
    routing:      { cls: 'badge-warning', label: 'AGENT 4'  },
    complete:     { cls: 'badge-success', label: 'VERIFIED' },
    error:        { cls: 'badge-danger',  label: 'ERROR'    },
  }[step];

  // Step gating helpers
  const afterExtraction = ['verifying', 'cad-lookup', 'routing', 'complete'].includes(step);
  const afterVerify     = ['cad-lookup', 'routing', 'complete'].includes(step);
  const mapVisible      = ['verifying', 'cad-lookup', 'routing', 'complete'].includes(step);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); if (!isRunningRef.current) answerCall(); }
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) resetWorkflow();
      if ((e.key === 'e' || e.key === 'E') && stepRef.current === 'complete') copyContextToClipboard();
      if (e.key === '1') selectScenario('cardiac');
      if (e.key === '2') selectScenario('multivehicle');
      if (e.key === '3') selectScenario('welfare');
      if (e.key === '4') selectScenario('gasleak');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // empty deps — uses refs to avoid stale closure

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="container">

        {/* Header */}
        <div className="header">
          <h1>PSAP Context Transfer AI</h1>
          <p className="subtitle">Multi-agent workflow: Extract → Verify → CAD → Route → Dispatch</p>
          {systemHealth && (
            <div className={`system-health system-health--${systemHealth}`}>
              {HEALTH_LABELS[systemHealth]}
            </div>
          )}
        </div>

        {/* API key config */}
        <div className="api-config">
          <div className="input-group">
            <label>Anthropic API Key (required for demo)</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        {/* Scenario selector bar */}
        <div className="scenario-bar">
          <div className="scenario-bar-left">
            <div className="scenario-bar-label">DEMO SCENARIOS <span style={{ opacity: 0.45, fontWeight: '400' }}>&#8212; press 1&#8211;4</span></div>
            <div className="scenario-cards">
              {DEMO_SCENARIOS.map((s, i) => (
                <div
                  key={s.id}
                  className={`scenario-card scenario-card--${s.urgencyClass}${selectedScenario === s.id ? ' scenario-card--active' : ''}`}
                  onClick={() => selectScenario(s.id)}
                  title={s.description}
                >
                  <div className="scenario-card-num">{i + 1}</div>
                  <div className="scenario-card-body">
                    <div className="scenario-card-label">{s.emoji} {s.label}</div>
                    <div className="scenario-card-desc">{s.description}</div>
                  </div>
                  <div className={`scenario-card-urgency badge badge-${s.urgencyClass}`}>{s.urgency}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="scenario-bar-controls">
            <button
              className={`scenario-ctrl-btn${autoPlay ? ' scenario-ctrl-btn--active' : ''}`}
              onClick={() => setAutoPlay(a => !a)}
              title="Auto-run workflow when scenario is selected"
            >&#9654; Auto</button>
            <div className="speed-controls">
              {[0.5, 1, 2].map(s => (
                <button
                  key={s}
                  className={`speed-btn${speed === s ? ' speed-btn--active' : ''}`}
                  onClick={() => setSpeed(s)}
                >{s}&times;</button>
              ))}
            </div>
            <button
              className="scenario-ctrl-btn"
              onClick={resetWorkflow}
              disabled={isRunning}
              title="Reset workflow (R)"
            >&#8635; Reset</button>
            <button
              className={`scenario-ctrl-btn${presentationMode ? ' scenario-ctrl-btn--active' : ''}`}
              onClick={() => setPresentationMode(p => !p)}
              title="Presentation mode — hides API key and dev tools"
            >{presentationMode ? '\u25C9 Presenting' : '\u25CE Present'}</button>
          </div>
        </div>

        {/* ── Phase: idle ── */}
        {callPhase === 'idle' && (
          <div className="call-idle-hint">
            &#8592; Select a scenario above to begin the live call simulation
          </div>
        )}

        {/* ── Phase: incoming call ── */}
        {callPhase === 'incoming' && (
          <IncomingCallScreen
            scenario={activeScenario}
            onAnswer={answerCall}
            onDismiss={resetWorkflow}
          />
        )}

        {/* ── Phase: in_call + complete — two-column live call layout ── */}
        {(callPhase === 'in_call' || callPhase === 'complete') && (
          <div className="live-call-wrapper">

            {/* Left 40%: streaming chat */}
            <CallPanel
              lines={displayedLines}
              typingFor={callPhase === 'in_call' ? typingFor : null}
              callSeconds={callSeconds}
              callPhase={callPhase}
            />

            {/* Right 60%: live extraction during call, full results after complete */}
            {callPhase === 'in_call' ? (
              <LiveExtractionPanel
                partialExtraction={partialExtraction}
                agentStatuses={agentStatuses}
                verificationNotes={verificationNotes}
              />
            ) : (
              <div className="card">
                <div className="card-title">
                  <span>AI Context Extraction</span>
                  <span className="badge badge-success">VERIFIED</span>
                  {demoMode && <span className="demo-mode-badge">DEMO</span>}
                </div>
                {extraction && (
                  <div className="context-packet" style={{ borderColor: 'var(--success)', marginTop: '16px' }}>
                    <ExtractionField label="Incident Type" fieldKey="incidentType" verification={verification}>
                      <span className="tag">{extraction.incidentType}</span>
                    </ExtractionField>
                    <ExtractionField label="Urgency Level" fieldKey="urgencyLevel" verification={verification}>
                      <span className={extraction.urgencyLevel === 'CRITICAL' ? 'urgency-high' : 'urgency-medium'}>
                        {extraction.urgencyLevel}
                      </span>
                    </ExtractionField>
                    <ExtractionField label="Location" fieldKey="location" verification={verification}>
                      {extraction.location.address}
                      {extraction.location.unit && `, ${extraction.location.unit}`}
                    </ExtractionField>
                    <ExtractionField label="Chief Complaint" fieldKey="chiefComplaint" verification={verification}>
                      {extraction.situation.chiefComplaint}
                    </ExtractionField>
                    <ExtractionField label="Symptoms / Indicators" fieldKey="symptoms" verification={verification}>
                      {extraction.situation.symptoms.map((s, i) => (
                        <span key={i} className="tag">{s}</span>
                      ))}
                    </ExtractionField>
                    <ExtractionField label="Timeline" fieldKey="timeline" verification={verification}>
                      {extraction.situation.timeline}
                    </ExtractionField>
                    <ExtractionField label="Caller" fieldKey="caller" verification={verification}>
                      {extraction.caller.relationship} &mdash; {extraction.caller.emotionalState}
                    </ExtractionField>
                    <ExtractionField label="Hazards" fieldKey="hazards" verification={verification}>
                      {extraction.hazards.length > 0
                        ? extraction.hazards.map((h, i) => (
                          <span key={i} className="tag" style={{ background: 'rgba(255,77,77,0.15)', color: 'var(--danger)', borderColor: 'rgba(255,77,77,0.3)' }}>{h}</span>
                        ))
                        : <span style={{ color: 'var(--text-muted)' }}>None identified</span>
                      }
                    </ExtractionField>
                    <ExtractionField label="Recommended Response" fieldKey="recommendedService" verification={verification}>
                      {extraction.estimatedResponseNeeded}
                    </ExtractionField>
                    <ExtractionField label="Priority Notes" fieldKey="priorityNotes" verification={verification}>
                      <span style={{ color: 'var(--warning)', fontWeight: '600' }}>{extraction.priorityNotes}</span>
                    </ExtractionField>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Results (shown after call complete) ── */}
        {callPhase === 'complete' && (
          <>
            {/* Call complete banner */}
            <div className="call-complete-banner">
              &#10003;&nbsp; Call Ended &mdash; AI Context Packet Ready for Transfer
            </div>

            {/* Agent 2 verification report */}
            {verification && (
              <VerificationReport verification={verification} elapsed={callSeconds} />
            )}

            {/* Incident map */}
            {extraction && (
              <MapSection extraction={extraction} cadData={cadData} routing={routing} fallbackCoords={activeScenario?.mapCoords} />
            )}

            {/* Agent 3 CAD integration */}
            <CadSection step="complete" cadData={cadData} />

            {/* Agent 4 dispatch recommendations */}
            {routing ? (
              <DispatchRecommendations
                routing={routing}
                approved={dispatchApproved}
                onApprove={() => setDispatchApproved(true)}
              />
            ) : (
              <div className="comparison-section" style={{ marginTop: '20px' }}>
                <h2 className="comparison-title">Agent 4 — Dispatch Recommendations</h2>
                <div className="cad-alert cad-alert-danger">
                  <span className="cad-alert-icon">&#9888;</span>
                  Routing unavailable — dispatcher must manually assign resources.
                </div>
              </div>
            )}

            {/* Export action bar */}
            {extraction && (
              <div className="export-bar">
                <button className="export-btn" onClick={copyContextToClipboard}>&#8856; Copy Context</button>
                <button className="export-btn" onClick={printDispatchSummary}>&#8862; Print Summary</button>
              </div>
            )}

            {/* Performance metrics dashboard */}
            <MetricsDashboard
              logs={logs}
              elapsed={callSeconds}
              verification={verification}
              routing={routing}
              cadData={cadData}
              manualSteps={activeScenario?.manualSteps || MANUAL_PROCESS_STEPS}
            />

            {/* Impact summary */}
            <ImpactStats />
          </>
        )}

        {/* Workflow history — collapsible, restored from localStorage */}
        <WorkflowHistory
          history={history}
          onLoad={loadFromHistory}
          onClear={() => {
            setHistory([]);
            try { localStorage.removeItem('psap_history'); } catch {}
            addToast('info', 'History cleared');
          }}
        />

        {/* ── Dev Tools ── */}
        <div className="dev-tools-section">
          <button className="dev-tools-toggle" onClick={() => setShowDevTools(d => !d)}>
            <span>&#9881; Dev Tools</span>
            <span>{showDevTools ? '▲' : '▼'}</span>
          </button>

          {showDevTools && (
            <div className="dev-tools-body">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Toggle demo mode to simulate the live call without an API key.
                Click the active button again to deselect.
              </div>
              <div className="dev-tools-buttons">
                <button
                  className={`dev-tools-btn${demoMode ? ' dev-tools-btn--active' : ''}`}
                  onClick={() => setDemoMode(d => !d)}
                >
                  &#9654; {demoMode ? 'Demo Mode ON' : 'Enable Demo Mode'}
                </button>
                <button
                  className={`dev-tools-btn${testMode === 'agent1-fail' ? ' dev-tools-btn--active' : ''}`}
                  onClick={() => setTestMode(m => m === 'agent1-fail' ? null : 'agent1-fail')}
                >
                  &#10007; Simulate Agent 1 Failure
                </button>
                <button
                  className={`dev-tools-btn${testMode === 'cad-timeout' ? ' dev-tools-btn--active' : ''}`}
                  onClick={() => setTestMode(m => m === 'cad-timeout' ? null : 'cad-timeout')}
                >
                  &#9201; Simulate CAD Timeout
                </button>
                <button
                  className={`dev-tools-btn${testMode === 'low-confidence' ? ' dev-tools-btn--active' : ''}`}
                  onClick={() => setTestMode(m => m === 'low-confidence' ? null : 'low-confidence')}
                >
                  &#9888; Simulate Low Confidence
                </button>
              </div>
              {demoMode && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--success)' }}>
                  Demo active — API key not required. Uses mock AI data + artificial delays.
                </div>
              )}
              {testMode && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--warning)' }}>
                  Active scenario: <strong>{testMode}</strong> — next workflow run will trigger this failure
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <div className="app-footer-meta">PSAP Context Transfer AI &middot; v1.0.0 &middot; Multi-agent emergency dispatch decision support</div>
          <div className="app-footer-shortcuts">
            Keyboard:&nbsp;
            <kbd>Space</kbd> run &nbsp;&middot;&nbsp;
            <kbd>R</kbd> reset &nbsp;&middot;&nbsp;
            <kbd>E</kbd> export &nbsp;&middot;&nbsp;
            <kbd>1&ndash;4</kbd> scenario
          </div>
        </footer>

      </div>
    </ErrorBoundary>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
