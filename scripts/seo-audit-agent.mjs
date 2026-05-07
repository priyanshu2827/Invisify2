import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const OUTPUT_PATH =
  process.argv[3] || path.join(process.cwd(), "seo-audit-report.json");
const MAX_PAGES = 120;
const BOT_UA = "INVISIFY-SEO-Audit-Agent/1.0";

const FOCUS_KEYWORDS = [
  "steganography detection",
  "zero-width character detection",
  "homoglyph attack detection",
  "unicode security analysis",
  "emoji steganography",
  "cybersecurity ai tools",
];

const LSI_KEYWORDS = [
  "invisible unicode",
  "unicode phishing",
  "zero width characters",
  "least significant bit steganography",
  "threat intelligence",
  "security operations center",
  "forensic analysis",
  "payload detection",
  "ai threat detection",
];

function safeUrl(input, base) {
  try {
    const parsed = new URL(input, base);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizePath(u) {
  const url = new URL(u);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getAttr(tag, attr) {
  const pattern = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = tag.match(pattern);
  return match ? match[1].trim() : "";
}

function extractTags(html, tag) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  return html.match(pattern) || [];
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].trim()) : "";
}

function extractMetaContent(html, key, type = "name") {
  const p1 = new RegExp(
    `<meta[^>]*${type}\\s*=\\s*["']${key}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    "i"
  );
  const p2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${type}\\s*=\\s*["']${key}["'][^>]*>`,
    "i"
  );
  const m1 = html.match(p1);
  const m2 = html.match(p2);
  return decodeEntities((m1?.[1] || m2?.[1] || "").trim());
}

function extractCanonical(html) {
  const linkTags = extractTags(html, "link");
  for (const tag of linkTags) {
    const rel = getAttr(tag, "rel").toLowerCase();
    if (rel.includes("canonical")) {
      return getAttr(tag, "href");
    }
  }
  return "";
}

function extractHeadings(html) {
  const headings = [];
  const pattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    headings.push({
      level: Number(m[1]),
      text: stripHtml(m[2]).slice(0, 180),
    });
  }
  return headings;
}

function extractLinks(html, pageUrl) {
  const links = [];
  for (const tag of extractTags(html, "a")) {
    const href = getAttr(tag, "href");
    if (!href) continue;
    const abs = safeUrl(href, pageUrl);
    if (!abs) continue;
    links.push({
      href: abs,
      anchorText: stripHtml(tag).slice(0, 120),
      rel: getAttr(tag, "rel"),
    });
  }
  return links;
}

function extractImages(html, pageUrl) {
  const images = [];
  for (const tag of extractTags(html, "img")) {
    const src = getAttr(tag, "src");
    const abs = src ? safeUrl(src, pageUrl) : "";
    images.push({
      src: abs || src,
      alt: getAttr(tag, "alt"),
      loading: getAttr(tag, "loading").toLowerCase(),
      width: getAttr(tag, "width"),
      height: getAttr(tag, "height"),
    });
  }
  return images;
}

function extractScripts(html, pageUrl) {
  const scripts = [];
  for (const tag of extractTags(html, "script")) {
    const src = getAttr(tag, "src");
    if (!src) continue;
    const abs = safeUrl(src, pageUrl);
    if (!abs) continue;
    scripts.push(abs);
  }
  return scripts;
}

function parseRobotsTxt(content) {
  const lines = content.split(/\r?\n/);
  const disallow = [];
  const allow = [];
  let activeAgents = [];
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      activeAgents = [value.toLowerCase()];
      continue;
    }
    if (!activeAgents.includes("*")) continue;
    if (key === "disallow") disallow.push(value);
    if (key === "allow") allow.push(value);
  }
  return { disallow, allow };
}

function isDisallowed(pathname, robots) {
  for (const rule of robots.disallow) {
    if (!rule) continue;
    if (pathname.startsWith(rule)) return true;
  }
  return false;
}

function tokenCount(text) {
  const words = text.toLowerCase().match(/\b[a-z0-9][a-z0-9-]*\b/g) || [];
  return words.length;
}

function phraseCount(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "gi");
  return (text.match(re) || []).length;
}

async function fetchWithChain(url, maxHops = 6) {
  const chain = [];
  let current = url;
  let response = null;
  for (let i = 0; i < maxHops; i += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": BOT_UA },
    });
    const status = response.status;
    const location = response.headers.get("location");
    if (status >= 300 && status < 400 && location) {
      const nextUrl = safeUrl(location, current);
      if (!nextUrl) break;
      chain.push({ from: current, to: nextUrl, status });
      current = nextUrl;
      continue;
    }
    break;
  }

  const headers = Object.fromEntries(response.headers.entries());
  const contentType = headers["content-type"] || "";
  const isTextLike =
    contentType.includes("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml");
  const body = isTextLike ? await response.text() : "";
  return {
    url,
    finalUrl: current,
    status: response.status,
    headers,
    contentType,
    body,
    chain,
  };
}

async function fetchStatus(url) {
  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": BOT_UA },
    });
    if (headRes.status === 405 || headRes.status === 501) {
      const getRes = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": BOT_UA },
      });
      return getRes.status;
    }
    return headRes.status;
  } catch {
    return 0;
  }
}

function sameOrigin(urlA, urlB) {
  const a = new URL(urlA);
  const b = new URL(urlB);
  return a.origin === b.origin;
}

function scoreAudit(summary) {
  let technical = 100;
  let content = 100;
  let performance = 100;

  technical -= summary.robots.exists ? 0 : 12;
  technical -= summary.sitemap.exists ? 0 : 12;
  technical -= Math.min(summary.issues.missingCanonical * 4, 24);
  technical -= Math.min(summary.issues.missingMetaDescription * 3, 18);
  technical -= Math.min(summary.issues.missingTitle * 5, 20);
  technical -= Math.min(summary.issues.brokenInternalLinks * 4, 20);
  technical -= Math.min(summary.issues.redirectChainsOverOneHop * 3, 12);
  technical -= Math.min(summary.issues.securityHeaderGaps * 2, 20);
  technical -= summary.issues.socIndexable ? 12 : 0;

  content -= Math.min(summary.issues.pagesMissingH1 * 8, 24);
  content -= Math.min(summary.issues.pagesWithMultipleH1 * 4, 20);
  content -= Math.min(summary.issues.thinContentPages * 6, 24);
  content -= summary.keywordCoverage < 0.7 ? 20 : summary.keywordCoverage < 0.9 ? 10 : 0;
  content -= summary.issues.duplicateTitles ? 10 : 0;
  content -= summary.issues.duplicateMetaDescriptions ? 10 : 0;

  performance -= summary.performance.avgJsBytesPerPage > 650000 ? 28 : 0;
  performance -= summary.performance.avgJsBytesPerPage > 350000 ? 14 : 0;
  performance -= summary.performance.imageWithoutDimsCount > 0 ? 10 : 0;
  performance -= summary.performance.nonLazyImagesAboveThreshold ? 10 : 0;
  performance -= summary.performance.pagesWithManyScripts * 2;

  technical = Math.max(0, Math.round(technical));
  content = Math.max(0, Math.round(content));
  performance = Math.max(0, Math.round(performance));
  const overall = Math.round(technical * 0.45 + content * 0.3 + performance * 0.25);

  return { technical, content, performance, overall };
}

async function run() {
  const start = Date.now();
  const base = new URL(BASE_URL);
  const root = normalizePath(base.toString());
  const origin = base.origin;

  const robotsUrl = `${origin}/robots.txt`;
  const robotsRes = await fetchWithChain(robotsUrl);
  const robotsExists = robotsRes.status === 200 && robotsRes.body.trim().length > 0;
  const robots = robotsExists
    ? parseRobotsTxt(robotsRes.body)
    : { disallow: [], allow: [] };

  const sitemapUrl = `${origin}/sitemap.xml`;
  const sitemapRes = await fetchWithChain(sitemapUrl);
  const sitemapExists =
    sitemapRes.status === 200 &&
    sitemapRes.contentType.includes("xml") &&
    sitemapRes.body.includes("<urlset");

  const queue = [root];
  const visited = new Set();
  const pages = [];
  const internalLinks = new Set();

  // Discover static app routes from Next.js build manifest to avoid crawl blind spots
  // when root-level redirects hide sections from plain link traversal.
  try {
    const manifestPath = path.join(
      process.cwd(),
      ".next",
      "server",
      "app-paths-manifest.json"
    );
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    const routePaths = Object.keys(parsed)
      .filter((k) => k.endsWith("/page"))
      .map((k) => (k === "/page" ? "/" : k.replace(/\/page$/, "")))
      .filter((k) => !k.startsWith("/_not-found"));

    for (const route of routePaths) {
      const abs = safeUrl(route, origin);
      if (abs && !queue.includes(abs)) queue.push(abs);
    }
  } catch {
    // Fall back to pure crawler mode if no build manifest exists.
  }

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    const pathName = new URL(url).pathname;
    if (isDisallowed(pathName, robots)) continue;

    const result = await fetchWithChain(url);
    const isHtml = (result.contentType || "").includes("text/html");
    const pathNameNormalized = new URL(url).pathname;
    const isSeoCandidate =
      isHtml &&
      !pathNameNormalized.startsWith("/api") &&
      !pathNameNormalized.startsWith("/_next");
    const page = {
      url,
      finalUrl: result.finalUrl,
      pathname: pathNameNormalized,
      status: result.status,
      isHtml,
      isSeoCandidate,
      redirectChain: result.chain,
      headers: result.headers,
      title: "",
      metaDescription: "",
      metaRobots: "",
      canonical: "",
      h1: [],
      headings: [],
      links: [],
      images: [],
      scripts: [],
      htmlBytes: 0,
      textWordCount: 0,
      keywordHits: {},
      lsiHits: {},
    };

    if (isHtml && result.status < 500 && result.body) {
      const html = result.body;
      page.title = extractTitle(html);
      page.metaDescription = extractMetaContent(html, "description");
      page.metaRobots = extractMetaContent(html, "robots");
      page.canonical = extractCanonical(html);
      page.headings = extractHeadings(html);
      page.h1 = page.headings.filter((h) => h.level === 1).map((h) => h.text);
      page.links = extractLinks(html, result.finalUrl);
      page.images = extractImages(html, result.finalUrl);
      page.scripts = extractScripts(html, result.finalUrl);
      page.htmlBytes = Buffer.byteLength(html, "utf8");
      const text = stripHtml(html).toLowerCase();
      page.textWordCount = tokenCount(text);

      for (const phrase of FOCUS_KEYWORDS) {
        page.keywordHits[phrase] = phraseCount(text, phrase);
      }
      for (const phrase of LSI_KEYWORDS) {
        page.lsiHits[phrase] = phraseCount(text, phrase);
      }

      for (const link of page.links) {
        if (!sameOrigin(link.href, root)) continue;
        const normalized = normalizePath(link.href);
        internalLinks.add(normalized);
        if (!visited.has(normalized)) queue.push(normalized);
      }
    }
    pages.push(page);
  }

  const uniqueScriptUrls = new Set();
  for (const p of pages) {
    for (const s of p.scripts) {
      if (sameOrigin(s, root) && s.includes(".js")) uniqueScriptUrls.add(s);
    }
  }

  const scriptSizeMap = new Map();
  for (const scriptUrl of uniqueScriptUrls) {
    try {
      const res = await fetch(scriptUrl, { headers: { "user-agent": BOT_UA } });
      const buf = await res.arrayBuffer();
      scriptSizeMap.set(scriptUrl, buf.byteLength);
    } catch {
      scriptSizeMap.set(scriptUrl, 0);
    }
  }

  const brokenLinks = [];
  for (const link of internalLinks) {
    const status = await fetchStatus(link);
    if (status >= 400 || status === 0) brokenLinks.push({ url: link, status });
  }

  const seoPages = pages.filter((p) => p.isSeoCandidate && p.status < 400);
  const titles = seoPages.map((p) => p.title).filter(Boolean);
  const metas = seoPages.map((p) => p.metaDescription).filter(Boolean);
  const titleSet = new Set(titles.map((t) => t.toLowerCase()));
  const metaSet = new Set(metas.map((t) => t.toLowerCase()));

  let missingTitle = 0;
  let missingMetaDescription = 0;
  let missingCanonical = 0;
  let pagesMissingH1 = 0;
  let pagesWithMultipleH1 = 0;
  let thinContentPages = 0;
  let socIndexable = false;
  let redirectChainsOverOneHop = 0;
  let securityHeaderGaps = 0;
  let imageWithoutDimsCount = 0;
  let nonLazyImageCount = 0;
  let pagesWithManyScripts = 0;
  let totalJsBytesAcrossPages = 0;
  let totalHtmlBytes = 0;
  let totalImages = 0;
  const keywordTotals = Object.fromEntries(FOCUS_KEYWORDS.map((k) => [k, 0]));
  const lsiTotals = Object.fromEntries(LSI_KEYWORDS.map((k) => [k, 0]));

  for (const page of pages) {
    if (page.isSeoCandidate) {
      if (!page.title) missingTitle += 1;
      if (!page.metaDescription) missingMetaDescription += 1;
      if (!page.canonical) missingCanonical += 1;
      if (page.h1.length === 0) pagesMissingH1 += 1;
      if (page.h1.length > 1) pagesWithMultipleH1 += 1;
      if (page.textWordCount < 180) thinContentPages += 1;
      if (page.redirectChain.length > 1) redirectChainsOverOneHop += 1;
    }

    if (page.isSeoCandidate && page.pathname.startsWith("/soc")) {
      const noindexHeader = (page.headers["x-robots-tag"] || "").toLowerCase();
      const noindexMeta = (page.metaRobots || "").toLowerCase();
      if (!noindexHeader.includes("noindex") && !noindexMeta.includes("noindex")) {
        socIndexable = true;
      }
    }

    const neededHeaders = [
      "content-security-policy",
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "permissions-policy",
    ];
    for (const h of neededHeaders) {
      if (!page.headers[h]) securityHeaderGaps += 1;
    }

    const pageJs = page.scripts.reduce((sum, scriptUrl) => {
      return sum + (scriptSizeMap.get(scriptUrl) || 0);
    }, 0);
    if (page.isSeoCandidate) {
      totalJsBytesAcrossPages += pageJs;
      totalHtmlBytes += page.htmlBytes;
      if (page.scripts.length > 12) pagesWithManyScripts += 1;
    }

    for (const img of page.images) {
      totalImages += 1;
      if (!img.width || !img.height) imageWithoutDimsCount += 1;
      if (img.loading !== "lazy") nonLazyImageCount += 1;
    }

    for (const k of FOCUS_KEYWORDS) keywordTotals[k] += page.keywordHits[k] || 0;
    for (const k of LSI_KEYWORDS) lsiTotals[k] += page.lsiHits[k] || 0;
  }

  const focusHits = Object.values(keywordTotals).filter((v) => v > 0).length;
  const keywordCoverage = focusHits / FOCUS_KEYWORDS.length;
  const seoPageCount = seoPages.length;

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    crawlDurationMs: Date.now() - start,
    crawl: {
      pagesCrawled: pages.length,
      internalLinksDiscovered: internalLinks.size,
      brokenInternalLinks: brokenLinks.length,
    },
    robots: {
      url: robotsUrl,
      exists: robotsExists,
      disallowRules: robots.disallow,
    },
    sitemap: {
      url: sitemapUrl,
      exists: sitemapExists,
      status: sitemapRes.status,
    },
    issues: {
      missingTitle,
      missingMetaDescription,
      missingCanonical,
      pagesMissingH1,
      pagesWithMultipleH1,
      thinContentPages,
      duplicateTitles: titleSet.size < titles.length,
      duplicateMetaDescriptions: metaSet.size < metas.length,
      brokenInternalLinks: brokenLinks.length,
      redirectChainsOverOneHop,
      securityHeaderGaps,
      socIndexable,
    },
    keywordCoverage,
    keywordTotals,
    lsiTotals,
    performance: {
      totalHtmlBytes,
      totalJsBytesAcrossPages,
      avgHtmlBytesPerPage: seoPageCount
        ? Math.round(totalHtmlBytes / seoPageCount)
        : 0,
      avgJsBytesPerPage: seoPageCount
        ? Math.round(totalJsBytesAcrossPages / seoPageCount)
        : 0,
      totalImages,
      imageWithoutDimsCount,
      nonLazyImageCount,
      nonLazyImagesAboveThreshold: totalImages > 0 && nonLazyImageCount / totalImages > 0.4,
      pagesWithManyScripts,
    },
    securityHeadersEvaluated: [
      "content-security-policy",
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "permissions-policy",
    ],
    brokenLinks,
    pages,
    seoPageCount,
  };

  summary.scores = scoreAudit(summary);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify({
    output: OUTPUT_PATH,
    pages: summary.crawl.pagesCrawled,
    score: summary.scores.overall,
    technical: summary.scores.technical,
    content: summary.scores.content,
    performance: summary.scores.performance,
  }, null, 2));
}

run().catch((err) => {
  console.error("SEO audit failed:", err);
  process.exit(1);
});
