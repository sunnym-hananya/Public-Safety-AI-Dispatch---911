# Quick Start Guide - Demo & Video Recording

## Step 1: Test the Demo Locally (15 minutes)

### Setup
1. Open `index.html` in Chrome or Firefox
2. Get your Anthropic API key:
   - Go to https://console.anthropic.com
   - Sign up (free tier available)
   - Create API key
   - Copy it

3. Paste API key into the demo interface
4. Click "Extract Context with AI"
5. Watch it work!

### What to Check
- ✅ API connection works
- ✅ Context extraction is accurate
- ✅ UI displays all fields correctly
- ✅ Stats and comparisons show properly
- ✅ Loading states work smoothly

### Test with Different Scenarios
- Use the scenarios in `MOCK_SCENARIOS.md`
- Replace the `MOCK_CALL` constant in the HTML
- Verify AI handles different emergency types correctly

---

## Step 2: Prepare for Video Recording (30 minutes)

### Screen Recording Setup

**macOS:**
```bash
# Built-in QuickTime
# Open QuickTime Player > File > New Screen Recording
# Select area or full screen
```

**Windows:**
```bash
# Download OBS Studio (free)
# https://obsproject.com/
# Configure 1080p recording
```

**Any Platform:**
```bash
# Use Loom (free tier)
# https://www.loom.com/
# Browser extension + desktop app
# Easy editing and sharing
```

### Demo Environment Prep
1. **Clean up your desktop**
   - Close unnecessary apps
   - Clear browser tabs
   - Use incognito/private window for clean demo

2. **Test your microphone**
   - Record 10 seconds
   - Check audio levels
   - Ensure no background noise

3. **Practice the flow**
   - Run through demo 2-3 times
   - Smooth transitions between sections
   - Know what you'll say

---

## Step 3: Record Your Demo Video (2-3 minutes)

### Recommended Script Structure

**Opening (0:00-0:20) - The Hook**
```
"I built mission-critical systems for 911 dispatchers handling life-and-death 
situations. The biggest operational bottleneck? Transfer delays and context loss 
when calls move from primary operators to specialist responders."
```

**Problem Demonstration (0:20-0:50)**
```
"Watch what happens in a real emergency call scenario. [Show transcript scrolling]

A caller's husband isn't breathing. The primary operator answers quickly, but 
then the caller waits over 4 minutes to reach EMS dispatch. When EMS finally 
answers, they have zero context - the caller must repeat everything while 
precious seconds tick by."
```

**Solution Demo (0:50-1:30)**
```
"Here's the AI-native solution I built. [Click 'Extract Context with AI']

In 5 seconds, AI analyzes the entire call and extracts structured context. 
[Point to each field as it appears]

Location with unit number. Chief complaint. Symptoms. Timeline. Urgency level. 
Everything the specialist needs to know - instantly.

No 4-minute wait. No repeated questions. The receiving dispatcher has complete 
situational awareness before they even answer."
```

**Human-AI Boundary (1:30-1:50)**
```
"But here's the critical part - [scroll to 'Critical Human Decision' section] 
- the AI provides decision support, NOT decisions. 

The receiving dispatcher reviews this context and confirms before dispatching 
resources. AI handles transcription and extraction. Humans retain authority 
over all life-safety decisions."
```

**Impact & Translation (1:50-2:30)**
```
"The impact: 4 minutes 18 seconds saved per transfer. Zero context loss. 
Operator capacity triples.

And this pattern works beyond emergency services. [Gesture broadly]

Financial services has the same problem - customer calling about fraud, getting 
bounced between teams, repeating their story, losing critical details while 
minutes matter.

Same bottleneck. Same AI-native solution. Tier-1 agent to fraud specialist - 
instant context transfer. AI extracts, humans decide."
```

**Close (2:30-2:45)**
```
"I know how to build systems that help humans make better decisions under 
pressure. I've done it for 911 dispatch. That's exactly what Wealthsimple 
needs for their financial operations."
```

### Recording Tips
- **Speak slowly and clearly**
- **Pause between sections** (easier to edit)
- **Show, don't just tell** (use cursor to point at key elements)
- **Energy and confidence** (you built something real, be proud)
- **Under 3 minutes** (Wealthsimple's requirement)

---

## Step 4: Edit and Finalize (30 minutes)

### Basic Editing
- Trim dead air at start/end
- Cut any mistakes or long pauses
- Add smooth transitions
- Ensure audio is clear throughout

### Free Editing Tools
- **iMovie** (Mac) - built-in, simple
- **DaVinci Resolve** (Windows/Mac/Linux) - professional, free
- **Loom** (Web) - built-in editing in browser

### Export Settings
- Resolution: 1080p (1920x1080)
- Format: MP4
- Frame rate: 30fps
- Audio: Clear voice, no background music needed

---

## Step 5: Upload and Submit

### Video Hosting
**Option 1: YouTube (Unlisted)**
- Upload as "Unlisted" (not public, not private)
- Copy the link
- Anyone with link can view

**Option 2: Vimeo**
- Free account
- Upload video
- Set privacy to "Only people with a link"

**Option 3: Loom**
- Automatically hosts after recording
- Easy sharing link

### Final Submission Checklist

For Wealthsimple, you need:

1. ✅ **Demo video (2-3 minutes)** - Upload to YouTube/Vimeo/Loom, get link
2. ✅ **Written explanation (max 500 words)** - Use `EXPLANATION.md`
3. ✅ **Salary expectation** - Research market rates for AI Builder roles in Toronto
4. ✅ **Years of hands-on AI experience** - Be honest: "6 days intensive building + prior AI-assisted coding experience"

### Where to Submit
- Wealthsimple job portal (check the original posting)
- Deadline: **March 2, 11:59 PM EST**
- Allow time for upload processing

---

## Troubleshooting

### "API key doesn't work"
- Verify you copied the full key (starts with `sk-ant-`)
- Check you have credits in your Anthropic account
- Try in incognito/private browser window

### "AI returns error or weird format"
- The model should return clean JSON
- If it wraps in markdown, the code handles it
- Check browser console for detailed errors

### "Video too long"
- Cut the intro shorter
- Remove pauses between sections
- Speak faster (but stay clear)
- Focus on demo, less on explanation

### "Demo doesn't look polished enough"
- It's a WORKING prototype, not a production app
- Wealthsimple wants to see you can BUILD and SHIP
- Functionality > polish
- Your explanation and domain expertise matter more

---

## Timeline

**Today (Day 1):**
- ✅ Project set up
- Test the demo
- Get API key working
- Practice run-through

**Tomorrow (Day 2-4):**
- Record demo video
- Edit video
- Refine if needed
- Test with mock scenarios

**Day 5-6:**
- Finalize video
- Write any additional notes
- Submit before deadline

---

## You've Got This

You have:
- ✅ A working demo
- ✅ Real PSAP domain knowledge
- ✅ Clear explanation of AI boundaries
- ✅ Translation to financial services

Now go record that video and ship it.

**Remember:** Wealthsimple wants to see BUILDERS who can SHIP under pressure. You just built a working AI system in one day. That's exactly what they're looking for.

Let's get that job. 🚀
