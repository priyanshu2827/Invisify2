# 📁 Extension Architecture & File Guide

## File Structure

```
extension/
├── manifest.json          ← Chrome extension config & permissions
├── background.js          ← Service worker (backend operations)
├── content.js             ← Content script (Gmail page interaction)
├── popup.html             ← Extension popup UI
├── popup.js               ← Popup logic & status checking
├── content.css            ← Email warning styles
├── search-guard.js        ← Search results scanning
└── icons/                 ← App icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔧 What Each File Does

### **1️⃣ manifest.json** (Configuration)

```json
{
  "manifest_version": 3,
  "name": "Sentinel Prime: Email Guard",
  "version": "0.2.0",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://mail.google.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    { "matches": ["https://mail.google.com/*"], "js": ["content.js"] }
  ]
}
```

**What it does:**
- Tells Chrome what the extension is called
- Declares what permissions the extension needs
- Specifies which files run where
- Tells Chrome: "This extension works on mail.google.com"

**Updated for this demo:**
- ✅ Port changed from 3000 → 8000
- ✅ Host permissions updated

---

### **2️⃣ background.js** (Service Worker)

**Role:** Backend operations (runs in background, handles cross-site requests)

**Key Functions:**
```javascript
chrome.runtime.onMessage.addListener()
  ├─ 'fetch_image'    → Fetch images from Gmail (bypass CORS)
  ├─ 'scan_url'       → Scan URLs for phishing
  └─ 'check_backend'  → Check if API is running

handleImageFetch(url)
  → Fetches image from Gmail using credentials

checkBackend()
  → Sends OPTIONS request to http://localhost:8000/api/scan
  → Returns: { online: true/false }
```

**Example Flow:**
```
content.js can't fetch image from Gmail (CORS blocked)
  ↓
Sends message: { action: 'fetch_image', url: '...' }
  ↓
background.js receives message
  ↓
Fetches image (has permission)
  ↓
Converts to data URL
  ↓
Sends back to content.js
  ↓
content.js scans image with API
```

---

### **3️⃣ content.js** (Main Detection Engine) 🎯

**Role:** Directly interacts with Gmail page, scans emails

**Lines:** 926 lines of detection logic

**Key Functions:**

#### A. Email Detection
```javascript
getAllEmailBodies()
  └─ Uses CSS selectors: .a3s, .a3s.aiL, [role="region"] .a3s, etc.
  └─ Returns: All email body elements currently visible

scanInboundEmail(emailBody)
  ├─ Extracts text from email
  ├─ Extracts images (up to 5)
  ├─ Sends to API: POST /api/scan
  ├─ Displays results (threat meter, warning banner)
  └─ Publishes event: POST /api/extension-events
```

#### B. Local Forensics (if API down)
```javascript
localForensicScan(text)
  ├─ calculateEntropy()         → Detects random/compressed text
  ├─ detectBase64Exfiltration() → Base64 encoded payloads
  ├─ detectHomoglyphDomains()   → Domain spoofing (paypa1.com)
  ├─ detectHomoglyphText()      → Character lookalikes (а=a)
  ├─ detectZeroWidth()          → Invisible characters
  ├─ detectEmojiEncoding()      → Emoji-based steganography
  └─ detectBidiAttack()         → Text direction override attacks

Returns: { score: 0-100, severity: 'Safe'/'Low'/'Medium'/'High'/'Critical' }
```

#### C. Send Interception
```javascript
document.addEventListener('click', (e) => {
  if (Send button clicked) {
    e.preventDefault()           → Block the send
    performSendScan()           → Scan email before sending
    if (allowed) {
      target.click()            → Actually send
    } else {
      alert('Send blocked!')    → Show error
    }
  }
})
```

#### D. UI Components
```javascript
injectToast(message)
  → Shows notification (bottom-right)
  → "Email verified clean." or "Warning: Suspicious..."
  
showThreatScoreMeter(result)
  → Shows threat analysis (top-right)
  → Displays: Score, threats, severity

injectInboundWarning(emailBody, result)
  → Shows warning banner above email text
  → "SECURITY ALERT" or "SECURITY WARNING"
  → [Sanitize] button to clean text
```

**API Integration:**
```javascript
scanContent(text, images) → POST http://localhost:8000/api/scan
  ├─ Sends FormData if images present
  ├─ Sends JSON if text only
  ├─ Times out after 15 seconds
  └─ Falls back to local forensics if failed
```

---

### **4️⃣ popup.html** (UI Template)

```html
<div class="header">
  <h1>Sentinel Prime</h1>
  <div class="subtitle">Email & Web Threat Guard</div>
</div>

<div class="status-card">
  <div class="status-row">
    Backend API → <span id="backendStatus">Checking...</span>
  </div>
  <div class="status-row">
    Email Guard → Active
  </div>
</div>

<button id="checkNow">Open Dashboard</button>

<div class="features">
  ✓ Steganography detection
  ✓ Homoglyph & IDN protection
  ✓ Real-time threat intel
  ...
</div>
```

**Visual:**
```
┌──────────────────────────────┐
│   🛡️  Sentinel Prime         │
│  Email & Web Threat Guard    │
├──────────────────────────────┤
│ ● Backend API  → ✓ Connected │
│ ● Email Guard  → Active      │
│ ● Search Guard → Active      │
├──────────────────────────────┤
│  [Open Dashboard]            │
├──────────────────────────────┤
│ ✓ Steganography detection    │
│ ✓ Homoglyph protection       │
│ ...                          │
└──────────────────────────────┘
```

---

### **5️⃣ popup.js** (Popup Logic)

```javascript
document.getElementById('checkNow').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:8000/docs' });
  // Opens Swagger API docs in new tab
});

async function checkBackendStatus() {
  const response = await fetch('http://localhost:8000/api/scan', {
    method: 'OPTIONS'
  });
  
  if (response.ok) {
    document.getElementById('backendStatus').innerText = '✓ Connected';
    document.getElementById('backendDot').className = 'status-dot dot-online';
  } else {
    document.getElementById('backendStatus').innerText = '✗ Offline';
    document.getElementById('backendDot').className = 'status-dot dot-offline';
  }
}

checkBackendStatus();
```

**What it does:**
- Checks if API is reachable
- Updates popup to show "Connected" (green) or "Offline" (red)
- "Open Dashboard" button opens API documentation

---

### **6️⃣ content.css** (Styling)

```css
.sentinel-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #0369a1;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 10000;
}

.sentinel-inbound-warning {
  background: #fef2f2;         /* Light red */
  border-left: 4px solid #ef4444;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 4px;
  color: #991b1b;              /* Dark red text */
}

.sentinel-meter {
  position: fixed;
  top: 80px;
  right: 20px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  z-index: 10001;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

**Applied to:**
- Threat meter (shows score bar)
- Warning banner (appears above email)
- Toast notifications (slide in from bottom)

---

### **7️⃣ search-guard.js** (Search Results Scanning)

```javascript
// Injected on: Google, Bing, Yahoo, DuckDuckGo, Ecosia, StartPage

document.querySelectorAll('a[href*="http"]').forEach((link) => {
  // Scan each link URL
  scanUrl(link.href)
  
  if (suspicious) {
    // Add warning badge to result
    link.style.border = '2px solid red';
    link.title = 'Warning: Suspicious URL';
  }
});
```

**What it does:**
- Scans all search result links
- Marks suspicious ones with visual indicator
- Prevents phishing clicks on search pages

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User opens Gmail email                                          │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ content.js MutationObserver detects new email element           │
│ • Finds: .a3s container                                         │
│ • Extracts: text, images                                        │
│ • Calculates: SHA256 fingerprint (avoid duplicates)            │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ scanContent() sends POST to localhost:8000/api/scan             │
│ Request: { text: "...", image: [File] }                        │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼ (Network Request)
┌──────────────────────────────────────────────────────────────────┐
│ api_server.py receives and processes                            │
│ • Loads PyTorch models                                          │
│ • Analyzes content                                              │
│ • Returns: { score: 35, severity: 'Medium', reasons: [...] }  │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼ (Response)
┌──────────────────────────────────────────────────────────────────┐
│ content.js receives result                                      │
│ • Score < 30: Show green toast "Email verified clean"          │
│ • Score 30-70: Show orange warning banner above email          │
│ • Score > 70: Show red alert banner above email                │
│ • Call publishExtensionEvent() to log to API                   │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ User sees: Threat meter + Toast + Warning banner               │
│ (All within 2-3 seconds)                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Extension Lifecycle

```
1. INSTALL
   chrome://extensions → Load unpacked → Select extension/ folder
   ✓ manifest.json loaded
   ✓ Icons registered
   ✓ Permissions requested

2. ACTIVATE
   User navigates to mail.google.com
   ✓ content.js injected into page
   ✓ background.js service worker starts
   ✓ MutationObserver begins monitoring for emails

3. DETECT EMAIL
   User opens an email
   ✓ MutationObserver fires
   ✓ getAllEmailBodies() finds email
   ✓ scanInboundEmail() triggers
   ✓ POST /api/scan sent

4. RECEIVE RESULT
   API responds with threat analysis
   ✓ Result displayed as toast/banner/meter
   ✓ Event published to API

5. USER ACTION
   User clicks Send or Sanitize button
   ✓ Send: Intercepted, scanned, allowed/blocked
   ✓ Sanitize: Email text cleaned of harmful characters

6. REPEAT
   Next email opened → Repeat from step 3
```

---

## 🎯 Key Design Patterns

### **Pattern 1: Content Script + Background Worker**
```
content.js (Gmail page)
  ├─ Can access DOM
  ├─ Can't fetch cross-origin
  ├─ Runs in page context
  
background.js (Service Worker)
  ├─ Can't access DOM
  ├─ Can fetch cross-origin (has permissions)
  ├─ Runs in extension context
  
They communicate via: chrome.runtime.sendMessage()
```

### **Pattern 2: Graceful Fallback**
```
Try API: scanContent(text, images) → localhost:8000
  ✓ If success: Use AI results
  ✗ If failure: Fall back to localForensicScan()
  
Result: Works offline with basic detection
```

### **Pattern 3: Fingerprinting**
```
SHA256(emailText + imageSrc) = fingerprint
Store in Set: scannedEmailFingerprints

Why? Prevent scanning same email twice when user scrolls/refreshes
```

### **Pattern 4: Event Interception**
```
document.addEventListener('click', handler, true)  // Capture phase
e.preventDefault()                                  // Block default
setTimeout(() => target.click(), 500)             // Re-trigger after scan
```

---

## 💾 Storage

```javascript
chrome.storage.local.set({
  installedAt: Date.now(),
  version: '0.2.0',
  scannedEmails: Set([fingerprints...])  // Avoid duplicates
});
```

**Persistent storage:**
- Installation timestamp
- Extension version
- Scanned email fingerprints (session)

---

## 📡 API Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scan` | POST | Scan email/images for threats |
| `/api/scan-url` | POST | Scan URL for phishing |
| `/api/extension-events` | POST | Log extension events |
| `/docs` | GET | Swagger API documentation |

---

## ✅ File Checklist

- [x] manifest.json - Config ✓
- [x] background.js - Service worker ✓
- [x] content.js - Main detection ✓
- [x] popup.html - UI template ✓
- [x] popup.js - Popup logic ✓
- [x] content.css - Styling ✓
- [x] search-guard.js - Search scanning ✓
- [x] icons/ - Assets ✓

**All 8 components ready to use!** 🚀
