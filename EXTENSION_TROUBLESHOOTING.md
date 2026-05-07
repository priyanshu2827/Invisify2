# Sentinel Prime - Extension Troubleshooting Guide

## Issue: Extension Not Detecting Anything on Gmail

### Root Causes Identified & Fixed

#### 1. **API Port Mismatch** ✅ FIXED
- **Problem**: Extension was looking for API on `localhost:3000` but the backend runs on `localhost:8000`
- **Solution**: Updated all API URLs in:
  - `extension/content.js`: Lines 8-9
  - `extension/background.js`: Lines 5-6
  - `extension/manifest.json`: Updated host permissions

#### 2. **Gmail Selector Updates** ✅ FIXED
- **Problem**: Gmail frequently updates its CSS class names, making hardcoded selectors unreliable
- **Solution**: Added multiple fallback selectors:
  - `.a3s.aiL` - Original selector (still works in some cases)
  - `.a3s` - General email body container
  - `[role="region"] .a3s` - New Gmail layout
  - `.m_body_area` - Alternative container
  - `.moz-text-html` - Text content
  - `.msg-body` - Message body fallback

#### 3. **Timing Issue** ✅ FIXED
- **Problem**: Initial scan ran after 4 seconds, but Gmail might not fully load emails by then
- **Solution**: 
  - Reduced wait time to 2 seconds
  - Added retry logic: if no emails found, keeps trying every 3 seconds
  - Uses `MutationObserver` for real-time detection of new emails

---

## Setup Instructions

### Step 1: Start the Backend API

```bash
cd /path/to/Invisify2-main
python3 -m pip install -r requirements.txt
python3 api_server.py
```

The API will start on `http://localhost:8000`

**Verify**: Open `http://localhost:8000/docs` in your browser. You should see the Swagger UI.

### Step 2: Install the Extension

1. Open **Chrome/Brave** and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select: `extension/` folder (from this project)
5. The extension should appear with version 0.2.0

### Step 3: Verify Installation

1. Click the extension icon in the toolbar
2. You should see "Sentinel Prime: Email Guard" popup
3. Open **Developer Tools** (F12) → **Console tab**
4. You should see messages like:
   ```
   [Sentinel Prime] Research-Grade Email Guard Active
   [Sentinel Prime] Initial scan attempt...
   ```

### Step 4: Test Detection on Gmail

1. Go to `https://mail.google.com`
2. **Open an existing email** OR **compose a new one**
3. Check the Console (F12) for debug logs:
   - `[Sentinel] Scanning inbound email...`
   - `[Sentinel] Initiating scan for X chars...`

---

## Debugging Checklist

### ✓ Check Backend is Running
```bash
# Should return HTTP 200
curl -X OPTIONS http://localhost:8000/api/scan
```

### ✓ Check Console Logs
- Open any Gmail email
- Press **F12** → **Console**
- Look for `[Sentinel Prime]` messages
- If you see "API unreachable", the backend isn't running

### ✓ Check Extension Permissions
1. Right-click extension icon
2. Select "Extension options"
3. Verify it has access to `mail.google.com`

### ✓ Verify Extension is Active
- Open Gmail
- Press **F12** → **Console**
- Type: `document.querySelectorAll('.a3s').length`
- Should return > 0 if viewing an email

### ✓ Check Network Requests
- Open **F12** → **Network** tab
- Open an email
- Filter by "scan"
- You should see requests to `localhost:8000/api/scan`

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Extension installed but nothing detected" | ✅ Now Fixed - Redownload extension files |
| Console shows "API unreachable" | Start backend: `python3 api_server.py` |
| Backend runs but extension doesn't find it | Check port: `netstat -tlnp \| grep 8000` |
| No detection toasts appearing | Check if emails actually loaded, wait 2+ seconds after opening email |
| Old behavior still present | Clear extension cache: Unload → Reload in chrome://extensions |
| Gmail styles changed again | Extension has fallback selectors; file issue if still broken |

---

## Manual API Testing

### Test the Scan Endpoint Directly

```bash
# Test with JSON text
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"text":"test email content"}'

# Test with an image file
curl -X POST http://localhost:8000/api/scan \
  -F "image=@path/to/image.png" \
  -F "text=accompanying text"
```

Expected response:
```json
{
  "score": 45,
  "severity": "Medium",
  "reasons": ["high_shannon_entropy_detected"]
}
```

---

## Architecture Overview

```
Gmail Website
    ↓
Content Script (extension/content.js)
    ├─→ Extracts email text & images
    ├─→ Local forensic analysis (fallback)
    └─→ Sends to Backend API
         ↓
    Backend API (api_server.py:8000)
         ├─→ PyTorch model inference
         ├─→ Steganography detection
         └─→ Returns threat score
         
Background Service (extension/background.js)
    └─→ Handles image fetching, URL scanning
```

---

## Advanced Configuration

### Change API Endpoint (if not localhost:8000)

Edit `extension/content.js` line 8-9:
```javascript
const SCAN_API_URL = 'http://your-domain.com:8000/api/scan';
const EXTENSION_EVENTS_API_URL = 'http://your-domain.com:8000/api/extension-events';
```

### Change Backend Port

Edit `api_server.py` and run with custom port:
```bash
uvicorn api_server:app --host 0.0.0.0 --port 9000
```

Then update extension URLs accordingly.

### Disable Local Forensics (force API-only)

Edit `extension/content.js` around line 630, in `scanInboundEmail()`:
```javascript
// Remove the else block that performs local fallback
// This will prevent detection if API is down
```

---

## Performance Notes

- **First scan**: ~2-3 seconds (includes model loading on API)
- **Subsequent scans**: ~500-800ms (model cached in memory)
- **Image extraction**: Up to 5 images per email processed
- **Local forensics**: <100ms (client-side only)

---

## Getting Help

1. **Check browser console** (F12) for error messages
2. **Verify API is responding**: `curl http://localhost:8000/docs`
3. **Check if Gmail email is actually loaded**: `document.querySelector('.a3s')?.innerText`
4. **Review logs** in terminal where API is running

---

**Last Updated**: May 7, 2026  
**Extension Version**: 0.2.0  
**API Version**: 2.0.0
