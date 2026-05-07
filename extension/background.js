/**
 * Sentinel Prime: Background Service Worker
 */

const SCAN_API = 'http://localhost:8000/api/scan';
const URL_SCAN_API = 'http://localhost:8000/api/scan-url';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetch_image') {
        handleImageFetch(message.url).then(sendResponse);
        return true;
    }

    if (message.action === 'scan_url') {
        handleUrlScan(message.url, message.context).then(sendResponse);
        return true;
    }

    if (message.action === 'check_backend') {
        checkBackend().then(sendResponse);
        return true;
    }
});

async function handleImageFetch(url) {
    try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return { success: true, data: dataUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function handleUrlScan(url, context = {}) {
    try {
        const response = await fetch(URL_SCAN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, ...context })
        });
        if (response.ok) {
            return { success: true, data: await response.json() };
        }
        return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkBackend() {
    try {
        const response = await fetch(SCAN_API, { method: 'OPTIONS' });
        return { online: response.ok };
    } catch {
        return { online: false };
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Sentinel Prime] Email & Web Guard installed');
    chrome.storage.local.set({
        installedAt: Date.now(),
        version: chrome.runtime.getManifest().version
    });
});

console.log('[Sentinel Prime] Background service worker ready');
