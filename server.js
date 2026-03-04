const http = require('http');
const https = require('https');
const { cadLookup } = require('./data');

const PORT = 3000;

// Shared helper: wraps an Anthropic API call in a Promise
function callAnthropic(apiKey, messages, maxTokens = 1500) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            messages,
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Agent 1 prompt: extract structured context from transcript
function buildExtractPrompt(transcript) {
    return `You are Agent 1 in a multi-agent emergency dispatch system. Your role is to extract structured context from a 911 call transcript to eliminate transfer delays and repeated questioning.

Analyze this call transcript carefully:

${transcript}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
    "incidentType": "string (Medical/Fire/Police/Multi-Agency)",
    "urgencyLevel": "string (CRITICAL/HIGH/MEDIUM)",
    "location": {
        "address": "string",
        "unit": "string or null",
        "landmarks": "string or null"
    },
    "caller": {
        "relationship": "string",
        "phone": "string or unknown",
        "emotionalState": "string"
    },
    "situation": {
        "chiefComplaint": "string (primary issue)",
        "symptoms": ["array of strings"],
        "timeline": "string (when it started)",
        "priorMedicalInfo": "string or null"
    },
    "hazards": ["array of strings or empty"],
    "recommendedService": "string (which specialist team)",
    "priorityNotes": "string (critical info for receiving dispatcher)",
    "estimatedResponseNeeded": "string (e.g. 'ALS Ambulance + Police')"
}`;
}

// Agent 2 prompt: verify Agent 1's extraction and assign confidence scores
function buildVerifyPrompt(transcript, extraction) {
    return `You are Agent 2 in a multi-agent emergency dispatch system. Agent 1 has extracted structured context from a 911 call transcript. Your job is to critically review that extraction against the original transcript and assign confidence scores.

Confidence scale:
- 90-100: Explicitly stated in transcript, high certainty
- 70-89: Reasonably inferred, minor ambiguity
- 50-69: Partially supported, significant uncertainty
- 0-49: Speculative or contradicted by transcript

Original 911 call transcript:
${transcript}

Agent 1's extraction:
${JSON.stringify(extraction, null, 2)}

Evaluate each field. Be critical — flag anything the transcript does not clearly support.

Return ONLY a JSON object (no markdown, no explanation):
{
    "fieldScores": {
        "incidentType": { "confidence": 0-100, "note": "brief reason" },
        "urgencyLevel": { "confidence": 0-100, "note": "brief reason" },
        "location": { "confidence": 0-100, "note": "brief reason" },
        "caller": { "confidence": 0-100, "note": "brief reason" },
        "chiefComplaint": { "confidence": 0-100, "note": "brief reason" },
        "symptoms": { "confidence": 0-100, "note": "brief reason" },
        "timeline": { "confidence": 0-100, "note": "brief reason" },
        "hazards": { "confidence": 0-100, "note": "brief reason" },
        "recommendedService": { "confidence": 0-100, "note": "brief reason" },
        "priorityNotes": { "confidence": 0-100, "note": "brief reason" }
    },
    "overallConfidence": 0-100,
    "flaggedFields": ["list of field names where confidence < 80"],
    "verificationSummary": "2-3 sentence assessment of data quality, key uncertainties, and recommended dispatcher actions"
}`;
}

// ── Agent 4: Routing Engine (deterministic, no AI) ───────────────────────────

// Straight-line distance between two lat/lng points in km (Haversine formula).
function haversine(lat1, lng1, lat2, lng2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2
               + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
               * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Unit types required for each incident category.
const ROUTING_UNIT_MAP = {
    'Medical':      ['Ambulance'],
    'Fire':         ['Fire', 'Ambulance'],
    'Police':       ['Police'],
    'Multi-Agency': ['Police', 'Fire', 'Ambulance'],
};

function buildRouting({ extraction, verification, cadData }) {
    // ── Incident priority score ───────────────────────────────────────────────
    const urgencyBase = ({ CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 })[extraction.urgencyLevel] ?? 50;

    const overallConf      = verification?.overallConfidence ?? 100;
    const confPenalty      = overallConf < 80 ? -10 : 0;
    const addressPenalty   = cadData.addressValid ? 0 : -20;
    const pastIncBonus     = (cadData.pastIncidents?.length || 0) > 0 ? 5 : 0;
    const totalPriority    = urgencyBase + confPenalty + addressPenalty + pastIncBonus;

    const scoreBreakdown = [
        { factor: 'Urgency Level',      points: urgencyBase,    note: extraction.urgencyLevel                                   },
        { factor: 'Confidence',         points: confPenalty,    note: confPenalty ? `<80% penalty` : 'No penalty'              },
        { factor: 'Address Validation', points: addressPenalty, note: cadData.addressValid ? 'Verified' : 'Unverified (penalty)' },
        { factor: 'Location History',   points: pastIncBonus,   note: `${cadData.pastIncidents?.length || 0} recent incident(s)` },
    ];

    // ── Incident location ─────────────────────────────────────────────────────
    const incidentLat = cadData.addressDetails?.lat ?? 53.5798;
    const incidentLng = cadData.addressDetails?.lng ?? -113.5102;

    // ── Required unit types ───────────────────────────────────────────────────
    const neededTypes = ROUTING_UNIT_MAP[extraction.incidentType] || ['Police'];

    // ── Score every non-busy unit ─────────────────────────────────────────────
    const scoredUnits = (cadData.availableUnits || [])
        .filter((u) => u.status !== 'Busy')
        .map((u) => {
            const dist           = parseFloat(haversine(incidentLat, incidentLng, u.lat, u.lng).toFixed(2));
            const proximityScore = Math.max(0, 100 - dist * 15);          // drops ~15 pts/km
            const availBonus     = u.status === 'Available' ? 15 : 0;
            const typeBonus      = neededTypes.includes(u.type) ? 20 : 0;
            const score          = Math.round(proximityScore * 0.5 + availBonus * 0.3 + typeBonus * 0.2);

            const reasonParts = [];
            if (neededTypes.includes(u.type))   reasonParts.push(`type match (${u.type} for ${extraction.incidentType})`);
            if (u.status === 'Available')        reasonParts.push('currently available');
            else                                 reasonParts.push('en route (reallocable)');
            reasonParts.push(`${dist.toFixed(1)} km from scene`);
            if (u.eta)                           reasonParts.push(`~${u.eta} min ETA`);
            if (u.capabilities?.includes('ALS') && extraction.urgencyLevel === 'CRITICAL')
                reasonParts.push('ALS capability matches critical urgency');

            return {
                unitId:       u.id,
                unitType:     u.type,
                status:       u.status,
                location:     u.location,
                eta:          u.eta,
                distance:     dist,
                score,
                capabilities: u.capabilities || [],
                reasoning:    reasonParts.join('; '),
                lat:          u.lat,
                lng:          u.lng,
            };
        })
        .sort((a, b) => b.score - a.score);

    // ── Select recommendations ────────────────────────────────────────────────
    const primary = scoredUnits.find((u) => neededTypes.includes(u.unitType) && u.status === 'Available')
                 ?? scoredUnits.find((u) => neededTypes.includes(u.unitType))
                 ?? scoredUnits[0]
                 ?? null;

    const backup = scoredUnits.find((u) => neededTypes.includes(u.unitType) && u.unitId !== primary?.unitId)
                ?? null;

    // One best unit per required type (excluding the primary to avoid duplication).
    const multiUnit = neededTypes.map((type) =>
        scoredUnits.find((u) => u.unitType === type && u.unitId !== primary?.unitId)
    ).filter(Boolean);

    // ── Human-in-loop flags ───────────────────────────────────────────────────
    const flags = [];

    if (!cadData.addressValid) {
        flags.push({ severity: 'danger', message: 'Address not in GIS database — confirm location before dispatching units' });
    }
    if (overallConf < 70) {
        flags.push({ severity: 'danger', message: `Overall extraction confidence ${overallConf}% — verify all fields with caller before dispatch` });
    }

    const criticalFields = ['incidentType', 'urgencyLevel', 'location'];
    criticalFields.forEach((field) => {
        const conf = verification?.fieldScores?.[field]?.confidence;
        if (conf !== undefined && conf < 70) {
            flags.push({ severity: 'warning', message: `Low confidence on "${field}" (${conf}%) — confirm with caller before dispatch` });
        }
    });

    const availCount = (cadData.availableUnits || []).filter(
        (u) => u.status === 'Available' && neededTypes.includes(u.type)
    ).length;
    if (availCount === 0) {
        flags.push({ severity: 'danger', message: 'No units of required type available — request mutual aid immediately' });
    }
    if (primary?.eta > 15) {
        flags.push({ severity: 'warning', message: `Nearest unit ETA ${primary.eta} min exceeds 15-min threshold — consider mutual aid` });
    }

    const escalationRequired = flags.some((f) => f.severity === 'danger');

    // ── Decision path (for visualization) ────────────────────────────────────
    const decisionPath = [
        {
            step:   'Incident Classification',
            result: `${extraction.incidentType} / ${extraction.urgencyLevel}`,
            detail: `Mapped to required unit type(s): ${neededTypes.join(', ')}`,
            ok:     true,
        },
        {
            step:   'Confidence Check',
            result: `${overallConf}% overall`,
            detail: confPenalty ? `Penalty applied (${confPenalty} pts) — below 80% threshold` : 'Confidence acceptable — no penalty',
            ok:     overallConf >= 80,
        },
        {
            step:   'Location Validation',
            result: cadData.addressValid ? 'Address verified in GIS' : 'Address NOT verified',
            detail: cadData.addressValid
                ? `${cadData.addressDetails?.address} — coordinates confirmed`
                : 'Manual verification required before units are dispatched',
            ok:     cadData.addressValid,
        },
        {
            step:   'Unit Availability',
            result: `${availCount} matching unit${availCount !== 1 ? 's' : ''} available`,
            detail: `Filtered ${(cadData.availableUnits || []).length} units by type (${neededTypes.join('/')}), excluded Busy status`,
            ok:     availCount > 0,
        },
        {
            step:   'Proximity Ranking',
            result: primary ? `${primary.unitId} selected — ${primary.distance} km away` : 'No suitable unit found',
            detail: primary ? `Score: ${primary.score}/100 — ${primary.reasoning}` : 'Escalation required',
            ok:     !!primary,
        },
    ];

    return { totalPriority, scoreBreakdown, primary, backup, multiUnit, decisionPath, flags, escalationRequired };
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
        try {
            const parsed = JSON.parse(body);
            const { apiKey } = parsed;

            if (!apiKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API key required' }));
                return;
            }

            // Agent 1: extract context from transcript
            if (req.method === 'POST' && req.url === '/extract') {
                const { transcript } = parsed;
                const result = await callAnthropic(apiKey, [
                    { role: 'user', content: buildExtractPrompt(transcript) }
                ]);
                res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
                res.end(result.body);

            // Agent 2: verify extraction and score confidence
            } else if (req.method === 'POST' && req.url === '/verify') {
                const { transcript, extraction } = parsed;
                const result = await callAnthropic(apiKey, [
                    { role: 'user', content: buildVerifyPrompt(transcript, extraction) }
                ], 2000);
                res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
                res.end(result.body);

            // Agent 3: CAD lookup (pure database queries, no AI)
            } else if (req.method === 'POST' && req.url === '/cad-lookup') {
                const { extraction } = parsed;
                const result = cadLookup(extraction);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));

            // Agent 4: Routing engine (pure algorithmic scoring, no AI)
            } else if (req.method === 'POST' && req.url === '/routing') {
                const { extraction, verification, cadData } = parsed;
                const result = buildRouting({ extraction, verification, cadData });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));

            // Legacy single-call endpoint (kept for backward compatibility)
            } else if (req.method === 'POST' && req.url === '/analyze') {
                const { transcript } = parsed;
                const result = await callAnthropic(apiKey, [
                    { role: 'user', content: buildExtractPrompt(transcript) }
                ]);
                res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
                res.end(result.body);

            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }

        } catch (error) {
            console.error('Server error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server error: ' + error.message }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
    console.log(`  POST /extract     — Agent 1: extract context from transcript`);
    console.log(`  POST /verify      — Agent 2: verify extraction, score confidence`);
    console.log(`  POST /cad-lookup  — Agent 3: query CAD databases (no AI)`);
    console.log(`  POST /routing     — Agent 4: routing engine, rank units (no AI)`);
    console.log(`  POST /analyze     — Legacy single-call endpoint`);
});
