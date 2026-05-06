const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3001';
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function readPortalSid(req) {
    const raw = req.headers.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const [k, v] = part.trim().split('=');
        if (k === 'portal_sid') return v;
    }
    return null;
}

async function fetchPortalMe(sid) {
    const cached = cache.get(sid);
    if (cached && cached.expires > Date.now()) return cached.data;
    try {
        const res = await fetch(`${PORTAL_URL}/api/me`, { headers: { cookie: `portal_sid=${sid}` } });
        if (!res.ok) {
            cache.set(sid, { expires: Date.now() + CACHE_TTL_MS, data: null });
            return null;
        }
        const data = await res.json();
        cache.set(sid, { expires: Date.now() + CACHE_TTL_MS, data });
        return data;
    } catch (err) {
        console.error('Portal /api/me fetch failed:', err.message);
        return null;
    }
}

export async function requirePortalAuth(req, res, next) {
    const sid = readPortalSid(req);
    if (!sid) return unauthenticated(req, res);
    const portal = await fetchPortalMe(sid);
    if (!portal) return unauthenticated(req, res);
    req.portalUser = portal;
    next();
}

function unauthenticated(req, res) {
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ error: 'unauthenticated' });
    }
    return res.redirect(PORTAL_URL);
}

export { PORTAL_URL };
