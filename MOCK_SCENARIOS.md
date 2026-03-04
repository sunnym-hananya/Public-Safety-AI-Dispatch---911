# Additional Mock Call Scenarios

These scenarios can be used to test the AI system's ability to extract context across different emergency types.

## Scenario 2: Multi-Vehicle Accident

```
Operator: 911, what's your emergency?

Caller: There's been a huge accident on Highway 2 northbound near the Airport Road exit!

Operator: Are you injured?

Caller: No, I'm okay, but there are at least 3 cars involved. One is on fire!

Operator: Okay, stay back from the vehicles. Can you see if anyone is trapped?

Caller: I can see someone in the burning car, they're not moving. There's smoke everywhere.

Operator: How many lanes are blocked?

Caller: All of them. Traffic is completely stopped.

Operator: Okay, I'm getting fire and EMS on the way. Stay on the line.
```

**Expected Extractions:**
- Incident Type: Multi-Agency (Fire + EMS + Police)
- Urgency: CRITICAL
- Location: Highway 2 northbound, Airport Road exit
- Hazards: Active fire, potential trapped victims, blocked roadway
- Recommended: Fire suppression, multiple EMS units, police for traffic control

---

## Scenario 3: Domestic Disturbance - Silent Caller

```
Operator: 911, what's your emergency?

[Silence, background noise of shouting]

Operator: Hello? Can you hear me? If you can't speak, press 1 for police, 2 for fire, 3 for medical.

[Tone: beep]

Operator: Okay, you need police. Are you in danger right now? Press 1 for yes.

[Tone: beep]

Operator: Can you tell me your address without alerting anyone?

Caller: [Whispers] 456 Oak Street, basement apartment.

Operator: Is anyone armed?

Caller: [Whispers] I don't know... he's really angry... [call disconnects]

[Callback attempted - no answer]
```

**Expected Extractions:**
- Incident Type: Police - Domestic Disturbance
- Urgency: HIGH
- Location: 456 Oak Street, basement apartment
- Caller: Unable to speak freely, potentially in immediate danger
- Hazards: Possible weapon, caller safety compromised
- Priority Notes: Silent approach required, welfare check, caller disconnected and unreachable

---

## Scenario 4: Elderly Fall - Medical Priority

```
Operator: 911, what's your emergency?

Caller: My mother has fallen and I can't get her up. She's 87 years old.

Operator: Is she conscious?

Caller: Yes, she's talking to me, but she says her hip hurts really badly.

Operator: Did she hit her head when she fell?

Caller: I don't think so. She's on blood thinners though - warfarin.

Operator: Okay, that's important. What's your address?

Caller: 892 Elm Street, we're in the upstairs bedroom.

Operator: Can you reach her medication list?

Caller: Yes, hold on... She's on warfarin, metoprolol, and lisinopril.

Operator: Don't try to move her. EMS is on the way.
```

**Expected Extractions:**
- Incident Type: Medical - Fall with injury
- Urgency: MEDIUM
- Location: 892 Elm Street, upstairs bedroom
- Patient: 87-year-old female, conscious
- Symptoms: Hip pain from fall, on anticoagulants
- Medical History: Warfarin (bleeding risk), cardiac meds
- Priority Notes: Possible hip fracture, high bleeding risk, access challenge (upstairs)

---

## Scenario 5: Mental Health Crisis

```
Operator: 911, what's your emergency?

Caller: My brother is threatening to hurt himself. He has a gun!

Operator: Where are you right now?

Caller: We're at 234 Pine Avenue, apartment 12. He locked himself in the bathroom.

Operator: Has he made specific threats?

Caller: Yes, he said he's going to end it. He's been drinking and he lost his job yesterday.

Operator: Is anyone else in the apartment?

Caller: Just me and my mom. She's really scared.

Operator: Okay, I need you and your mom to leave the apartment safely if you can. Police and crisis team are on their way. Has he been diagnosed with any mental health conditions?

Caller: Yes, he has depression and PTSD. He's a veteran.

Operator: That's helpful information. Leave the apartment now and meet officers outside.
```

**Expected Extractions:**
- Incident Type: Police + Mental Health Crisis Team
- Urgency: CRITICAL
- Location: 234 Pine Avenue, apartment 12
- Situation: Armed suicidal subject, barricaded in bathroom
- Hazards: Firearm present, alcohol involved, acute distress
- Context: Recent job loss (trigger), military veteran with PTSD/depression
- Caller: Family members on scene (brother, mother)
- Priority Notes: Crisis negotiation team required, veteran-sensitive approach, family safe outside

---

## Testing Instructions

1. Replace the `MOCK_CALL` constant in `index.html` with any of these scenarios
2. Run the analysis to see how AI extracts different emergency types
3. Verify that urgency levels, routing recommendations, and safety flags are appropriate
4. Use these for your demo video to show versatility

## Evaluation Criteria

Good AI extraction should:
- ✅ Correctly identify incident type and recommended service
- ✅ Capture all critical safety information (weapons, fire, hazards)
- ✅ Extract precise location including unit/floor details
- ✅ Note relevant medical history or situational context
- ✅ Flag appropriate urgency level based on life threat
- ✅ Identify when human judgment is especially critical (ambiguous situations)
