# 🚀 Quick Start Guide - Sentinel Prime Extension

## The Problem (Now Fixed)
✅ **API Port Mismatch**: Extension was looking for port 3000, API was on 8000  
✅ **Missing Dependencies**: Python packages weren't installed  
✅ **Popup not showing status**: Backend status indicator wasn't working  

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Start the Backend API
Open PowerShell and run:
```powershell
cd C:\Users\priya\Downloads\Invisify2-main\Invisify2-main
uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 2: Verify API is Working
Open browser and go to: `http://localhost:8000/docs`

You should see the **Swagger API documentation**.

### Step 3: Install/Reload Extension
1. Go to `chrome://extensions`
2. **Enable Developer mode** (top right toggle)
3. **Reload** the Sentinel Prime extension (or click "Load unpacked" → select `extension/` folder)
4. Click the extension icon in toolbar

**The popup should now show:**
```
✓ Backend API → Connected
✓ Email Guard → Active
✓ Search Guard → Active
```

### Step 4: Test on Gmail
1. Go to `https://mail.google.com`
2. **Open any email**
3. Wait 2-3 seconds
4. Should see:
   - **Detection toast** (bottom right)
   - **Threat meter** (top right if threats detected)

5. **Check Console for debug logs:**
   - Press `F12` → **Console tab**
   - You should see `[Sentinel Prime]` messages

---

## ✅ Verification Checklist

- [ ] API running on port 8000 (check: `http://localhost:8000/docs`)
- [ ] Extension popup shows "✓ Connected" 
- [ ] Console shows `[Sentinel Prime]` messages when opening Gmail
- [ ] Toast notification appears after 2-3 seconds of opening email
- [ ] Threat meter shows if threats detected

---

## ❌ Troubleshooting

### Popup shows "✗ Offline"
**Solution:** Make sure API is running:
```powershell
netstat -ano | findstr 8000  # Should show a listening process
```

If nothing shows, restart API:
```powershell
uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

### No detection on Gmail
**Debug steps:**
1. Open email → Press F12 → Console
2. Look for messages like:
   - `[Sentinel Prime] Research-Grade Email Guard Active` ✓ Good
   - `[Sentinel] Scanning inbound email...` ✓ Good
   - `[Sentinel] API unreachable` ✗ API not running!

3. Check if Gmail emails are actually loading:
   ```javascript
   // In browser console, type:
   document.querySelector('.a3s')?.innerText
   // Should show email text, not undefined
   ```

### Extension was installed before fix
**Solution:** Clear cache and reload:
1. Go to `chrome://extensions`
2. **Unload** Sentinel Prime
3. **Remove** the old extension
4. **Load unpacked** → select `extension/` folder again

---

## 📁 Files Updated
- ✅ `extension/content.js` - Fixed API URL to port 8000, improved Gmail selectors
- ✅ `extension/background.js` - Fixed API URL to port 8000
- ✅ `extension/popup.js` - Now shows backend connection status
- ✅ `extension/manifest.json` - Updated host permissions

---

## 🎯 What the Extension Does

**On Gmail:**
- ✓ Scans incoming emails for steganography
- ✓ Detects homoglyph attacks
- ✓ Identifies zero-width characters
- ✓ Flags emoji encoding exploits
- ✓ Warns before sending suspicious emails

**Automatic Checks:**
- Real-time monitoring of email list
- Compose window content scanning
- Image attachment analysis
- Fallback local forensics if API down

---

## 🔧 Configuration

### Change API Port
If you want API on a different port:
```powershell
uvicorn api_server:app --host 127.0.0.1 --port 9000
```

Then edit `extension/content.js` lines 8-9:
```javascript
const SCAN_API_URL = 'http://localhost:9000/api/scan';
const EXTENSION_EVENTS_API_URL = 'http://localhost:9000/api/extension-events';
```

And reload extension.

### Use Remote API Server
If API is on another computer (e.g., 192.168.1.100):
```javascript
// Edit extension/content.js:
const SCAN_API_URL = 'http://192.168.1.100:8000/api/scan';
const EXTENSION_EVENTS_API_URL = 'http://192.168.1.100:8000/api/extension-events';
```

---

## 📊 Performance

- **First scan**: 2-3 seconds (model loading)
- **Subsequent scans**: 500-800ms (cached)
- **Local forensics**: <100ms (if API down)

---

## ✨ That's it! 
The extension should now be detecting threats on Gmail. If not, follow the troubleshooting steps above.

**Questions?** Check the console logs and verify the API is running on port 8000.
