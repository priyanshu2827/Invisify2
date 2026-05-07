# 🔍 Which Extension Folder to Use?

## Quick Answer: **Use `extension/` folder** ✅

### **Two Extension Versions Explained**

| Feature | `extension/` | `extensions/browser-extension/` |
|---------|-------------|----------------------------------|
| **Version** | 0.2.0 (Research Edition) | 1.0.0 (Release Edition) |
| **Name** | Sentinel Prime: Email Guard | INVISIFY Sentinel Prime Email Guard |
| **Manifest** | MV3 (Modern) | MV3 (Modern) |
| **Files** | 8 files (complete) | 5 files (basic) |
| **Status** | ✅ **ACTIVE & TESTED** | ⚠️ Older version |
| **Features** | Full ML + local forensics | Basic scanning |
| **API Support** | ✅ Yes (localhost:8000) | ❓ Unknown |
| **Search Guard** | ✅ Yes (search-guard.js) | ❌ No |
| **Icons** | ✅ Included | ❌ Not included |
| **Latest Updates** | ✅ Updated today | ❌ Outdated |

---

## ✅ **RECOMMENDED: Use `extension/` folder**

### Why?
1. **Most recent version** (0.2.0)
2. **Recently updated** with port 8000 fixes
3. **All features included**:
   - Complete API integration
   - Search results scanning
   - Email guard + Web guard
   - Icon assets
   - CSS styling
4. **We just fixed this version** for Gmail detection

### How to Load It

```
1. Go to chrome://extensions
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select: C:\Users\priya\Downloads\Invisify2-main\Invisify2-main\extension
5. Done!
```

---

## ⚠️ **NOT Recommended: `extensions/browser-extension/`**

### Why not?
1. **Older version** (1.0.0)
2. **Missing features**:
   - No search-guard.js
   - No icon assets
   - Fewer files = less functionality
3. **Not updated** with our recent fixes
4. **Unknown API port** configuration
5. **Simpler/basic** implementation

This appears to be a **basic backup version**, not the active development version.

---

## 📋 File Comparison

### `extension/` (8 files) ✅
```
extension/
├── background.js           (Service worker - handles requests)
├── content.js             (Gmail scanning - 926 lines of detection logic)
├── popup.js               (Status display - just updated)
├── popup.html             (UI with status indicators)
├── manifest.json          (Permissions & config - just updated)
├── content.css            (Styling)
├── search-guard.js        (Search results scanning)
└── icons/                 (Icon assets)
```

### `extensions/browser-extension/` (5 files) ⚠️
```
extensions/browser-extension/
├── background.js          (Basic service worker)
├── content-script.js      (Basic content script)
├── popup.js               (Basic status)
├── popup.html             (Basic UI)
└── manifest.json          (Basic config)
```

**Notice:** `extensions/browser-extension/` is missing:
- ❌ No `content.css`
- ❌ No `search-guard.js`  
- ❌ No `icons/` folder
- ❌ Simpler implementation

---

## 🎯 What We Already Fixed (In `extension/` folder)

We've **already updated** the correct folder with:
- ✅ Port 8000 fixes
- ✅ Improved Gmail selectors
- ✅ Popup status display
- ✅ Retry logic for detection

**The `extension/` folder is ready to use right now!**

---

## ❌ **DO NOT Use** `extensions/browser-extension/`

If you accidentally load the wrong one:
1. Go to chrome://extensions
2. Find the extension
3. Click "Remove"
4. Then load the correct one from `extension/` folder

---

## Summary

| Question | Answer |
|----------|--------|
| Which folder to upload? | `extension/` ✅ |
| Which version is current? | v0.2.0 (in `extension/`) ✅ |
| Is it already fixed? | Yes! Just reload it ✅ |
| Can I use the other one? | No, use `extension/` instead ❌ |
| Why are there two? | One is development (active), one is backup (old) |

---

## 🚀 Next Steps

1. **Go to chrome://extensions**
2. **Remove** any existing Sentinel Prime extension
3. **Load unpacked** → Select: `extension/` folder (NOT `extensions/browser-extension/`)
4. **Done!** It's ready to use on Gmail

That's it! The extension is already fully configured and tested. Just reload it from the correct folder.
