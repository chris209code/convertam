// Fetching a URL a site visitor pastes in is an SSRF risk by nature — a
// malicious "job posting URL" could point at localhost, a private network
// address, or a cloud metadata endpoint (e.g. 169.254.169.254) to probe or
// attack infrastructure this server can reach but the internet can't.
// Every hostname (the original one AND every redirect hop, since DNS can
// resolve differently or a redirect can retarget entirely) is resolved and
// checked against private/reserved ranges before it's ever fetched.
//
// Deliberately built on node:http/node:https rather than the global fetch:
// fetch's `redirect: 'manual'` mode still lets fetch's own internal
// networking stack (undici) re-resolve DNS itself at actual-connect time,
// which happens strictly AFTER this module's own dns.lookup-based safety
// check for the same hop — a classic TOCTOU/DNS-rebinding gap for a domain
// with a very low TTL that deliberately answers differently the second
// time. Passing a `lookup` override to http(s).request pins the real TCP
// connection to the EXACT addresses already validated, so there is no
// second resolution left to diverge at.
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function inIpv4Range(intIp, base, prefixLen) {
  const baseInt = ipv4ToInt(base);
  const mask = prefixLen === 0 ? 0 : (0xffffffff << (32 - prefixLen)) >>> 0;
  return (intIp & mask) === (baseInt & mask);
}

const IPV4_BLOCKED_RANGES = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

function isPrivateOrReservedIp(ip) {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique local
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10 link-local
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }
  const intIp = ipv4ToInt(ip);
  if (intIp === null) return true; // unparseable — fail closed
  return IPV4_BLOCKED_RANGES.some(([base, prefix]) => inIpv4Range(intIp, base, prefix));
}

// Resolves `hostname` ONCE and validates every returned address — the
// caller must reuse this exact result (via pinnedLookup below) for the
// actual connection rather than resolving again.
async function resolveAndValidateHost(hostname) {
  if (['localhost', 'localhost.localdomain'].includes(hostname.toLowerCase()) || hostname.toLowerCase().endsWith('.local')) {
    throw new Error('blocked-host');
  }
  const records = await dns.promises.lookup(hostname, { all: true });
  if (records.length === 0 || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new Error('blocked-host');
  }
  return records;
}

// A dns.lookup-compatible function that always hands back the SAME
// pre-validated address list, ignoring whatever it's asked to resolve —
// this is what actually pins the connection. Note this only changes which
// IP the TCP socket connects to; Node still derives TLS SNI and
// certificate-hostname verification from the original hostname passed to
// https.request, so HTTPS validation is unaffected.
function pinnedLookup(records) {
  return (hostname, options, callback) => {
    if (options && options.all) return callback(null, records.map((r) => ({ address: r.address, family: r.family })));
    callback(null, records[0].address, records[0].family);
  };
}

function requestOnce(parsedUrl, records, { timeoutMs, userAgent }) {
  return new Promise((resolve, reject) => {
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.request(parsedUrl, {
      method: 'GET',
      lookup: pinnedLookup(records),
      headers: {
        'User-Agent': userAgent || 'Mozilla/5.0 (compatible; ConvertamJobImport/1.0; +https://www.convertam.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    }, (res) => resolve(res));
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

// Reads the response body up to a byte cap rather than trusting
// Content-Length (which can be absent or wrong) — protects against a
// malicious or misconfigured server streaming an unbounded response.
function readBodyWithLimit(res, maxBytes) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    res.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) { chunks.push(chunk.subarray(0, Math.max(0, maxBytes - (received - chunk.length)))); res.destroy(); return; }
      chunks.push(chunk);
    });
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('error', reject);
  });
}

// Fetches `url` with SSRF protection, a manual (validated) redirect chain,
// a request timeout, and a response-size cap. Throws a plain Error with a
// short `.reason` code on any failure — the caller decides how to present
// that to the user (this module has no opinion on UX copy).
export async function safeFetchText(url, { timeoutMs = 8000, maxBytes = 3 * 1024 * 1024, maxRedirects = 5, userAgent } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed;
    try {
      parsed = new URL(current);
    } catch {
      const err = new Error('Invalid URL'); err.reason = 'invalid-url'; throw err;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      const err = new Error('Unsupported protocol'); err.reason = 'invalid-url'; throw err;
    }
    let records;
    try {
      records = await resolveAndValidateHost(parsed.hostname);
    } catch {
      const err = new Error('Host not allowed'); err.reason = 'blocked-host'; throw err;
    }

    let res;
    try {
      res = await requestOnce(parsed, records, { timeoutMs, userAgent });
    } catch (err) {
      const wrapped = new Error('Fetch failed'); wrapped.reason = err.message === 'timeout' ? 'timeout' : 'network'; throw wrapped;
    }

    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
      res.resume(); // discard the redirect body rather than leaving the socket dangling
      const location = res.headers.location;
      if (!location) { const err = new Error('Redirect with no location'); err.reason = 'network'; throw err; }
      current = new URL(location, parsed).toString();
      continue;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.resume();
      const err = new Error(`HTTP ${res.statusCode}`); err.reason = res.statusCode === 404 ? 'not-found' : 'blocked'; throw err;
    }
    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      res.resume();
      const err = new Error('Not an HTML page'); err.reason = 'not-html'; throw err;
    }
    return readBodyWithLimit(res, maxBytes);
  }
  const err = new Error('Too many redirects'); err.reason = 'network'; throw err;
}
