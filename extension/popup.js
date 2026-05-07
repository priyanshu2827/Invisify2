
document.getElementById('checkNow').addEventListener('click', () => {
    // Open the main dashboard in a new tab
    chrome.tabs.create({ url: 'http://localhost:8000/docs' });
});

// Update status if needed (could check if backend is reachable)
async function checkBackendStatus() {
    const statusEl = document.getElementById('backendStatus');
    const dotEl = document.getElementById('backendDot');
    
    try {
        const response = await fetch('http://localhost:8000/api/scan', {
            method: 'OPTIONS',
            timeout: 5000
        });
        if (response.ok) {
            console.log('Sentinel Prime Backend is reachable.');
            statusEl.innerText = '✓ Connected';
            dotEl.className = 'status-dot dot-online';
        } else {
            throw new Error('Response not ok');
        }
    } catch (e) {
        console.warn('Sentinel Prime Backend is offline or unreachable.', e);
        statusEl.innerText = '✗ Offline';
        dotEl.className = 'status-dot dot-offline';
    }
}

checkBackendStatus();
