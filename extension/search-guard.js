/**
 * Sentinel Prime: Search Engine Guard
 * Real-time threat detection for search results across major engines
 */

console.log('[Sentinel Prime] Search Guard Active');

const SCAN_API_URL = 'http://localhost:3000/api/scan';
const URL_SCAN_API = 'http://localhost:3000/api/scan-url';
const EXTENSION_EVENTS_API_URL = 'http://localhost:3000/api/extension-events';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEARCH_ENGINES = {
    'www.google.com': {
        name: 'Google',
        resultSelector: 'div.g, div[data-hveid], div.MjjYud',
        linkSelector: 'a[href]:not([href^="#"]):not([href^="javascript"])',
        titleSelector: 'h3',
        snippetSelector: '[data-sncf], .VwiC3b, .yXK7lf'
    },
    'www.bing.com': {
        name: 'Bing',
        resultSelector: 'li.b_algo, .b_ans',
        linkSelector: 'h2 a, .b_title a',
        titleSelector: 'h2',
        snippetSelector: '.b_caption p, .b_snippet'
    },
    'duckduckgo.com': {
        name: 'DuckDuckGo',
        resultSelector: 'article[data-testid="result"], .result, .nrn-react-div',
        linkSelector: 'a[data-testid="result-title-a"], h2 a, .result__a',
        titleSelector: 'h2',
        snippetSelector: '[data-result="snippet"], .result__snippet'
    },
    'search.yahoo.com': {
        name: 'Yahoo',
        resultSelector: 'div.algo, li.algo',
        linkSelector: 'h3 a, .ac-algo',
        titleSelector: 'h3',
        snippetSelector: '.compText, p'
    },
    'www.ecosia.org': {
        name: 'Ecosia',
        resultSelector: '.result, article',
        linkSelector: '.result-title, a.result__title',
        titleSelector: '.result-title',
        snippetSelector: '.result__description'
    },
    'www.startpage.com': {
        name: 'Startpage',
        resultSelector: '.w-gl__result, article',
        linkSelector: 'a.w-gl__result-title, h3 a',
        titleSelector: 'h3',
        snippetSelector: '.w-gl__description'
    }
};

const scannedUrls = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.download',
    '.work', '.loan', '.science', '.review', '.country', '.kim',
    '.cricket', '.zip', '.mov'
];

const SUSPICIOUS_KEYWORDS = [
    'verify-account', 'secure-login', 'account-update', 'confirm-identity',
    'suspended-account', 'unlock-account', 'reset-password-now',
    'bitcoin-generator', 'free-crypto', 'wallet-recovery',
    'login-verify', 'banking-secure', 'paypal-resolution'
];

const PHISHING_BRANDS = [
    'paypal', 'amazon', 'apple', 'microsoft', 'google', 'facebook',
    'instagram', 'netflix', 'bank', 'chase', 'wellsfargo', 'citi',
    'coinbase', 'binance', 'metamask', 'wallet'
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
};

async function sha256(text) {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase();
    } catch {
        return null;
    }
}

function getRealUrl(href) {
    try {
        const url = new URL(href, window.location.origin);
        if (url.pathname === '/url' && url.searchParams.has('q')) {
            return url.searchParams.get('q');
        }
        if (url.hostname === 'www.bing.com' && url.pathname === '/ck/a') {
            const u = url.searchParams.get('u');
            if (u) {
                try { return atob(u.replace(/^a1/, '')); } catch {}
            }
        }
        if (url.hostname === 'duckduckgo.com' && url.pathname === '/l/') {
            return url.searchParams.get('uddg') || href;
        }
        return href;
    } catch {
        return href;
    }
}

// ============================================================================
// LOCAL THREAT ANALYSIS
// ============================================================================

function analyzeUrlLocally(url, title = '', snippet = '') {
    const domain = extractDomain(url);
    if (!domain) return { score: 0, threats: [], safe: true };

    const threats = [];
    const reasons = [];
    let score = 0;

    for (const tld of SUSPICIOUS_TLDS) {
        if (domain.endsWith(tld)) {
            threats.push(`Suspicious TLD: ${tld}`);
            reasons.push('suspicious_tld');
            score += 25;
            break;
        }
    }

    if (domain.includes('xn--')) {
        threats.push('Punycode/IDN domain detected');
        reasons.push('punycode_idn_domain');
        score += 35;
    }

    if (/[^\x00-\x7F]/.test(domain)) {
        threats.push('Unicode characters in domain');
        reasons.push('unicode_homoglyph_domain');
        score += 40;
    }

    const homoglyphPatterns = [
        { brand: 'paypal', regex: /p[a4@]yp[a4@][lI1!|]/i },
        { brand: 'microsoft', regex: /m[i1!|]cr[o0]s[o0]ft/i },
        { brand: 'google', regex: /g[o0]{2}gle/i },
        { brand: 'amazon', regex: /[a4@]m[a4@]z[o0]n/i },
        { brand: 'apple', regex: /[a4@]pp[lI1!|]e/i },
        { brand: 'facebook', regex: /f[a4@]ceb[o0]{2}k/i },
        { brand: 'netflix', regex: /netf[lI1!|][i1!|]x/i }
    ];

    for (const { brand, regex } of homoglyphPatterns) {
        if (regex.test(domain) && !domain.includes(`${brand}.com`)) {
            threats.push(`Possible ${brand} spoofing`);
            reasons.push(`homoglyph_${brand}_spoof`);
            score += 45;
            break;
        }
    }

    const subdomainCount = domain.split('.').length;
    if (subdomainCount > 4) {
        threats.push(`Excessive subdomains: ${subdomainCount}`);
        reasons.push('excessive_subdomains');
        score += 15;
    }

    const fullUrl = url.toLowerCase();
    for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (fullUrl.includes(keyword)) {
            threats.push(`Suspicious URL pattern: ${keyword}`);
            reasons.push('phishing_keyword_in_url');
            score += 20;
            break;
        }
    }

    for (const brand of PHISHING_BRANDS) {
        const brandInSubdomain = new RegExp(`\\b${brand}[.-]`, 'i');
        const brandInDomain = new RegExp(`\\b${brand}\\.(com|net|org|co)`, 'i');
        if (brandInSubdomain.test(domain) && !brandInDomain.test(domain)) {
            threats.push(`Brand "${brand}" used in suspicious context`);
            reasons.push('brand_impersonation');
            score += 30;
            break;
        }
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(domain)) {
        threats.push('IP address used instead of domain');
        reasons.push('ip_address_url');
        score += 35;
    }

    if (domain.length > 50) {
        threats.push('Abnormally long domain');
        reasons.push('long_domain');
        score += 15;
    }

    const hyphenCount = (domain.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
        threats.push(`Excessive hyphens: ${hyphenCount}`);
        reasons.push('hyphen_abuse');
        score += 15;
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'shorturl.at'];
    if (shorteners.includes(domain)) {
        threats.push('URL shortener (destination unknown)');
        reasons.push('url_shortener');
        score += 20;
    }

    const combinedText = `${title} ${snippet}`.toLowerCase();
    if (combinedText.includes('click here urgently') ||
        combinedText.includes('account suspended') ||
        combinedText.includes('verify immediately') ||
        combinedText.includes('claim your prize')) {
        threats.push('Urgency phishing language');
        reasons.push('urgency_language');
        score += 15;
    }

    return {
        score: Math.min(100, score),
        threats,
        reasons,
        safe: score < 25,
        severity: score >= 75 ? 'Critical' : score >= 50 ? 'High' : score >= 25 ? 'Medium' : score >= 10 ? 'Low' : 'Safe',
        domain
    };
}

// ============================================================================
// API SCANNING
// ============================================================================

async function scanUrlViaApi(url, context = {}) {
    const cached = scannedUrls.get(url);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.result;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        let response;
        try {
            response = await fetch(URL_SCAN_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, ...context }),
                signal: controller.signal
            });
        } catch {
            response = await fetch(SCAN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: url, type: 'url', ...context }),
                signal: controller.signal
            });
        }

        clearTimeout(timeoutId);

        if (response.ok) {
            const result = await response.json();
            scannedUrls.set(url, { result, timestamp: Date.now() });
            return result;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn('[Sentinel Search] API unreachable:', error.name);
    }

    return null;
}

async function publishExtensionEvent(payload) {
    try {
        await fetch(EXTENSION_EVENTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch {}
}

// ============================================================================
// UI: BADGES & WARNINGS
// ============================================================================

function createBadge(severity, score, threats = []) {
    const badge = document.createElement('span');
    badge.className = `sentinel-badge sentinel-badge-${severity.toLowerCase()}`;

    const config = {
        'Critical': { color: '#dc2626', bg: '#fee2e2', label: 'DANGER' },
        'High': { color: '#ea580c', bg: '#ffedd5', label: 'RISK' },
        'Medium': { color: '#ca8a04', bg: '#fef3c7', label: 'CAUTION' },
        'Low': { color: '#0891b2', bg: '#cffafe', label: 'NOTICE' },
        'Safe': { color: '#16a34a', bg: '#dcfce7', label: 'SAFE' }
    };

    const cfg = config[severity] || config['Safe'];

    badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        margin-left: 8px;
        background: ${cfg.bg};
        color: ${cfg.color};
        border: 1px solid ${cfg.color}33;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: help;
        vertical-align: middle;
        z-index: 1000;
        position: relative;
    `;

    badge.innerHTML = `
        <span>${cfg.label}</span>
        <span style="opacity: 0.7;">${score}%</span>
    `;

    badge.title = threats.length > 0
        ? `Sentinel Prime detected:\n- ${threats.join('\n- ')}`
        : 'Verified safe by Sentinel Prime';

    return badge;
}

function applyResultStyling(resultEl, severity) {
    resultEl.classList.add(`sentinel-result-${severity.toLowerCase()}`);

    const colors = {
        'Critical': { border: '#dc2626', bg: 'rgba(254, 226, 226, 0.3)' },
        'High': { border: '#ea580c', bg: 'rgba(255, 237, 213, 0.3)' },
        'Medium': { border: '#ca8a04', bg: 'rgba(254, 243, 199, 0.2)' },
        'Low': { border: '#0891b2', bg: 'transparent' },
        'Safe': { border: 'transparent', bg: 'transparent' }
    };

    const cfg = colors[severity];
    if (cfg && severity !== 'Safe' && severity !== 'Low') {
        resultEl.style.borderLeft = `3px solid ${cfg.border}`;
        resultEl.style.paddingLeft = '12px';
        resultEl.style.background = cfg.bg;
        resultEl.style.borderRadius = '4px';
        resultEl.style.transition = 'all 0.3s ease';
    }
}

function showBlockingWarning(url, result, onProceed, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'sentinel-blocking-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        animation: fadeIn 0.2s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        text-align: center;
    `;

    const threatList = (result.reasons || result.threats || [])
        .map(t => `<li style="margin: 4px 0; color: #4b5563;">${escapeHTML(t)}</li>`)
        .join('');

    modal.innerHTML = `
        <div style="
            width: 64px;
            height: 64px;
            margin: 0 auto 16px auto;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        </div>
        <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 24px;">Dangerous Site Detected</h2>
        <p style="color: #6b7280; margin: 0 0 16px 0;">Sentinel Prime has flagged this URL as high-risk:</p>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 20px; word-break: break-all; font-family: monospace; font-size: 13px; color: #991b1b;">
            ${escapeHTML(url.substring(0, 150))}${url.length > 150 ? '...' : ''}
        </div>
        
        <div style="text-align: left; background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">
                Threat Score: <span style="color: #dc2626;">${result.score}%</span>
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                ${threatList || '<li>Multiple security anomalies detected</li>'}
            </ul>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="sentinel-cancel" style="
                background: #16a34a;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                max-width: 200px;
            ">Go Back (Safe)</button>
            <button id="sentinel-proceed" style="
                background: #f3f4f6;
                color: #6b7280;
                border: 1px solid #d1d5db;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                flex: 1;
                max-width: 200px;
            ">Proceed Anyway</button>
        </div>
        
        <div style="margin-top: 16px; font-size: 11px; color: #9ca3af;">
            Powered by Sentinel Prime Security
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('sentinel-cancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });

    document.getElementById('sentinel-proceed').addEventListener('click', () => {
        overlay.remove();
        if (onProceed) onProceed();
    });
}

// ============================================================================
// SEARCH RESULT PROCESSING
// ============================================================================

function getCurrentEngine() {
    const hostname = window.location.hostname;
    return SEARCH_ENGINES[hostname] || null;
}

async function processSearchResult(resultEl, engine) {
    if (resultEl.dataset.sentinelScanned) return;
    resultEl.dataset.sentinelScanned = 'true';

    const linkEl = resultEl.querySelector(engine.linkSelector);
    if (!linkEl || !linkEl.href) return;

    const realUrl = getRealUrl(linkEl.href);
    if (!realUrl || realUrl.startsWith('javascript:') || realUrl.startsWith('#')) return;

    const titleEl = resultEl.querySelector(engine.titleSelector);
    const snippetEl = resultEl.querySelector(engine.snippetSelector);
    const title = titleEl?.innerText || '';
    const snippet = snippetEl?.innerText || '';

    const localResult = analyzeUrlLocally(realUrl, title, snippet);

    if (titleEl && localResult.severity !== 'Safe') {
        const badge = createBadge(localResult.severity, localResult.score, localResult.threats);
        titleEl.appendChild(badge);
        applyResultStyling(resultEl, localResult.severity);
    }

    const apiResult = await scanUrlViaApi(realUrl, { title, snippet, engine: engine.name });

    let finalResult = localResult;

    if (apiResult) {
        const apiScore = Number(apiResult.score || 0);
        if (apiScore > localResult.score) {
            finalResult = {
                ...apiResult,
                threats: [...(localResult.threats || []), ...(apiResult.threats || apiResult.reasons || [])],
                reasons: [...(localResult.reasons || []), ...(apiResult.reasons || [])],
                domain: localResult.domain
            };

            const oldBadge = titleEl?.querySelector('.sentinel-badge');
            if (oldBadge) oldBadge.remove();
            if (titleEl) {
                const newBadge = createBadge(
                    finalResult.severity,
                    finalResult.score,
                    finalResult.threats
                );
                titleEl.appendChild(newBadge);
                applyResultStyling(resultEl, finalResult.severity);
            }
        }
    }

    publishExtensionEvent({
        timestamp: new Date().toISOString(),
        url: realUrl,
        domain: finalResult.domain,
        title: title.substring(0, 100),
        threatType: (finalResult.reasons || [])[0] || 'None',
        score: finalResult.score,
        severity: finalResult.severity,
        action: finalResult.score >= 75 ? 'flagged_critical' : finalResult.score >= 50 ? 'flagged_high' : 'monitored',
        searchEngine: engine.name,
        source: 'search'
    });

    if (finalResult.score >= 70) {
        attachClickInterceptor(resultEl, realUrl, finalResult);
    }
}

function attachClickInterceptor(resultEl, url, result) {
    const links = resultEl.querySelectorAll('a[href]');
    links.forEach(link => {
        if (link.dataset.sentinelIntercepted) return;
        link.dataset.sentinelIntercepted = 'true';

        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            showBlockingWarning(
                url,
                result,
                () => {
                    publishExtensionEvent({
                        timestamp: new Date().toISOString(),
                        url,
                        action: 'user_override_proceed',
                        score: result.score,
                        severity: result.severity,
                        source: 'search'
                    });
                    window.location.href = url;
                },
                () => {
                    publishExtensionEvent({
                        timestamp: new Date().toISOString(),
                        url,
                        action: 'user_blocked',
                        score: result.score,
                        severity: result.severity,
                        source: 'search'
                    });
                }
            );
        }, true);
    });
}

// ============================================================================
// MAIN OBSERVER
// ============================================================================

function scanAllResults() {
    const engine = getCurrentEngine();
    if (!engine) return;

    const results = document.querySelectorAll(engine.resultSelector);
    results.forEach(result => processSearchResult(result, engine));
}

function init() {
    const engine = getCurrentEngine();
    if (!engine) {
        console.log('[Sentinel Search] No supported engine on this page');
        return;
    }

    console.log(`[Sentinel Search] Protecting ${engine.name} search results`);

    setTimeout(scanAllResults, 500);
    setTimeout(scanAllResults, 2000);

    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        shouldScan = true;
                        break;
                    }
                }
            }
            if (shouldScan) break;
        }
        if (shouldScan) {
            clearTimeout(window.__sentinelScanTimeout);
            window.__sentinelScanTimeout = setTimeout(scanAllResults, 300);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            document.querySelectorAll('[data-sentinel-scanned]').forEach(el => {
                delete el.dataset.sentinelScanned;
            });
            setTimeout(scanAllResults, 1000);
        }
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('[Sentinel Prime] Search Guard initialized');
