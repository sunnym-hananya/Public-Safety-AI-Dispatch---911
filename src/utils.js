// ── Confidence score → colour tokens (4-tier) ────────────────────────────────
// ≥90 green, ≥70 amber, ≥50 orange, <50 red
function getConfidenceStyle(score) {
  if (score >= 90) return { color: '#00d4aa', bg: 'rgba(0,212,170,0.15)',  border: 'rgba(0,212,170,0.3)'  };
  if (score >= 70) return { color: '#ffb84d', bg: 'rgba(255,184,77,0.15)', border: 'rgba(255,184,77,0.3)' };
  if (score >= 50) return { color: '#ff8c42', bg: 'rgba(255,140,66,0.15)', border: 'rgba(255,140,66,0.3)' };
  return                  { color: '#ff4d4d', bg: 'rgba(255,77,77,0.15)',  border: 'rgba(255,77,77,0.3)'  };
}

// ── Strip markdown code fences and parse JSON ─────────────────────────────────
// Claude API responses sometimes wrap JSON in ```json ... ``` blocks.
function parseJSON(text) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  return JSON.parse(clean.trim());
}

// ── Retry with exponential backoff ───────────────────────────────────────────
// maxRetries=1 means one retry after the initial failure (two total attempts).
// baseDelayMs is doubled for each retry: attempt 0 → baseDelayMs, attempt 1 → 2×baseDelayMs.
async function retryWithBackoff(fn, maxRetries, baseDelayMs) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
}

// ── Deep-merge two plain objects (arrays are replaced, not merged) ────────────
// Used by answerCall() to incrementally build partialExtraction from checkpoints.
function deepMerge(target, source) {
  if (!source) return target;
  const result = Object.assign({}, target);
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });
  return result;
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
// Races the supplied promise against a timer. Rejects with a named timeout error
// if the promise does not settle within `ms` milliseconds.
function withTimeout(promise, ms, agentName) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${agentName} timed out after ${ms / 1000}s`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}
