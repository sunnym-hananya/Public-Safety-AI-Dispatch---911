// PSAP Context Transfer AI
const { useState, useRef, useEffect } = React;

const MOCK_CALL = {
  transcript: `Operator: 911, what's your emergency?

Caller: My mother has fallen and I can't get her up. She's 87 years old.

Operator: Is she conscious?

Caller: Yes, she's talking to me, but she says her hip hurts really badly.

Operator: Did she hit her head when she fell?

Caller: I don't think so. She's on blood thinners though - warfarin.

Operator: Okay, that's important. What's your address?

Caller: 892 Elm Street, we're in the upstairs bedroom.

Operator: Can you reach her medication list?

Caller: Yes, hold on... She's on warfarin, metoprolol, and lisinopril.

Operator: Don't try to move her. EMS is on the way.`,

  metadata: {
    callTime: "14:23:17",
    transferDelay: "4 min 23 sec",
    questionsRepeated: 3,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getConfidenceStyle(score) {
  if (score >= 90) return { color: '#00d4aa', bg: 'rgba(0,212,170,0.15)', border: 'rgba(0,212,170,0.3)' };
  if (score >= 70) return { color: '#ffb84d', bg: 'rgba(255,184,77,0.15)', border: 'rgba(255,184,77,0.3)' };
  return { color: '#ff4d4d', bg: 'rgba(255,77,77,0.15)', border: 'rgba(255,77,77,0.3)' };
}

function parseJSON(text) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  return JSON.parse(clean.trim());
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function WorkflowProgress({ step }) {
  const steps = [
    { id: 'extracting', label: 'Agent 1: Extract', desc: 'Analyzing transcript' },
    { id: 'verifying', label: 'Agent 2: Verify', desc: 'Scoring confidence' },
    { id: 'cad-lookup', label: 'Agent 3: CAD Lookup', desc: 'Querying databases' },
    { id: 'complete', label: 'Complete', desc: 'Ready for dispatch' },
  ];

  const stepOrder = { extracting: 0, verifying: 1, 'cad-lookup': 2, complete: 3, error: 3 };
  const currentIdx = stepOrder[step] ?? -1;

  const getStatus = (idx) => {
    if (currentIdx > idx) return 'complete';
    if (currentIdx === idx) return 'active';
    return 'pending';
  };

  return (
    <div className="workflow-progress">
      {steps.map((s, i) => {
        const status = getStatus(i);
        return (
          <React.Fragment key={s.id}>
            <div className={`workflow-step workflow-step-${status}`}>
              <div className="workflow-step-icon">
                {status === 'complete'
                  ? '✓'
                  : status === 'active'
                    ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', display: 'inline-block' }}></span>
                    : '○'}
              </div>
              <div className="workflow-step-text">
                <div className="workflow-step-label">{s.label}</div>
                <div className="workflow-step-desc">{s.desc}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`workflow-connector workflow-connector-${status === 'complete' ? 'complete' : 'pending'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ExtractionField({ label, fieldKey, verification, children }) {
  const score = verification?.fieldScores?.[fieldKey]?.confidence;
  const note = verification?.fieldScores?.[fieldKey]?.note;
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

// ── Static geospatial data ────────────────────────────────────────────────────

// Edmonton divided into 4 dispatch divisions (L.rectangle bounds: [[swLat,swLng],[neLat,neLng]])
const RESPONSE_ZONES = [
  { name: 'North Division', color: '#0088ff', bounds: [[53.55, -113.58], [53.64, -113.45]] },
  { name: 'South Division', color: '#00d4aa', bounds: [[53.46, -113.58], [53.55, -113.45]] },
  { name: 'East Division', color: '#ffb84d', bounds: [[53.46, -113.45], [53.60, -113.36]] },
  { name: 'West Division', color: '#c060ff', bounds: [[53.48, -113.68], [53.62, -113.58]] },
];

// Historical incident heat points [lat, lng, intensity 0-1]
const HEAT_POINTS = [
  [53.5461, -113.4938, 0.9],  // 456 Oak St — domestic history
  [53.5528, -113.5001, 0.8],  // 789 Elm Ave — medical
  [53.5389, -113.5112, 0.9],  // 567 Pine Rd — fire
  [53.5447, -113.4867, 0.5],  // 345 Cedar Lane
  [53.5502, -113.4756, 0.8],  // 890 Birch Blvd — medical
  [53.5334, -113.4623, 0.7],  // 901 Spruce St — vehicle accident
  [53.5612, -113.5234, 0.4],  // 234 Maple Dr
  [53.5798, -113.5102, 1.0],  // Highway 2 — current incident
  [53.5444, -113.4909, 0.4],  // 123 Main St
  [53.5723, -113.5678, 0.3],  // 334 Valley View
  [53.5658, -113.4512, 0.5],  // 112 Aspen Ave
];

// Unit type → marker colour
const UNIT_COLOR = { Police: '#4d9fff', Fire: '#ff6432', Ambulance: '#00d4aa' };

// ── MapSection component ──────────────────────────────────────────────────────

function MapSection({ extraction, cadData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const groupsRef = useRef({});
  const heatLayerRef = useRef(null);

  const [layers, setLayers] = useState({ units: true, zones: true, routes: true, history: false });

  // Derive incident coordinates: GIS match → coordinate, or Highway 2 fallback
  const getIncidentCoords = (cad) => {
    if (cad?.addressDetails) return [cad.addressDetails.lat, cad.addressDetails.lng];
    return [53.5798, -113.5102]; // Highway 2 / Airport Rd default
  };

  // ── Initialise Leaflet map once on mount ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || typeof L === 'undefined') return;

    const map = L.map(containerRef.current, {
      center: [53.5620, -113.5050],
      zoom: 12,
      zoomControl: true,
    });

    // Esri World Street Map (no API key required for raster tiles)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>', maxZoom: 19 }
    ).addTo(map);

    // Layer groups
    const groups = {
      incident: L.layerGroup().addTo(map),
      units: L.layerGroup().addTo(map),
      zones: L.layerGroup().addTo(map),
      routes: L.layerGroup().addTo(map),
      history: L.layerGroup(),          // off by default
    };
    groupsRef.current = groups;

    // Response zones (static rectangles)
    RESPONSE_ZONES.forEach(zone => {
      L.rectangle(zone.bounds, {
        color: zone.color, weight: 2, fillOpacity: 0.07, opacity: 0.6,
      })
        .bindPopup(`<strong style="color:${zone.color}">${zone.name}</strong>`)
        .addTo(groups.zones);
    });

    // Historical heatmap (static)
    try {
      if (typeof L.heatLayer !== 'undefined') {
        heatLayerRef.current = L.heatLayer(HEAT_POINTS, { radius: 28, blur: 20, maxZoom: 17 });
        heatLayerRef.current.eachLayer
          ? heatLayerRef.current.eachLayer(l => groups.history.addLayer(l))
          : groups.history.addLayer(heatLayerRef.current);
      } else {
        // Fallback: translucent circles
        HEAT_POINTS.forEach(([lat, lng, intensity]) =>
          L.circleMarker([lat, lng], {
            radius: 10, color: '#ff4d4d', fillColor: '#ff4d4d',
            fillOpacity: intensity * 0.5, weight: 0,
          }).addTo(groups.history)
        );
      }
    } catch (e) { /* heatmap optional */ }

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Update incident marker + unit markers whenever data changes ───────────
  useEffect(() => {
    if (!mapRef.current || !extraction) return;
    const map = mapRef.current;
    const { incident, units, routes } = groupsRef.current;
    if (!incident) return;

    const coords = getIncidentCoords(cadData);

    // ── Incident marker ──
    incident.clearLayers();
    const urgency = extraction.urgencyLevel || 'MEDIUM';
    const pulseClass = urgency === 'CRITICAL' ? 'pulse-critical' : urgency === 'HIGH' ? 'pulse-high' : 'pulse-medium';
    const incidentIcon = L.divIcon({
      className: '',
      html: `<div class="incident-marker ${pulseClass}"><span>!</span></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    L.marker(coords, { icon: incidentIcon })
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:200px">
          <div style="color:#ff4d4d;font-weight:700;font-size:14px;margin-bottom:6px">
            ${urgency} — ${extraction.incidentType}
          </div>
          <div style="margin-bottom:4px"><strong>Location:</strong> ${extraction.location?.address || 'Unknown'}</div>
          <div style="margin-bottom:4px"><strong>Issue:</strong> ${extraction.situation?.chiefComplaint || '—'}</div>
          <div><strong>Response:</strong> ${extraction.estimatedResponseNeeded || '—'}</div>
        </div>
      `)
      .addTo(incident);

    // ── Unit markers + route lines ──
    if (cadData?.availableUnits?.length) {
      units.clearLayers();
      routes.clearLayers();

      cadData.availableUnits.forEach(unit => {
        if (!unit.lat || !unit.lng) return;
        const color = UNIT_COLOR[unit.type] || '#888';
        const opacity = unit.status === 'Available' ? 1 : unit.status === 'En Route' ? 0.75 : 0.35;
        const unitIcon = L.divIcon({
          className: '',
          html: `<div class="unit-map-marker" style="background:${color};opacity:${opacity}">
                   <span>${unit.type[0]}</span>
                 </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([unit.lat, unit.lng], { icon: unitIcon })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">${unit.id}</div>
              <div style="margin-bottom:3px">Type: ${unit.type}</div>
              <div style="margin-bottom:3px">Status: <strong style="color:${unit.status === 'Available' ? '#00d4aa' : unit.status === 'En Route' ? '#ffb84d' : '#888'}">${unit.status}</strong></div>
              <div style="margin-bottom:3px">Location: ${unit.location}</div>
              <div>${unit.eta ? `ETA: <strong>${unit.eta} min</strong>` : 'Unavailable'}</div>
            </div>
          `)
          .addTo(units);

        // Dashed route line from available units to incident
        if (unit.status === 'Available') {
          L.polyline([[unit.lat, unit.lng], coords], {
            color, weight: 2, opacity: 0.45, dashArray: '7, 9',
          }).addTo(routes);
        }
      });
    }

    map.setView(coords, 13);
  }, [extraction, cadData]);

  // ── Sync layer visibility with toggle state ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const g = groupsRef.current;
    if (!g.units) return;

    layers.units ? map.addLayer(g.units) : map.removeLayer(g.units);
    layers.zones ? map.addLayer(g.zones) : map.removeLayer(g.zones);
    layers.routes ? map.addLayer(g.routes) : map.removeLayer(g.routes);
    layers.history ? map.addLayer(g.history) : map.removeLayer(g.history);
  }, [layers]);

  const toggle = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const TOGGLE_LABELS = { units: 'Units', zones: 'Zones', routes: 'Routes', history: 'Heatmap' };

  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Incident Map</h2>

      {/* Layer toggles */}
      <div className="map-controls">
        {Object.keys(TOGGLE_LABELS).map(key => (
          <button
            key={key}
            className={`map-toggle${layers[key] ? ' active' : ''}`}
            onClick={() => toggle(key)}
          >
            {TOGGLE_LABELS[key]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
          Click any marker for details
        </span>
      </div>

      {/* Map */}
      <div ref={containerRef} className="map-container"></div>

      {/* Legend */}
      <div className="map-legend">
        <span className="legend-title">Legend</span>
        {[
          { label: 'Incident', color: '#ff4d4d' },
          { label: 'Police', color: '#4d9fff' },
          { label: 'Fire', color: '#ff6432' },
          { label: 'Ambulance', color: '#00d4aa' },
          { label: 'Available', color: '#00d4aa', shape: 'ring' },
          { label: 'En Route', color: '#ffb84d', shape: 'ring' },
          { label: 'Busy', color: '#555', shape: 'ring' },
        ].map(item => (
          <div key={item.label} className="legend-item">
            <span
              className="legend-dot"
              style={{
                background: item.shape === 'ring' ? 'transparent' : item.color,
                border: item.shape === 'ring' ? `2px solid ${item.color}` : 'none',
              }}
            ></span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function App() {
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState('idle'); // idle | extracting | verifying | cad-lookup | complete | error
  const [extraction, setExtraction] = useState(null);
  const [verification, setVerification] = useState(null);
  const [cadData, setCadData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const runWorkflow = async () => {
    if (!apiKey) { alert('Please enter your Anthropic API key'); return; }

    setStep('extracting');
    setExtraction(null);
    setVerification(null);
    setCadData(null);
    setErrorMsg('');
    setElapsed(0);

    // Start elapsed timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 100);

    try {
      // ── Agent 1: Extract ────────────────────────────────────────────────────
      const r1 = await fetch('http://localhost:3000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, transcript: MOCK_CALL.transcript }),
      });
      const d1 = await r1.json();
      if (d1.error) throw new Error(d1.error.message || d1.error);
      const ext = parseJSON(d1.content[0].text);
      setExtraction(ext);

      // ── Agent 2: Verify ─────────────────────────────────────────────────────
      setStep('verifying');
      const r2 = await fetch('http://localhost:3000/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, transcript: MOCK_CALL.transcript, extraction: ext }),
      });
      const d2 = await r2.json();
      if (d2.error) throw new Error(d2.error.message || d2.error);
      const ver = parseJSON(d2.content[0].text);
      setVerification(ver);

      // ── Agent 3: CAD Lookup ─────────────────────────────────────────────
      setStep('cad-lookup');
      const r3 = await fetch('http://localhost:3000/cad-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, extraction: ext }),
      });
      const d3 = await r3.json();
      if (d3.error) throw new Error(d3.error);
      setCadData(d3);

      setStep('complete');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      clearInterval(timerRef.current);
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }
  };

  const isRunning = step === 'extracting' || step === 'verifying' || step === 'cad-lookup';
  const reviewCount = verification?.flaggedFields?.length ?? 0;

  const statusBadge = {
    idle: { cls: 'badge-info', label: 'READY' },
    extracting: { cls: 'badge-warning', label: 'AGENT 1' },
    verifying: { cls: 'badge-warning', label: 'AGENT 2' },
    'cad-lookup': { cls: 'badge-warning', label: 'AGENT 3' },
    complete: { cls: 'badge-success', label: 'VERIFIED' },
    error: { cls: 'badge-danger', label: 'ERROR' },
  }[step];

  return (
    <div className="container">

      {/* ── Header ── */}
      <div className="header">
        <h1>PSAP Context Transfer AI</h1>
        <p className="subtitle">
          Multi-agent workflow: Extract → Verify → Human Review
        </p>
      </div>

      {/* ── API Config ── */}
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
        <div className="alert alert-info">
          <div>
            <strong>Demo Setup:</strong>
            <ol style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: '0' }}>
              <li>Run the proxy server: <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px' }}>node server.js</code></li>
              <li>Get your API key at <a href="https://console.anthropic.com" target="_blank" style={{ color: 'var(--accent-primary)' }}>console.anthropic.com</a></li>
              <li>Enter the key above and click "Run Multi-Agent Workflow"</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Main demo section ── */}
      <div className="demo-section">

        {/* Left: Transcript */}
        <div className="card">
          <div className="card-title">
            <span>Current Process</span>
            <span className="badge badge-danger">BROKEN</span>
          </div>

          <div className="transcript-box">
            {MOCK_CALL.transcript.split('\n').map((line, i) => {
              if (line.startsWith('Operator:') || line.startsWith('EMS Dispatcher:')) {
                return (
                  <div key={i}>
                    <span className="speaker">{line.split(':')[0]}:</span>
                    {line.split(':').slice(1).join(':')}
                  </div>
                );
              } else if (line.startsWith('Caller:')) {
                return (
                  <div key={i}>
                    <span className="speaker" style={{ color: 'var(--warning)' }}>
                      {line.split(':')[0]}:
                    </span>
                    {line.split(':').slice(1).join(':')}
                  </div>
                );
              } else {
                return (
                  <div key={i} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {line}
                  </div>
                );
              }
            })}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {MOCK_CALL.metadata.transferDelay}
              </div>
              <div className="stat-label">Transfer Delay</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {MOCK_CALL.metadata.questionsRepeated}
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

        {/* Right: Multi-Agent Workflow */}
        <div className="card">
          <div className="card-title">
            <span>Multi-Agent Analysis</span>
            <span className={`badge ${statusBadge.cls}`}>{statusBadge.label}</span>
          </div>

          <button
            className="button"
            onClick={runWorkflow}
            disabled={isRunning || !apiKey}
          >
            {isRunning ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></span>
                Running Workflow...
              </>
            ) : (
              <>Run Multi-Agent Workflow</>
            )}
          </button>

          {step !== 'idle' && <WorkflowProgress step={step} />}

          {step !== 'idle' && (
            <div className="timer-display">
              <span className="timer-live" style={{ color: isRunning ? 'var(--warning)' : 'var(--accent-primary)' }}>
                {elapsed.toFixed(1)}<span className="timer-unit">s</span>
              </span>
              {isRunning
                ? <span className="timer-label">● LIVE</span>
                : step === 'complete'
                  ? <span className="timer-label">vs legacy <strong>4m 23s</strong></span>
                  : null}
            </div>
          )}

          {step === 'error' && (
            <div className="alert alert-warning">
              <div>
                <strong>Error:</strong> {errorMsg}
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  Make sure the proxy server is running: node server.js
                </small>
              </div>
            </div>
          )}

          {/* Extraction results — visible from verifying onwards */}
          {extraction && (step === 'verifying' || step === 'cad-lookup' || step === 'complete') && (
            <div className="context-packet" style={{
              borderColor: step === 'complete' ? 'var(--success)' : 'var(--border)',
              marginTop: '20px',
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Agent 1 — Context Extraction
                {step === 'verifying' && (
                  <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '400' }}>
                    Agent 2 scoring...
                  </span>
                )}
              </h3>

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
                {extraction.caller.relationship} — {extraction.caller.emotionalState}
              </ExtractionField>

              <ExtractionField label="Hazards" fieldKey="hazards" verification={verification}>
                {extraction.hazards.length > 0
                  ? extraction.hazards.map((h, i) => (
                    <span key={i} className="tag" style={{
                      background: 'rgba(255,77,77,0.15)',
                      color: 'var(--danger)',
                      borderColor: 'rgba(255,77,77,0.3)',
                    }}>{h}</span>
                  ))
                  : <span style={{ color: 'var(--text-muted)' }}>None identified</span>
                }
              </ExtractionField>

              <ExtractionField label="Recommended Response" fieldKey="recommendedService" verification={verification}>
                {extraction.estimatedResponseNeeded}
              </ExtractionField>

              <ExtractionField label="Priority Notes" fieldKey="priorityNotes" verification={verification}>
                <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                  {extraction.priorityNotes}
                </span>
              </ExtractionField>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent 2 Verification Report ── */}
      {verification && (step === 'cad-lookup' || step === 'complete') && (
        <div className="comparison-section">
          <h2 className="comparison-title">Agent 2 — Verification Report</h2>

          {/* Summary stats */}
          <div className="stats-grid" style={{ marginBottom: '30px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{
                color: verification.overallConfidence >= 80
                  ? 'var(--success)'
                  : verification.overallConfidence >= 60
                    ? 'var(--warning)'
                    : 'var(--danger)',
              }}>
                {verification.overallConfidence}%
              </div>
              <div className="stat-label">Overall Confidence</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: reviewCount === 0 ? 'var(--success)' : 'var(--warning)' }}>
                {reviewCount}
              </div>
              <div className="stat-label">Fields Flagged for Review</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">2</div>
              <div className="stat-label">Agents Run</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                {elapsed.toFixed(1)}s
              </div>
              <div className="stat-label">Total Workflow Time</div>
            </div>
          </div>

          {/* Review flags */}
          {reviewCount > 0 ? (
            <div className="alert alert-warning">
              <div>
                <strong>
                  Human Review Required — {reviewCount} field{reviewCount !== 1 ? 's' : ''} below 80% confidence:
                </strong>
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {verification.flaggedFields.map((field, i) => (
                    <span key={i} style={{
                      background: 'rgba(255,184,77,0.2)',
                      color: 'var(--warning)',
                      border: '1px solid rgba(255,184,77,0.4)',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {field} — {verification.fieldScores[field]?.confidence}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <div>
                <strong>All fields verified above 80% confidence.</strong> Dispatcher may proceed with standard protocol.
              </div>
            </div>
          )}

          {/* Agent 2 narrative */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '20px',
          }}>
            <div style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-muted)',
              fontWeight: '600',
              marginBottom: '12px',
            }}>
              Agent 2 Assessment
            </div>
            <p style={{ color: 'var(--text-primary)', lineHeight: '1.8', fontSize: '15px' }}>
              {verification.verificationSummary}
            </p>
          </div>

          {/* Human decision boundary */}
          <div className="alert alert-warning" style={{ marginTop: '20px' }}>
            <div>
              <strong>Critical Human Decision Point:</strong> The receiving dispatcher MUST review
              AI-generated context before dispatch. AI provides decision support — humans retain
              authority over all resource allocation and response decisions. The system fails safely:
              if AI confidence is low or the situation is ambiguous, it flags for full human review.
            </div>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      {extraction && (step === 'verifying' || step === 'cad-lookup' || step === 'complete') && (
        <MapSection extraction={extraction} cadData={cadData} />
      )}

      {/* ── Agent 3: CAD Integration ── */}
      {(step === 'cad-lookup' || step === 'complete') && (
        <div className="comparison-section" style={{ marginTop: '20px' }}>
          <h2 className="comparison-title">Agent 3 — CAD Integration</h2>

          {step === 'cad-lookup' && (
            <div className="loading">
              <span className="spinner"></span>
              Querying CAD databases...
            </div>
          )}

          {cadData && (
            <>
              {/* Alert banners */}
              {cadData.alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {cadData.alerts.map((alert, i) => (
                    <div key={i} className={`cad-alert cad-alert-${alert.severity}`}>
                      <span className="cad-alert-icon">
                        {alert.severity === 'danger' ? '⚠' : 'ℹ'}
                      </span>
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Address + caller | Past incidents */}
              <div className="cad-grid">

                {/* Left: address validation + caller */}
                <div>
                  <div className="cad-card">
                    <div className="cad-card-title">Address Validation</div>
                    {cadData.addressValid ? (
                      <div>
                        <div className="address-status address-valid">
                          <span>✓</span> VERIFIED IN GIS
                        </div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">Address</span>
                          <span>{cadData.addressDetails.address}</span>
                        </div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">City</span>
                          <span>{cadData.addressDetails.city}, {cadData.addressDetails.postal}</span>
                        </div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">Zone type</span>
                          <span>{cadData.addressDetails.type}</span>
                        </div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">Coordinates</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                            {cadData.addressDetails.lat}, {cadData.addressDetails.lng}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="address-status address-invalid">
                          <span>✕</span> NOT IN GIS DATABASE
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
                          Manually verify address before dispatch. May be a rural address, new development, or transcription error.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="cad-card" style={{ marginTop: '16px' }}>
                    <div className="cad-card-title">Caller History</div>
                    {cadData.callerHistory ? (
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>{cadData.callerHistory.name}</div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">Total calls</span>
                          <span style={{ color: 'var(--warning)', fontWeight: '700' }}>{cadData.callerHistory.callCount}</span>
                        </div>
                        <div className="address-detail-row">
                          <span className="address-detail-label">Last call</span>
                          <span>{cadData.callerHistory.lastCall}</span>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {cadData.callerHistory.notes}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        No frequent caller record. Phone number unknown or first-time caller.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: past incidents */}
                <div className="cad-card">
                  <div className="cad-card-title">
                    Location History
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '8px' }}>
                      last 30 days
                    </span>
                  </div>
                  {cadData.pastIncidents.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                      No incidents recorded at this address in the last 30 days.
                    </div>
                  ) : (
                    <table className="incidents-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Priority</th>
                          <th>Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cadData.pastIncidents.map((inc) => (
                          <tr key={inc.id}>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {inc.date}
                            </td>
                            <td>{inc.type}</td>
                            <td>
                              <span className={`priority-badge priority-${inc.priority.toLowerCase()}`}>
                                {inc.priority}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{inc.outcome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Units */}
              <div className="cad-card" style={{ marginTop: '16px' }}>
                <div className="cad-card-title">Available Units</div>
                <div className="unit-list">
                  {cadData.availableUnits.map((unit) => (
                    <div key={unit.id} className="unit-row">
                      <span className="unit-id">{unit.id}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', minWidth: '90px' }}>{unit.type}</span>
                      <span className={`unit-status unit-status-${unit.status.toLowerCase().replace(' ', '-')}`}>
                        {unit.status === 'Available' ? '●' : unit.status === 'En Route' ? '◐' : '○'} {unit.status}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', flex: 1 }}>{unit.location}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: unit.eta ? 'var(--accent-primary)' : 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>
                        {unit.eta ? `ETA ${unit.eta} min` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Impact Stats ── */}
      {step === 'complete' && (
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
      )}

    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
