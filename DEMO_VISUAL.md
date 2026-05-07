# 🎬 Visual Demo - How Chrome Extension Works

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHROME BROWSER                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: EXTENSION LOADS                                        │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  1. Go to chrome://extensions                                 │   │
│  │  2. Enable "Developer mode"                                   │   │
│  │  3. Click "Load unpacked"                                     │   │
│  │  4. Select: C:\...\extension                                  │   │
│  │                                                                 │   │
│  │  Result: ✓ Extension installed                                │   │
│  │           ✓ Icon appears in toolbar                           │   │
│  │           ✓ popup.js, content.js, background.js loaded       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: CLICK EXTENSION ICON                                   │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │         🛡️  Sentinel Prime                                      │   │
│  │         Email & Web Threat Guard                               │   │
│  │  ─────────────────────────────────────────────                │   │
│  │  ● Backend API         → ✓ Connected                           │   │
│  │  ● Email Guard         → Active                                │   │
│  │  ● Search Guard        → Active                                │   │
│  │  ─────────────────────────────────────────────                │   │
│  │  [Open Dashboard]                                              │   │
│  │                                                                 │   │
│  │  Result: popup.js checks if API is reachable                  │   │
│  │          → Sends OPTIONS request to localhost:8000            │   │
│  │          → Updates status: "✓ Connected" or "✗ Offline"      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: OPEN GMAIL                                             │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  1. Go to mail.google.com                                      │   │
│  │  2. Open any email                                             │   │
│  │  3. Press F12 → Console                                        │   │
│  │                                                                 │   │
│  │  What happens behind scenes:                                   │   │
│  │                                                                 │   │
│  │  content.js MutationObserver detects:                          │   │
│  │  "New email element added to DOM"                              │   │
│  │          ↓                                                      │   │
│  │  Calls: getAllEmailBodies()                                    │   │
│  │  Finds: .a3s container (Gmail email body)                      │   │
│  │          ↓                                                      │   │
│  │  Extracts: Email text + images                                 │   │
│  │  Calculates: SHA256 fingerprint (avoid duplicates)             │   │
│  │          ↓                                                      │   │
│  │  Calls: scanContent(text, images)                              │   │
│  │  Sends: POST /api/scan to localhost:8000                       │   │
│  │                                                                 │   │
│  │  Console shows:                                                │   │
│  │  [Sentinel] Scanning inbound email...                          │   │
│  │  [Sentinel] Initiating scan for 523 chars and 0 images...      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 4: BACKEND API PROCESSES                                  │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  Your extension sends JSON to:                                 │   │
│  │  http://localhost:8000/api/scan                                │   │
│  │                                                                 │   │
│  │  Request body:                                                 │   │
│  │  {                                                             │   │
│  │    "text": "email body content here..."                       │   │
│  │  }                                                             │   │
│  │          ↓                                                      │   │
│  │  Backend (api_server.py) processes:                            │   │
│  │                                                                 │   │
│  │  1. Parses email text                                          │   │
│  │  2. Loads PyTorch models from GPU/CPU                          │   │
│  │     ├─ steg_detect (steganography detector)                   │   │
│  │     └─ message_decoder (message extraction)                    │   │
│  │  3. Analyzes for threats                                       │   │
│  │  4. Calculates confidence scores                               │   │
│  │  5. Returns JSON response                                      │   │
│  │                                                                 │   │
│  │  Response body:                                                │   │
│  │  {                                                             │   │
│  │    "score": 35,                                                │   │
│  │    "severity": "Medium",                                       │   │
│  │    "reasons": [                                                │   │
│  │      "homoglyph_domain_phishing",                             │   │
│  │      "unusual_character_patterns"                             │   │
│  │    ]                                                           │   │
│  │  }                                                             │   │
│  │          ↓ (Response sent back in <1000ms)                     │   │
│  │  Console shows:                                                │   │
│  │  [Sentinel] API scan complete, received result                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 5: EXTENSION DISPLAYS RESULT                              │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  Content.js receives API response and:                         │   │
│  │                                                                 │   │
│  │  IF score < 30%:                                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ ✓ Email verified clean.                                │   │   │
│  │  │ (Green toast, bottom-right, disappears after 4 sec)   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  IF score 30-70%:                                              │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ ⚠️  SECURITY WARNING                                    │   │   │
│  │  │ Threat Score: 45%                                       │   │   │
│  │  │ Detected: homoglyph_domain_phishing, ...               │   │   │
│  │  │ [Sanitize]                                             │   │   │
│  │  │ (Orange banner above email text)                        │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  IF score > 70%:                                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ 🔴 SECURITY ALERT                                       │   │   │
│  │  │ Threat Score: 85%                                       │   │   │
│  │  │ CRITICAL: High-risk content detected!                  │   │   │
│  │  │ (Red banner, threat meter shows threat level)          │   │   │
│  │  │ [Sanitize]                                             │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  Also calls: publishExtensionEvent()                           │   │
│  │  Sends analytics to: localhost:8000/api/extension-events       │   │
│  │  Logs: timestamp, score, severity, threats, sender, etc.       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STEP 6: TEST COMPOSE/SEND INTERCEPTION (OPTIONAL)              │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  1. Click "Compose" on Gmail                                   │   │
│  │  2. Type email with suspicious content                         │   │
│  │  3. Click "Send" button                                        │   │
│  │                                                                 │   │
│  │  What happens:                                                 │   │
│  │  content.js clicks listener intercepts Send click              │   │
│  │          ↓                                                      │   │
│  │  Prevents: e.preventDefault()                                  │   │
│  │          ↓                                                      │   │
│  │  Calls: performSendScan()                                      │   │
│  │          ↓                                                      │   │
│  │  Shows: Toast "Performing Forensic Scan..."                    │   │
│  │          ↓                                                      │   │
│  │  Sends: POST /api/scan with compose content                    │   │
│  │          ↓                                                      │   │
│  │  Gets: Threat analysis response                                │   │
│  │          ↓                                                      │   │
│  │  Shows: Threat meter with score                                │   │
│  │          ↓                                                      │   │
│  │  Decision:                                                     │   │
│  │  ├─ Score > 85%:  BLOCKED! "Send blocked!"                   │   │
│  │  ├─ Score 55-85%: ALLOWED! "Warning: Suspicious..."           │   │
│  │  └─ Score < 55%:  ALLOWED! "Email verified clean."            │   │
│  │          ↓                                                      │   │
│  │  If allowed:                                                   │   │
│  │  • Waits 500ms                                                 │   │
│  │  • Actually sends email                                        │   │
│  │  • Sets sendInProgress = true (prevent double-send)            │   │
│  │          ↓                                                      │   │
│  │  Email sent! ✓                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  BONUS: SEARCH RESULTS SCANNING                                 │   │
│  │  ════════════════════════════════════════════════════════════   │   │
│  │                                                                 │   │
│  │  If user visits Google/Bing/Yahoo search:                      │   │
│  │          ↓                                                      │   │
│  │  search-guard.js loads (injected by manifest)                  │   │
│  │          ↓                                                      │   │
│  │  Scans all search result links for:                            │   │
│  │  • Phishing URLs                                               │   │
│  │  • Malicious domains                                           │   │
│  │  • Suspicious patterns                                         │   │
│  │          ↓                                                      │   │
│  │  Marks suspicious results with warning badge                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (localhost:8000)                        │
│                                                                         │
│  uvicorn api_server:app --host 127.0.0.1 --port 8000                   │
│  ════════════════════════════════════════════════════════════           │
│                                                                         │
│  [Invisify2 DL API] {                                                   │
│    'status': 'ready',                                                   │
│    'device': 'cpu',                                                     │
│    'loaded': ['steg_detect', 'message_decoder']                        │
│  }                                                                       │
│                                                                         │
│  Listens on http://127.0.0.1:8000                                       │
│  ✓ POST /api/scan - Text/image scanning                                 │
│  ✓ POST /api/extension-events - Event logging                          │
│  ✓ GET /docs - Swagger documentation                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Real Example: Email with Homoglyph

```
USER OPENS EMAIL:
┌──────────────────────────────────────────────────────┐
│ From: support@amazon.com                            │
│ Subject: Verify Your Account                        │
│                                                       │
│ Dear Customer,                                       │
│                                                       │
│ Your account was flagged for suspicious activity.   │
│ Click here: https://amа́zon-account-verify.com      │
│            (Note: 'а́' is Cyrillic 'a', not ASCII) │
│                                                       │
│ Thanks,                                              │
│ Amazon Security Team                                 │
└──────────────────────────────────────────────────────┘

↓ Extension detects this

CONSOLE LOGS:
[Sentinel] Scanning inbound email... (Text: 285 chars, Images: 0)
[Sentinel] Initiating scan for 285 chars and 0 images...

↓ Sends to API

API ANALYSIS:
Input: "Your account was flagged... amа́zon-account-verify.com"

Detects:
✓ Homoglyph domain: 'amа́zon' (uses Cyrillic 'а́' instead of 'a')
✓ Homoglyph pattern: URL looks like amazon.com but isn't
✓ Phishing indicators: Account verification + verify link pattern

RESPONSE:
{
  "score": 78,
  "severity": "High",
  "reasons": [
    "homoglyph_domain_phishing",
    "suspicious_link_pattern",
    "account_verification_phishing"
  ]
}

↓ Extension displays warning

RESULT SHOWN TO USER:
┌────────────────────────────────────────────┐
│ 🔴 SECURITY WARNING                        │
├────────────────────────────────────────────┤
│ Threat Score: 78%                          │
│ Detected Threats:                          │
│ • homoglyph_domain_phishing                │
│ • suspicious_link_pattern                  │
│ • account_verification_phishing            │
├────────────────────────────────────────────┤
│ [Sanitize]  [Learn More]                   │
└────────────────────────────────────────────┘
```

---

## ⏱️ Timing Breakdown

```
User opens email on Gmail
↓ (0ms)

content.js MutationObserver fires
↓ (0-50ms)

Extracts email text + images
↓ (50-100ms)

Sends POST /api/scan to localhost:8000
↓ (100-200ms) ← Network latency

Backend loads models (first time only)
↓ (200-2000ms) ← Model inference

Backend returns JSON response
↓ (2000-2500ms) ← Back to extension

Extension displays result
↓ (2500-3000ms)

User sees threat meter/warning
✓ Done in ~3 seconds
```

---

## 🎯 Success Criteria

✅ Extension loaded without errors  
✅ Popup shows "✓ Connected"  
✅ Console shows `[Sentinel]` logs within 3 seconds  
✅ Threat meter/toast appears  
✅ Visual warning matches threat level  
✅ Send interception works  

**Demo complete!** 🎉
