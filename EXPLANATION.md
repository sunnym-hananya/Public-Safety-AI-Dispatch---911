# PSAP Context Transfer AI System - Submission Explanation

## What Humans Can Now Do That They Couldn't Before

Emergency dispatchers can now **instantly transfer calls to specialists with complete context**, eliminating 4+ minute delays and repeated questioning. Before this system, primary 911 operators had to stay on the line while callers waited for specialists, occupying critical capacity. Receiving dispatchers started from zero—asking the same questions again while patients deteriorated.

With AI-native context transfer, specialists see structured packets before answering: exact location, chief complaint, symptoms, timeline, hazards, and caller emotional state. A cardiac arrest call that previously took 4+ minutes to transfer now happens in seconds. The primary operator is freed immediately. The specialist starts informed. Most critically: **no information is lost in handoff**.

This transforms dispatcher capability from sequential bottleneck to parallel processing. One operator can handle 3x more transfers because they're not trapped on hold. Specialists can triage before even picking up—preparing appropriate response resources while the transfer connects.

## What AI Is Responsible For

The AI system owns **real-time transcription, structured extraction, and handoff packaging**—the clerical cognitive load that drowns emergency operators under time pressure.

Specifically, AI:
- Transcribes conversations as they happen, converting speech to searchable text
- Extracts structured data: incident type, urgency level, precise location, symptoms, timeline
- Flags hazards and safety concerns mentioned during the call
- Classifies which specialist service should receive the transfer (EMS/Fire/Police/Multi-Agency)
- Generates a complete "context packet" formatted for instant dispatcher comprehension
- Routes the transfer to the appropriate queue with attached context

The AI handles what computers do best: perfect recall, instant synthesis across multiple data points, consistent formatting, and zero transcription errors. It performs these tasks **faster than any human** while maintaining **higher accuracy** on structured data extraction.

## Where AI Must Stop - The Critical Human Decision

**AI provides decision support. Humans retain authority over all resource allocation and life-safety actions.**

The receiving dispatcher MUST review the AI-generated context packet and confirm its accuracy before proceeding with dispatch. AI can extract "cardiac arrest, 5 minutes down, prior chest pain" from conversation—but a human dispatcher decides whether to send ALS ambulance, fire first-response, and police escort based on situational factors AI cannot fully grasp: neighborhood characteristics, current resource availability, recent similar calls, subtle caller cues beyond transcription.

In ambiguous cases—unclear urgency signals, contradictory information, novel situations—AI flags for full human review rather than attempting classification. The system operates as "assistive automation": AI handles structured extraction so humans can focus on judgment calls. Every dispatch decision requires human confirmation. AI cannot freeze resources, commit units, or advise medical interventions.

This boundary is non-negotiable: AI accelerates information flow but never replaces human accountability in life-safety decisions.

## What Breaks First At Scale

**Transcription accuracy in extreme audio conditions.** Emergency calls include screaming, crying, background sirens, overlapping speech, and heavy accents. When AI confidence scores drop below threshold (currently 85%), the system auto-flags for human verification. Testing with 1000+ calls would reveal where noisy environments cause critical extraction failures—likely in multi-person chaotic scenes or when callers are non-verbal due to trauma.

**Misclassification of novel emergencies.** AI trained on historical call patterns might misroute unprecedented situations—active threats using new tactics, emerging medical conditions, infrastructure failures AI hasn't seen. The failure mode: routing delay while human operators manually reclassify. Mitigation: conservative escalation defaults and explicit "uncertain" classification that triggers immediate human review.

**Integration brittleness with legacy CAD systems.** PSAPs run aging computer-aided dispatch platforms with proprietary interfaces. API failures or CAD version updates could break automated field population, forcing fallback to manual data entry. Scale testing would surface timeout issues when CAD systems can't keep pace with AI-generated transfer volume during surge events.

---
