# ✅ DEMO CHECKLIST - Run This Now!

## Pre-Demo Check

- [x] API Server running on `http://127.0.0.1:8000`
  ```
  Status: ✓ Running
  Models: steg_detect, message_decoder
  Device: CPU
  ```

- [ ] Extension folder ready at: `C:\Users\priya\Downloads\Invisify2-main\Invisify2-main\extension`

- [ ] Chrome browser ready to load extension

---

## Demo Steps (Follow in Order)

### **1️⃣ LOAD EXTENSION IN CHROME**
- [ ] Open Chrome
- [ ] Go to `chrome://extensions`
- [ ] Enable **Developer mode** (top-right toggle)
- [ ] Click **"Load unpacked"**
- [ ] Select the `extension/` folder
- [ ] **Wait for extension to load** (~2 seconds)

**Expected Result:**
```
✓ "Sentinel Prime: Email Guard v0.2.0" appears
✓ Status: Enabled (no errors)
✓ Icon appears in toolbar
```

**If error:** Click extension icon to see errors

---

### **2️⃣ CHECK EXTENSION POPUP**
- [ ] Click **extension icon** in Chrome toolbar (top-right)
- [ ] Popup opens

**Expected Popup:**
```
🛡️  Sentinel Prime
Email & Web Threat Guard
─────────────────────────────────
● Backend API         → ✓ Connected  (GREEN)
● Email Guard         → Active      (GREEN)
● Search Guard        → Active      (GREEN)
─────────────────────────────────
[Open Dashboard]
```

**Checklist:**
- [ ] All three items show GREEN dots
- [ ] Backend API shows **"✓ Connected"** (not "Offline")
- [ ] Button says **"Open Dashboard"**

**If Backend shows ✗ Offline:**
- Go to `http://localhost:8000/docs` in browser
- If that doesn't load, API crashed
- Restart: `uvicorn api_server:app --host 127.0.0.1 --port 8000`

---

### **3️⃣ OPEN GMAIL**
- [ ] Go to `https://mail.google.com`
- [ ] **Open any email** from your inbox
- [ ] Wait 2-3 seconds

**What to look for:**
- [ ] **Green toast** appears (bottom-right): "Email verified clean."
  OR
- [ ] **Orange/Red threat banner** appears above email (if threats detected)

---

### **4️⃣ CHECK CONSOLE LOGS**
- [ ] Press **F12** (Open Developer Tools)
- [ ] Click **"Console"** tab
- [ ] You should see:

```
[Sentinel Prime] Research-Grade Email Guard Active
[Sentinel Prime] Initial scan attempt...
[Sentinel] Found 1 email bodies
[Sentinel] Scanning inbound email... (Text: 523 chars, Images: 0)
[Sentinel] Initiating scan for 523 chars and 0 images...
[Sentinel] API scan complete, received result
```

**Checklist:**
- [ ] At least 3-4 `[Sentinel]` log messages appear
- [ ] No red error messages
- [ ] "API scan complete" message appears

**If no messages after 5 seconds:**
- Email might not have loaded
- Refresh and try another email
- Check: `document.querySelector('.a3s')?.innerText` in console

---

### **5️⃣ TEST THREAT DETECTION (Compose Email)**
- [ ] Click **"Compose"** on Gmail
- [ ] Type this test content:
  ```
  Check this suspicious link: https://pа́ypal.com/login
  Click here for details
  ```
  *(Copy-paste the text above - it has a homoglyph character)*

- [ ] **DO NOT SEND YET**
- [ ] Keep compose window open for 3 seconds

**Expected Result:**
```
Threat Meter appears (top-right):
📊 Threat Analysis
Risk Score: 35-50%
Detection Method: API + Local
Detected Threats:
• homoglyph_domain_phishing
```

**Checklist:**
- [ ] Threat meter appears within 3 seconds
- [ ] Score is NOT 0%
- [ ] Shows threat type: "homoglyph_domain_phishing"

---

### **6️⃣ TEST SEND INTERCEPTION**
- [ ] With compose window still open, click **"Send"** button
- [ ] Extension intercepts it

**Expected Result:**
```
🔴 Toast appears: "Warning: Suspicious Content (45%)"
OR
✓ Toast appears: "Email verified clean."
(Then email sends automatically)
```

**Checklist:**
- [ ] Toast appears (showing score)
- [ ] If score < 85%: Email sends after delay
- [ ] If score > 85%: Send blocked with "CRITICAL" warning
- [ ] No error in console

---

## 📊 Results Summary

### **✅ If Everything Works:**

| Component | Status | Evidence |
|-----------|--------|----------|
| Extension loads | ✓ | Icon visible, no errors |
| API connects | ✓ | Popup shows "✓ Connected" |
| Email scans | ✓ | Console logs appear |
| Results display | ✓ | Toast/threat meter visible |
| Send intercepts | ✓ | Interception toast appears |

**DEMO SUCCESS! 🎉**

---

### **❌ If Something Doesn't Work:**

| Problem | Solution |
|---------|----------|
| Extension icon doesn't appear | Reload page, check chrome://extensions for errors |
| Popup shows ✗ Offline | Check: `http://localhost:8000/docs` - restart API if needed |
| No console logs after 5 seconds | Email might not have loaded - refresh and try another |
| No threat meter on compose | Wait 3 seconds, check console for errors |
| Can't click Send | Check if compose window is focused |

---

## 🎬 Demo Timing

```
Step 1 (Load extension):        ~10 seconds
Step 2 (Check popup):           ~5 seconds
Step 3 (Open Gmail):            ~10 seconds (wait for email to load)
Step 4 (View console):          ~2 seconds
Step 5 (Compose test):          ~10 seconds (wait for threat meter)
Step 6 (Send test):             ~5 seconds
────────────────────────────────────────
TOTAL DEMO TIME:                ~42 seconds
```

---

## 🎯 Demo Script (Read Out Loud)

```
"Let me show you how the Sentinel Prime extension works.

First, I'll load the extension from the local folder. 
[Show loading process]

Now I can see the popup - it shows the backend API is connected.

Let me open Gmail. When I open an email, the extension scans it 
automatically in the background using both client-side and server-side 
AI models.

[Open email, wait 3 seconds]

Notice the green toast notification - this email is verified as clean.
You can also see the console logs showing the detection process.

Now let me demonstrate the compose interception. If I write an email
with suspicious content and try to send it...

[Compose with homoglyph]

The extension shows a threat analysis meter with a risk score. 
If the score is high enough (above 85%), it will block the send.
Otherwise, it allows the send but shows a warning.

[Click send]

You can see the warning toast and then the email sends after the 
analysis is complete.

That's how the extension works - real-time threat detection for email 
and search results!"
```

---

## ✨ Key Talking Points

1. **Real-time Detection** - Scans as soon as email opens
2. **AI-Powered** - Uses PyTorch deep learning models
3. **Multiple Threat Types** - Steganography, homoglyphs, phishing, etc.
4. **Send Interception** - Protects before email is sent
5. **Offline Capable** - Falls back to local forensics if API is down
6. **Fast** - Complete analysis in 2-3 seconds

---

## 📸 Screenshot Moments

Capture these for presentation:

1. Extension popup with "✓ Connected"
2. Gmail email with green "clean" toast
3. Console logs showing detection
4. Compose with threat meter
5. Red/orange warning banner (if using suspicious email)

---

## ✅ FINAL CHECKLIST

Before demo, verify:

- [ ] API server is running: `http://localhost:8000/docs` loads
- [ ] Extension is loaded in Chrome (icon visible)
- [ ] Popup shows "✓ Connected"
- [ ] Test email opens without errors
- [ ] Console shows logs (F12)
- [ ] You have test email to compose with threats

---

## 🚀 You're Ready!

Follow this checklist step-by-step and the demo will be smooth.

**Good luck!** 🎬
