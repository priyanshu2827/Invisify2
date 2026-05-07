# 🎬 Chrome Extension Demo - Step by Step

## ✅ Setup Status
```
API Server: ✓ Running on http://127.0.0.1:8000
Models: ✓ Loaded (steg_detect, message_decoder)
Extension: Ready to load
```

---

## 📋 Demo Walkthrough (5-10 minutes)

### **STEP 1: Load Extension in Chrome**

1. **Open Chrome** and go to `chrome://extensions`
2. **Enable Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select folder: `C:\Users\priya\Downloads\Invisify2-main\Invisify2-main\extension`
5. **Click Open**

**Expected Result:**
```
Sentinel Prime: Email Guard v0.2.0 appears with:
✓ Ready
✓ id: [random id]
✓ Errors: None
```

---

### **STEP 2: Open Extension Popup**

1. **Click the extension icon** in Chrome toolbar (top-right)
2. A popup appears showing:

```
╔════════════════════════════════════════════╗
║   🛡️  Sentinel Prime                       ║
║   Email & Web Threat Guard                 ║
╠════════════════════════════════════════════╣
║  ● Backend API         → ✓ Connected       ║
║  ● Email Guard         → Active             ║
║  ● Search Guard        → Active             ║
╠════════════════════════════════════════════╣
║  [Open Dashboard]  ← Opens http://localhost:8000/docs
╠════════════════════════════════════════════╣
║  ✓ Steganography detection                 ║
║  ✓ Homoglyph & IDN protection              ║
║  ✓ Search result scanning                  ║
║  ✓ Phishing URL blocking                   ║
║  ✓ Real-time threat intel                  ║
╠════════════════════════════════════════════╣
║  v0.2.0 · Research Edition                 ║
╚════════════════════════════════════════════╝
```

**What to check:**
- ✓ Backend API shows **"Connected"** (green dot)
- ✓ Email Guard shows **"Active"** (green dot)
- ✓ Search Guard shows **"Active"** (green dot)

---

### **STEP 3: Test on Gmail (Detection Demo)**

#### **3A: Open Gmail**
1. Go to `https://mail.google.com`
2. Open **any email** from your inbox
3. **Open Developer Tools** (Press `F12`)
4. Go to **Console** tab

#### **3B: Watch for Detection Logs**

Within 2-3 seconds, you should see logs like:

```javascript
[Sentinel Prime] Research-Grade Email Guard Active
[Sentinel Prime] Initial scan attempt...
[Sentinel] Found 1 email bodies
[Sentinel] Scanning inbound email... (Text: 523 chars, Images: 0)
[Sentinel] Initiating scan for 523 chars and 0 images...
[Sentinel] API scan complete, received result
```

#### **3C: Look for Visual Indicators**

**If email is CLEAN (no threats):**
```
✓ Green toast appears (bottom-right): "Email verified clean."
✓ No threat meter appears
```

**If email has THREATS (test email with suspicious content):**
```
⚠️ Orange/Red warning appears in email
⚠️ Orange warning banner appears above email text:
   "SECURITY WARNING"
   "Threat Score: 35%"
   "Detected: [list of threats]"
   [Sanitize] button appears
```

---

### **STEP 4: Test Threat Detection (Create Test Email)**

#### **Option A: Compose Test Email with Threats**

1. Click **"Compose"** on Gmail
2. Paste this suspicious content:
```
Check this link: https://pа́ypal.com/login
Click here for more info
```
(Contains homoglyph: á instead of 'a')

3. **Don't send yet!** - Click **"Send" button**
4. **Extension intercepts it:**

```
╔════════════════════════════════════╗
║ 📊 Threat Analysis                 ║ ← Appears top-right
║ Risk Score: 45%                    ║
║ Detection Method: API + Local      ║
║ Detected Threats:                  ║
║  • homoglyph_domain_phishing       ║
║  • unusual_character_patterns      ║
╚════════════════════════════════════╝
```

5. **Toast appears:**
```
"Warning: Suspicious Content (45%)"
or
"Email verified clean." ← If score is low
```

6. If score > 85%: **Send is BLOCKED**
7. If score < 85%: **Send is ALLOWED** (warning only)

---

### **STEP 5: Test Search Guard (Bonus)**

1. Go to `https://www.google.com/search?q=test`
2. Open **Console** (F12)
3. Should see similar logs:
```
[Sentinel Prime] Research-Grade Email Guard Active
[Search Guard] Active on search results
```

4. Extension scans search result URLs for:
   - Phishing domains
   - Malicious URLs
   - Suspicious patterns

---

## 🎯 What's Happening Behind the Scenes

```
User Opens Gmail Email
    ↓
[Content Script - content.js]
    ├─ Detects email container (.a3s)
    ├─ Extracts text + images
    ├─ Runs local forensics scan
    └─ Sends to Backend API
            ↓
[Background Service - background.js]
    └─ Fetches images if needed
            ↓
[Backend API - api_server.py on port 8000]
    ├─ Loads PyTorch models
    ├─ Analyzes for steganography
    ├─ Returns threat score
    └─ Sends result back
            ↓
[Content Script receives result]
    ├─ Shows threat meter
    ├─ Displays warning banner
    ├─ Publishes event to logs
    └─ Updates UI
            ↓
User sees: Threat Score, Warning, or Clean Status
```

---

## 📊 Testing Scenarios

### **Scenario 1: Clean Email** ✓
```
Subject: Team Meeting Notes
Content: Regular business email with attachments

Result:
- Score: 5%
- Status: Safe
- Action: Email verified clean.
```

### **Scenario 2: Phishing Email** ⚠️
```
Subject: Urgent: Update your password
Content: 
  "Click here: https://pа́ypal-login.ru/"
  (Uses homoglyph domains)

Result:
- Score: 75%
- Status: High Risk
- Action: WARNING shown, send allowed with caution
```

### **Scenario 3: Steganography Test** 🔴
```
Subject: Image attachment
Content: Regular email + suspicious image with LSB encoding

Result:
- Score: 85%+
- Status: Critical
- Action: Send BLOCKED, user warned
```

---

## 🔍 Console Debug Output

**In Browser Console (F12), you'll see:**

| Log | Meaning |
|-----|---------|
| `[Sentinel Prime] Research-Grade...` | Extension loaded ✓ |
| `[Sentinel] Scanning inbound email...` | Email detected, scanning started |
| `[Sentinel] Initiating scan for X chars...` | Sending to API |
| `[Sentinel] API scan complete` | API responded ✓ |
| `[Sentinel] Threat Score: 45%` | Result received |
| `[Sentinel] API unreachable` | API down (falls back to local) |
| `[Sentinel] Local forensics score: 30%` | Used client-side detection |

---

## 🎮 Interactive Demo Actions

### **Action 1: Open Extension Popup**
```
Result: See "Backend API → ✓ Connected"
Time: Instant
```

### **Action 2: Open Gmail Email**
```
Result: Console shows detection logs
Time: 2-3 seconds
```

### **Action 3: Compose Email with Threats**
```
Result: Threat meter appears when composing
Time: Real-time as you type
```

### **Action 4: Click Send Button**
```
Result: Threat analysis modal appears
Time: <1 second
```

### **Action 5: Click "Open Dashboard"**
```
Result: Opens http://localhost:8000/docs
Time: Instant
Shows: API Swagger documentation
```

---

## ✅ Demo Checklist

- [ ] Extension loads in Chrome (no errors)
- [ ] Popup shows "✓ Backend API Connected"
- [ ] Open Gmail email → see console logs within 3 seconds
- [ ] Threat meter appears (either green/orange/red)
- [ ] Compose email → threat analysis works on send
- [ ] "Open Dashboard" button works
- [ ] No console errors (except deprecation warnings)

---

## 📸 Expected Visual Indicators

### **Green (Safe)**
```
✓ Email verified clean.
✓ Green dot next to Backend API
Score: 0-30%
```

### **Orange (Warning)**  
```
⚠️ Warning: Suspicious Content (45%)
⚠️ Orange threat banner appears
Score: 31-70%
```

### **Red (Danger)**
```
🔴 SECURITY ALERT
🔴 High-risk content detected!
🔴 Red threat banner appears
Score: 71-100%
```

---

## 🐛 Troubleshooting During Demo

| Issue | Solution |
|-------|----------|
| Popup shows "✗ Offline" | Check: `http://localhost:8000/docs` - Is API running? |
| No logs in console | Refresh Gmail page and open email again |
| Extension not loading | Go to `chrome://extensions` - Check for errors |
| API not responding | Check terminal: `uvicorn api_server:app --host 127.0.0.1 --port 8000` |
| No threat meter appears | Check if email actually loaded: `document.querySelector('.a3s')?.innerText` |

---

## 🎯 Success Indicators

**Extension is working correctly if:**
1. ✅ Popup shows "Connected" for Backend API
2. ✅ Console shows `[Sentinel Prime]` logs when opening emails
3. ✅ Threat meter appears within 3 seconds
4. ✅ Detection works on compose (send interception)
5. ✅ No JavaScript errors in console

**Demo is complete when:**
- User sees threat detection in action
- User understands the flow: Gmail → Extension → API → Result
- Popup, logs, and threat meter are all visible

---

## 🚀 Next: Advanced Testing (Optional)

1. **Test with actual steganography images** - Extract from `test sample/` folder
2. **Test search results** - Go to Google, observe URL scanning
3. **Test multiple emails** - Extension caches results to avoid duplicates
4. **Test offline mode** - Stop API server, watch local forensics kick in
5. **Test with large emails** - Multiple images, long content

---

**Now you're ready for the demo!** 🎬 Start with STEP 1 and follow through!
