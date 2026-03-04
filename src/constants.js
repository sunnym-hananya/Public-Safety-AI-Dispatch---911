// ── Mock 911 call transcript + call metadata ─────────────────────────────────
const MOCK_CALL = {
  transcript: `Operator: 911, what's your emergency?

Caller: There's been a huge accident on Highway 2 northbound near the Airport Road exit!

Operator: Are you injured?

Caller: No, I'm okay, but there are at least 3 cars involved. One is on fire!

Operator: Okay, stay back from the vehicles. Can you see if anyone is trapped?

Caller: I can see someone in the burning car, they're not moving. There's smoke everywhere.

Operator: How many lanes are blocked?

Caller: All of them. Traffic is completely stopped.

Operator: Okay, I'm getting fire and EMS on the way. Stay on the line.`,

  metadata: {
    callTime: '14:23:17',
    transferDelay: '4 min 23 sec',
    questionsRepeated: 3,
  },
};

// ── Edmonton dispatch divisions (Leaflet rectangle bounds: [[sw],[ne]]) ───────
const RESPONSE_ZONES = [
  { name: 'North Division', color: '#0088ff', bounds: [[53.55, -113.58], [53.64, -113.45]] },
  { name: 'South Division', color: '#00d4aa', bounds: [[53.46, -113.58], [53.55, -113.45]] },
  { name: 'East Division',  color: '#ffb84d', bounds: [[53.46, -113.45], [53.60, -113.36]] },
  { name: 'West Division',  color: '#c060ff', bounds: [[53.48, -113.68], [53.62, -113.58]] },
];

// ── Historical incident heat points [lat, lng, intensity 0-1] ────────────────
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

// ── Unit type → map marker colour ────────────────────────────────────────────
const UNIT_COLOR = {
  Police:    '#4d9fff',
  Fire:      '#ff6432',
  Ambulance: '#00d4aa',
};

// ── Degraded-mode placeholders ────────────────────────────────────────────────
// Used when an agent fails — allow pipeline to continue with warnings rather
// than hard-stopping the entire workflow.

const DEGRADED_VERIFICATION = {
  degraded:           true,
  overallConfidence:  0,
  flaggedFields:      ['incidentType', 'urgencyLevel', 'location', 'chiefComplaint',
                       'symptoms', 'timeline', 'hazards', 'recommendedService', 'priorityNotes'],
  fieldScores:        {},
  verificationSummary: 'Agent 2 failed — all fields unverified. Dispatcher must manually review all extracted data before dispatch.',
};

const DEGRADED_CAD = {
  degraded:       true,
  addressValid:   false,
  addressDetails: null,
  alerts:         [],
  pastIncidents:  [],
  callerHistory:  null,
  frequentCallers: [],
  availableUnits: [],
};

// ── Dev Tools: low-confidence mock verification ───────────────────────────────
// Used by the "Simulate Low Confidence" Dev Tools button.
const MOCK_LOW_CONFIDENCE_VERIFICATION = {
  degraded:          false,
  overallConfidence: 52,
  flaggedFields:     ['location', 'urgencyLevel', 'hazards'],
  fieldScores: {
    incidentType:       { confidence: 88, note: 'Multi-vehicle accident clearly stated' },
    urgencyLevel:       { confidence: 48, note: 'Severity ambiguous — caller did not confirm injuries' },
    location:           { confidence: 55, note: 'Highway 2 mentioned but exact kilometre point unclear' },
    caller:             { confidence: 85, note: 'Bystander relationship stated' },
    chiefComplaint:     { confidence: 90, note: 'Fire and trapped occupant explicitly described' },
    symptoms:           { confidence: 78, note: 'Unconscious victim inferred from "not moving"' },
    timeline:           { confidence: 72, note: 'Estimated onset — caller arrived after accident' },
    hazards:            { confidence: 44, note: 'Fire confirmed; secondary explosion risk speculative' },
    recommendedService: { confidence: 80, note: 'Fire + EMS consistent with incident type' },
    priorityNotes:      { confidence: 70, note: 'Lane blockage stated; structural damage not assessed' },
  },
  verificationSummary: 'Significant uncertainty around location precision and urgency classification. Dispatcher should confirm exact kilometre marker on Highway 2 and check for additional casualties before committing resources.',
};

// ── Demo Mode: mock extraction + high-confidence verification ─────────────────
// Used when demoMode is enabled — no API key required.
const MOCK_EXTRACTION_RESULT = {
  incidentType: 'Multi-Agency',
  urgencyLevel: 'CRITICAL',
  location: { address: 'Highway 2 Northbound, near Airport Road Exit', unit: null, landmarks: 'Airport Road interchange' },
  caller: { relationship: 'Bystander', phone: 'unknown', emotionalState: 'panicked' },
  situation: {
    chiefComplaint: 'Multi-vehicle accident with vehicle fire and trapped unresponsive occupant',
    symptoms: ['Unresponsive occupant in burning vehicle', 'Multiple vehicles involved', 'Heavy smoke visible'],
    timeline: 'Active — caller witnessing in real-time',
    priorMedicalInfo: null,
  },
  hazards: ['Vehicle fire', 'All northbound lanes blocked', 'Risk of fuel explosion'],
  recommendedService: 'Fire (Rescue), ALS Ambulance, Police (Traffic Control)',
  priorityNotes: 'LIFE THREAT: Unconscious person trapped in burning vehicle. Immediate multi-agency response required.',
  estimatedResponseNeeded: 'Fire Engine + ALS Ambulance + Police',
};

const MOCK_HIGH_CONFIDENCE_VERIFICATION = {
  degraded: false,
  overallConfidence: 94,
  flaggedFields: [],
  fieldScores: {
    incidentType:       { confidence: 96, note: 'Multi-vehicle fire explicitly confirmed' },
    urgencyLevel:       { confidence: 97, note: 'Unconscious trapped victim — CRITICAL unambiguous' },
    location:           { confidence: 89, note: 'Highway 2 near Airport Road clear; exact km unknown' },
    caller:             { confidence: 95, note: 'Bystander explicitly stated' },
    chiefComplaint:     { confidence: 98, note: 'Fire and trapped occupant directly described' },
    symptoms:           { confidence: 93, note: 'Directly observed by caller' },
    timeline:           { confidence: 99, note: 'Real-time event' },
    hazards:            { confidence: 91, note: 'Fire confirmed; explosion risk inferred' },
    recommendedService: { confidence: 95, note: 'Fire + EMS + Police required' },
    priorityNotes:      { confidence: 94, note: 'Trapped victim and lane blockage confirmed' },
  },
  verificationSummary: 'High confidence across all fields. Exact kilometre marker on Highway 2 is the only gap — do not delay response to confirm it.',
};

// ── Manual process steps for Before/After comparison ─────────────────────────
// Full 8-step table (333s) models a 3-agency call (Fire + EMS + Police).
// Single-agency scenarios use trimmed 6-step variants defined per-scenario.
const MANUAL_PROCESS_STEPS = [
  { step: 'Call Queued & Answered',       duration: 28, note: 'Caller on hold, system queued' },
  { step: 'Initial Incident Assessment',  duration: 52, note: 'Dispatcher asks ~8 questions manually' },
  { step: 'Transfer to EMS (hold)',        duration: 65, note: 'Caller put on hold, warm transfer' },
  { step: 'EMS Re-asks Questions',         duration: 48, note: '3 key questions repeated by EMS' },
  { step: 'Transfer to Fire (hold)',       duration: 44, note: 'Second hold, second transfer initiated' },
  { step: 'Fire Dispatcher Re-questions',  duration: 38, note: 'Same questions for the third time' },
  { step: 'Manual CAD Data Entry',         duration: 30, note: 'Dispatcher types incident into CAD' },
  { step: 'Radio Unit Assignment',         duration: 28, note: 'Manual radio check, unit confirmed' },
];

// EMS-only (251s total)
const MANUAL_STEPS_EMS = [
  { step: 'Call Queued & Answered',      duration: 28, note: 'Caller on hold, system queued' },
  { step: 'Initial Incident Assessment', duration: 52, note: 'Dispatcher asks ~8 questions manually' },
  { step: 'Transfer to EMS (hold)',       duration: 65, note: 'Caller put on hold, warm transfer' },
  { step: 'EMS Re-asks Questions',        duration: 48, note: '3 key questions repeated by EMS' },
  { step: 'Manual CAD Data Entry',        duration: 30, note: 'Dispatcher types incident into CAD' },
  { step: 'Radio Unit Assignment',        duration: 28, note: 'Manual radio check, unit confirmed' },
];

// Police-only (218s total)
const MANUAL_STEPS_POLICE = [
  { step: 'Call Queued & Answered',      duration: 28, note: 'Caller on hold, system queued' },
  { step: 'Initial Incident Assessment', duration: 52, note: 'Dispatcher asks ~8 questions manually' },
  { step: 'Transfer to Police (hold)',    duration: 45, note: 'Caller put on hold, warm transfer' },
  { step: 'Police Re-asks Questions',     duration: 35, note: 'Key questions repeated by police dispatcher' },
  { step: 'Manual CAD Data Entry',        duration: 30, note: 'Dispatcher types incident into CAD' },
  { step: 'Radio Unit Assignment',        duration: 28, note: 'Manual radio check, unit confirmed' },
];

// ── Demo Scenarios ────────────────────────────────────────────────────────────
// Four pre-loaded incidents that demonstrate different system capabilities.
// Each has a call (same shape as MOCK_CALL), extraction, and verification mock.
// Agents 3 & 4 always hit the server (deterministic — no API key consumed).
const DEMO_SCENARIOS = [
  {
    id: 'cardiac',
    label: 'Cardiac Arrest',
    emoji: '\uD83D\uDEA8',
    urgency: 'CRITICAL',
    urgencyClass: 'danger',
    description: 'Clean extraction \xB7 single-agency \xB7 97% confidence',
    mapCoords: [53.5461, -113.5680], // 12445 Jasper Avenue — matches GIS id 16
    callerInfo: { phone: '(780) 555-2847', area: 'West Edmonton', callType: 'Wireless' },
    manualSteps: MANUAL_STEPS_EMS,
    lines: [
      { speaker: 'operator', text: "9-1-1, what\u2019s your emergency?",                                                              delay: 0    },
      { speaker: 'caller',   text: "My father just collapsed in the kitchen! He\u2019s not breathing, please hurry!",                 delay: 3000 },
      { speaker: 'operator', text: "Stay calm. What\u2019s your exact address?",                                                      delay: 2500 },
      { speaker: 'caller',   text: "12445 Jasper Avenue, unit 4B! There\u2019s no pulse, his lips are turning blue!",                delay: 4000 },
      { speaker: 'operator', text: "How old is he? Any medical conditions?",                                                          delay: 2500 },
      { speaker: 'caller',   text: "He\u2019s 67 \u2014 he\u2019s diabetic. He was eating dinner and just fell over!",               delay: 4000 },
      { speaker: 'operator', text: "I\u2019m dispatching EMS right now. Put him on his back \u2014 I\u2019ll walk you through CPR.", delay: 2500 },
      { speaker: 'caller',   text: "Okay okay I\u2019m doing it, please hurry\u2014",                                                delay: 3500 },
    ],
    checkpoints: [
      {
        afterLine: 1,
        fields: { incidentType: 'Medical - Cardiac', urgencyLevel: 'CRITICAL', caller: { relationship: 'Daughter', phone: 'on-call', emotionalState: 'panicked' } },
        agentNote: { type: 'ok', text: 'Incident type identified \u2014 cardiac arrest (99% confidence)' },
      },
      {
        afterLine: 3,
        fields: { location: { address: '12445 Jasper Avenue, Unit 4B, Edmonton, AB', unit: '4B', landmarks: null } },
        agentNote: { type: 'ok', text: 'Location verified \u2014 full address with unit confirmed (98%)' },
        triggerCad: true,
      },
      {
        afterLine: 5,
        fields: { situation: { chiefComplaint: '67-year-old male, unresponsive, no pulse \u2014 cardiac arrest', symptoms: ['Unresponsive', 'No pulse detected', 'Cyanosis \u2014 lips turning blue', 'Sudden collapse during meal'], timeline: 'Acute \u2014 onset ~2 minutes ago, CPR in progress', priorMedicalInfo: 'Type 2 diabetic, age 67' } },
        agentNote: { type: 'warning', text: 'Medical history: diabetic \u2014 flag for EMS glucose protocol' },
      },
      {
        afterLine: 7,
        fields: { hazards: [], recommendedService: 'ALS Ambulance (Priority 1)', priorityNotes: 'LIFE THREAT: Cardiac arrest in progress. Caller performing CPR. Dispatch ALS immediately.', estimatedResponseNeeded: 'ALS Ambulance' },
        agentNote: { type: 'ok', text: 'Extraction complete \u2014 all fields populated. Initiating routing.' },
        triggerRouting: true,
      },
    ],
    call: {
      transcript: `Operator: 9-1-1, what's your emergency?

Caller: My father just collapsed in the kitchen! He's not breathing, please hurry!

Operator: Stay calm. What's your address?

Caller: 12445 Jasper Avenue, unit 4B. There's no pulse, his lips are turning blue!

Operator: How old is he? Any medical conditions?

Caller: 67, he's diabetic — he was eating dinner and just fell over!

Operator: I'm dispatching EMS now. Put him on his back — I'll walk you through CPR.

Caller: Okay okay I'm doing it, please hurry—`,
      metadata: { callTime: '14:47:32', transferDelay: '3 min 41 sec', questionsRepeated: 4 },
    },
    extraction: {
      incidentType: 'Medical - Cardiac',
      urgencyLevel: 'CRITICAL',
      location: { address: '12445 Jasper Avenue, Unit 4B, Edmonton, AB', unit: '4B', landmarks: null },
      caller: { relationship: 'Daughter', phone: 'on-call', emotionalState: 'panicked' },
      situation: {
        chiefComplaint: '67-year-old male, unresponsive, no pulse, cyanosis — cardiac arrest in progress',
        symptoms: ['Unresponsive', 'No pulse detected', 'Cyanosis — lips turning blue', 'Sudden collapse during meal'],
        timeline: 'Acute — onset approximately 2 minutes ago, CPR in progress',
        priorMedicalInfo: 'Type 2 diabetic, age 67',
      },
      hazards: [],
      recommendedService: 'ALS Ambulance (Priority 1)',
      priorityNotes: 'LIFE THREAT: Cardiac arrest in progress. Caller performing CPR. Dispatch ALS immediately.',
      estimatedResponseNeeded: 'ALS Ambulance',
    },
    verification: {
      degraded: false, overallConfidence: 97, flaggedFields: [],
      fieldScores: {
        incidentType:       { confidence: 99, note: 'Cardiac arrest explicitly described — unambiguous' },
        urgencyLevel:       { confidence: 99, note: 'Unresponsive, no pulse, cyanosis — CRITICAL confirmed' },
        location:           { confidence: 98, note: 'Full address with unit number clearly stated by caller' },
        caller:             { confidence: 97, note: 'Family member, daughter role clearly inferred' },
        chiefComplaint:     { confidence: 99, note: 'Cardiac arrest directly described in real time' },
        symptoms:           { confidence: 98, note: 'Caller directly observing all symptoms' },
        timeline:           { confidence: 96, note: 'Acute onset confirmed, approximate timing given' },
        hazards:            { confidence: 99, note: 'No hazards — standard residential setting' },
        recommendedService: { confidence: 99, note: 'ALS required for cardiac arrest protocol' },
        priorityNotes:      { confidence: 98, note: 'CPR in progress, Priority 1 ALS confirmed' },
      },
      verificationSummary: 'Exceptionally high confidence. Clear address, unambiguous cardiac arrest with CPR underway. Dispatch ALS immediately — zero verification delay required.',
    },
  },

  {
    id: 'multivehicle',
    label: 'Multi-Vehicle Fire',
    emoji: '\uD83D\uDD25',
    urgency: 'CRITICAL',
    urgencyClass: 'danger',
    description: 'Multi-agency \xB7 complex routing \xB7 94% confidence',
    mapCoords: [53.5798, -113.5102], // Highway 2 / Airport Rd — matches GIS id 15
    callerInfo: { phone: '(780) 555-9134', area: 'North Edmonton \u2014 Highway Corridor', callType: 'Wireless' },
    manualSteps: MANUAL_PROCESS_STEPS,
    lines: [
      { speaker: 'operator', text: "9-1-1, what\u2019s your emergency?",                                                                            delay: 0    },
      { speaker: 'caller',   text: "There\u2019s been a huge accident on Highway 2 northbound near the Airport Road exit!",                         delay: 3000 },
      { speaker: 'operator', text: "Are you injured?",                                                                                              delay: 2000 },
      { speaker: 'caller',   text: "No, I\u2019m okay \u2014 but there are at least 3 cars involved. One is on fire!",                             delay: 3500 },
      { speaker: 'operator', text: "Stay back from the vehicles. Can you see if anyone is trapped?",                                                delay: 2500 },
      { speaker: 'caller',   text: "I can see someone in the burning car, they\u2019re not moving. There\u2019s smoke everywhere.",                 delay: 5000 },
      { speaker: 'operator', text: "How many lanes are blocked?",                                                                                   delay: 2000 },
      { speaker: 'caller',   text: "All of them. Traffic is completely stopped.",                                                                   delay: 3000 },
      { speaker: 'operator', text: "Okay, I\u2019m getting fire and EMS on the way. Stay on the line.",                                            delay: 2500 },
      { speaker: 'caller',   text: "Okay \u2014 the fire is spreading, please hurry!",                                                             delay: 3500 },
    ],
    checkpoints: [
      {
        afterLine: 1,
        fields: { incidentType: 'Multi-Agency', urgencyLevel: 'CRITICAL', caller: { relationship: 'Bystander', phone: 'unknown', emotionalState: 'panicked' } },
        agentNote: { type: 'ok', text: 'Multi-vehicle accident on Highway 2 \u2014 multi-agency confirmed (96%)' },
      },
      {
        afterLine: 3,
        fields: { location: { address: 'Highway 2 Northbound, near Airport Road Exit', unit: null, landmarks: 'Airport Road interchange' }, hazards: ['Vehicle fire'] },
        agentNote: { type: 'ok', text: 'Location confirmed \u2014 Hwy 2 / Airport Rd corridor (89%)' },
        triggerCad: true,
      },
      {
        afterLine: 5,
        fields: { situation: { chiefComplaint: 'Multi-vehicle accident with vehicle fire and trapped unresponsive occupant', symptoms: ['Unresponsive occupant in burning vehicle', 'Multiple vehicles involved', 'Heavy smoke visible'], timeline: 'Active \u2014 caller witnessing in real-time', priorMedicalInfo: null } },
        agentNote: { type: 'warning', text: 'CRITICAL: Unresponsive occupant in burning vehicle \u2014 immediate rescue required' },
      },
      {
        afterLine: 9,
        fields: { hazards: ['Vehicle fire', 'All northbound lanes blocked', 'Risk of fuel explosion'], recommendedService: 'Fire (Rescue), ALS Ambulance, Police (Traffic)', priorityNotes: 'LIFE THREAT: Person trapped in burning vehicle. Immediate multi-agency response.', estimatedResponseNeeded: 'Fire Engine + ALS Ambulance + Police' },
        agentNote: { type: 'ok', text: 'Extraction complete \u2014 multi-agency routing initiated' },
        triggerRouting: true,
      },
    ],
    call: MOCK_CALL,
    extraction: MOCK_EXTRACTION_RESULT,
    verification: MOCK_HIGH_CONFIDENCE_VERIFICATION,
  },

  {
    id: 'welfare',
    label: 'Welfare Check',
    emoji: '\u2753',
    urgency: 'MODERATE',
    urgencyClass: 'warning',
    description: 'Ambiguous location \xB7 3 flags \xB7 54% confidence',
    mapCoords: [53.5612, -113.4810], // Fifth & Elm area — no GIS match (intentional)
    callerInfo: { phone: '(780) 555-6621', area: 'Central Edmonton', callType: 'Landline' },
    manualSteps: MANUAL_STEPS_POLICE,
    lines: [
      { speaker: 'operator', text: "9-1-1, what\u2019s your emergency?",                                                                                           delay: 0    },
      { speaker: 'caller',   text: "Hi \u2014 I\u2019m calling about my neighbor, Mrs. Patterson. I\u2019m worried about her.",                                    delay: 3000 },
      { speaker: 'operator', text: "What\u2019s the concern?",                                                                                                      delay: 2000 },
      { speaker: 'caller',   text: "She hasn\u2019t picked up her mail in four days. Her car is there but no lights on at night. She\u2019s in her eighties.",      delay: 5000 },
      { speaker: 'operator', text: "Do you have her address?",                                                                                                      delay: 2500 },
      { speaker: 'caller',   text: "She\u2019s on Fifth Street \u2014 I think it\u2019s 5-something, on the corner with Elm? The blue house. I don\u2019t know the exact number.", delay: 6000 },
      { speaker: 'operator', text: "Any sign of distress through the windows?",                                                                                    delay: 2500 },
      { speaker: 'caller',   text: "No, the curtains are drawn. She could be fine or she could be\u2026 I just don\u2019t know.",                                  delay: 5000 },
    ],
    checkpoints: [
      {
        afterLine: 1,
        fields: { incidentType: 'Welfare Check', urgencyLevel: 'MODERATE', caller: { relationship: 'Neighbor', phone: 'on-call', emotionalState: 'concerned' } },
        agentNote: { type: 'ok', text: 'Welfare check for elderly neighbor \u2014 incident type confirmed (92%)' },
      },
      {
        afterLine: 3,
        fields: { situation: { chiefComplaint: 'Elderly female neighbor not seen for 4 days, mail uncollected, no response', symptoms: ['Not seen for 4 days', 'Mail uncollected', 'No lights at night', 'Car present'], timeline: '4 days since last visual contact', priorMedicalInfo: 'Elderly female, approximately 80s' } },
        agentNote: { type: 'ok', text: 'Situation captured \u2014 4 days unresponsive, elderly subject (79%)' },
      },
      {
        afterLine: 5,
        fields: { location: { address: 'Fifth Street & Elm Avenue \u2014 corner property, exact number unknown', unit: null, landmarks: 'Blue house, corner lot at Elm Avenue' } },
        agentNote: { type: 'warning', text: 'FLAGGED: Address unverified \u2014 no exact number available (31% confidence)' },
        triggerCad: true,
      },
      {
        afterLine: 7,
        fields: { hazards: [], recommendedService: 'Police \u2014 Welfare Check', priorityNotes: 'Elderly subject potentially incapacitated. Exact address unconfirmed \u2014 dispatch requires canvassing.', estimatedResponseNeeded: 'Police Unit' },
        agentNote: { type: 'warning', text: 'Low overall confidence (54%) \u2014 address gap requires dispatcher action' },
        triggerRouting: true,
      },
    ],
    call: {
      transcript: `Operator: 9-1-1, what's your emergency?

Caller: Hi — I'm calling about my neighbor, Mrs. Patterson. I'm worried about her.

Operator: What's the concern?

Caller: She hasn't picked up her mail in four days. Her car is there but no lights on at night. She's in her eighties.

Operator: Do you have her address?

Caller: She's on Fifth Street — I think it's 5-something, on the corner with Elm? The blue house. I don't know the exact number.

Operator: Any sign of distress through the windows?

Caller: No, the curtains are drawn. She could be fine or she could be... I just don't know.`,
      metadata: { callTime: '09:14:05', transferDelay: '\u2014', questionsRepeated: 2 },
    },
    extraction: {
      incidentType: 'Welfare Check',
      urgencyLevel: 'MODERATE',
      location: { address: 'Fifth Street & Elm Avenue — corner property, exact number unknown', unit: null, landmarks: 'Blue house, corner lot at Elm Avenue' },
      caller: { relationship: 'Neighbor', phone: 'on-call', emotionalState: 'concerned' },
      situation: {
        chiefComplaint: 'Elderly female neighbor not seen for 4 days, mail uncollected, no response to door',
        symptoms: ['Not seen for 4 days', 'Mail uncollected', 'No lights at night', 'Car present — vehicle not departed'],
        timeline: '4 days since last visual contact with subject',
        priorMedicalInfo: 'Elderly female, approximately 80s',
      },
      hazards: [],
      recommendedService: 'Police — Welfare Check',
      priorityNotes: 'Elderly subject potentially incapacitated. Exact address unconfirmed — dispatch requires canvassing.',
      estimatedResponseNeeded: 'Police Unit',
    },
    verification: {
      degraded: false, overallConfidence: 54, flaggedFields: ['location', 'urgencyLevel', 'timeline'],
      fieldScores: {
        incidentType:       { confidence: 92, note: 'Welfare check clearly stated' },
        urgencyLevel:       { confidence: 44, note: 'FLAGGED: Ambiguous — MODERATE or HIGH without direct distress signal' },
        location:           { confidence: 31, note: 'FLAGGED: No verified address — "blue house on Fifth & Elm" insufficient for dispatch' },
        caller:             { confidence: 88, note: 'Neighbor relationship confirmed' },
        chiefComplaint:     { confidence: 85, note: 'Concern articulated clearly; no direct subject contact' },
        symptoms:           { confidence: 79, note: 'Indirect observations — caller has not entered premises' },
        timeline:           { confidence: 58, note: 'FLAGGED: "4 days" stated but last confirmed contact date uncertain' },
        hazards:            { confidence: 90, note: 'No hazards identified in residential welfare check' },
        recommendedService: { confidence: 82, note: 'Police welfare check appropriate for this scenario' },
        priorityNotes:      { confidence: 61, note: 'Address confirmation needed before dispatch can proceed' },
      },
      verificationSummary: 'Location confidence critically low — exact address must be confirmed before dispatch. Request callback, GPS pin, or cross-reference municipal address database. Urgency classification uncertain without direct subject contact.',
    },
  },

  {
    id: 'gasleak',
    label: 'Gas Leak',
    emoji: '\u26A0\uFE0F',
    urgency: 'HIGH',
    urgencyClass: 'warning',
    description: 'Hazmat \xB7 address not in GIS \xB7 73% confidence',
    mapCoords: [53.5920, -113.4380], // Refinery Road industrial area — no GIS match (intentional)
    callerInfo: { phone: '(780) 555-3892', area: 'Northeast Industrial', callType: 'Wireless' },
    manualSteps: MANUAL_PROCESS_STEPS,
    lines: [
      { speaker: 'operator', text: "9-1-1, what\u2019s your emergency?",                                                                          delay: 0    },
      { speaker: 'caller',   text: "There\u2019s a massive gas smell from the refinery next door! Workers are running out of the building!",       delay: 3500 },
      { speaker: 'operator', text: "What\u2019s your location?",                                                                                   delay: 2000 },
      { speaker: 'caller',   text: "I\u2019m at the industrial park on Refinery Road \u2014 the big gray facility near Gate 23. I don\u2019t know the address.", delay: 5000 },
      { speaker: 'operator', text: "Are there any injuries?",                                                                                      delay: 2000 },
      { speaker: 'caller',   text: "No one\u2019s down yet but there\u2019s a loud hissing sound and it\u2019s getting worse. This place handles propane.", delay: 5000 },
      { speaker: 'operator', text: "Can you see any flames?",                                                                                      delay: 2000 },
      { speaker: 'caller',   text: "No flames yet \u2014 oh god, more people are evacuating now. The smell is overwhelming.",                      delay: 4500 },
      { speaker: 'operator', text: "Get away from the area immediately. Stay on the line.",                                                        delay: 2000 },
      { speaker: 'caller',   text: "I\u2019m backing up, I\u2019m backing up\u2014",                                                              delay: 3000 },
    ],
    checkpoints: [
      {
        afterLine: 1,
        fields: { incidentType: 'Hazmat - Gas Leak', urgencyLevel: 'HIGH', caller: { relationship: 'Bystander', phone: 'on-call', emotionalState: 'alarmed' } },
        agentNote: { type: 'ok', text: 'Hazmat gas leak identified \u2014 industrial facility, active evacuation (94%)' },
      },
      {
        afterLine: 3,
        fields: { location: { address: 'Industrial Park, Refinery Road \u2014 near Gate 23', unit: null, landmarks: 'Large gray industrial facility, Gate 23 marker' } },
        agentNote: { type: 'warning', text: 'FLAGGED: \u201cRefinery Road Gate 23\u201d not geocodable \u2014 exact address required (42%)' },
        triggerCad: true,
      },
      {
        afterLine: 5,
        fields: { situation: { chiefComplaint: 'Propane gas leak at industrial facility \u2014 workers evacuating, strong odour, audible hissing', symptoms: ['Strong gas odour spreading', 'Audible hissing from facility', 'Workers self-evacuating', 'Escalating in real-time'], timeline: 'Active \u2014 situation escalating, evacuation in progress', priorMedicalInfo: null }, hazards: ['Propane gas leak', 'Explosion risk'] },
        agentNote: { type: 'warning', text: 'Propane confirmed \u2014 explosion risk elevated, establish 300m perimeter' },
      },
      {
        afterLine: 9,
        fields: { hazards: ['Propane gas leak', 'Explosion risk', 'Mass-casualty potential', 'Active evacuation'], recommendedService: 'Fire (Hazmat), Police (Perimeter), EMS (Standby)', priorityNotes: 'HAZMAT: Propane facility gas leak. Address unconfirmed. Explosion risk \u2014 establish 300m perimeter.', estimatedResponseNeeded: 'Fire Hazmat + ALS Standby + Police Perimeter' },
        agentNote: { type: 'ok', text: 'Full context captured \u2014 routing with best-known coordinates' },
        triggerRouting: true,
      },
    ],
    call: {
      transcript: `Operator: 9-1-1, what's your emergency?

Caller: There's a massive gas smell from the refinery next door! Workers are running out of the building!

Operator: What's your location?

Caller: I'm at the industrial park on Refinery Road — the big gray facility near Gate 23. I don't know the address.

Operator: Are there any injuries?

Caller: No one's down yet but there's a loud hissing sound and it's getting worse. This place handles propane.

Operator: Can you see any flames?

Caller: No flames yet — oh god, more people are evacuating now. The smell is overwhelming.

Operator: Get away from the area immediately. Stay on the line.

Caller: I'm backing up, I'm backing up—`,
      metadata: { callTime: '11:32:48', transferDelay: '5 min 02 sec', questionsRepeated: 3 },
    },
    extraction: {
      incidentType: 'Hazmat - Gas Leak',
      urgencyLevel: 'HIGH',
      location: { address: 'Industrial Park, Refinery Road — near Gate 23', unit: null, landmarks: 'Large gray industrial facility, Gate 23 marker' },
      caller: { relationship: 'Bystander', phone: 'on-call', emotionalState: 'alarmed' },
      situation: {
        chiefComplaint: 'Propane gas leak at industrial facility — workers evacuating, strong odour, audible hissing',
        symptoms: ['Strong gas odour spreading', 'Audible hissing from facility', 'Workers self-evacuating', 'Escalating in real-time'],
        timeline: 'Active — situation escalating, evacuation in progress',
        priorMedicalInfo: null,
      },
      hazards: ['Propane gas leak', 'Explosion risk', 'Mass-casualty potential', 'Active evacuation'],
      recommendedService: 'Fire (Hazmat), Police (Perimeter), EMS (Standby)',
      priorityNotes: 'HAZMAT: Propane facility gas leak. Address unconfirmed. Explosion risk — establish 300m perimeter.',
      estimatedResponseNeeded: 'Fire Hazmat + ALS Standby + Police Perimeter',
    },
    verification: {
      degraded: false, overallConfidence: 73, flaggedFields: ['location'],
      fieldScores: {
        incidentType:       { confidence: 94, note: 'Hazmat gas leak explicitly stated — propane confirmed' },
        urgencyLevel:       { confidence: 89, note: 'Active evacuation and hissing — HIGH confirmed; escalate if ignition' },
        location:           { confidence: 42, note: 'FLAGGED: "Refinery Road Gate 23" not geocodable — exact address required for hazmat staging' },
        caller:             { confidence: 91, note: 'On-scene bystander with direct visual' },
        chiefComplaint:     { confidence: 96, note: 'Gas leak with evacuation directly observed' },
        symptoms:           { confidence: 93, note: 'Caller directly observing hissing, odour, evacuation' },
        timeline:           { confidence: 97, note: 'Real-time active situation' },
        hazards:            { confidence: 92, note: 'Propane confirmed, explosion risk appropriately flagged' },
        recommendedService: { confidence: 91, note: 'Hazmat + Police perimeter + EMS standby — correct multi-agency response' },
        priorityNotes:      { confidence: 88, note: 'Explosion risk elevated; address gap noted in priority notes' },
      },
      verificationSummary: 'High confidence on incident type and hazards. Location is the critical gap — "Refinery Road Gate 23" could not be geocoded. Deploy with best-known coordinates; confirm address via industrial directory en route.',
    },
  },
];
