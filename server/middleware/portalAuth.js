import { randomBytes } from 'node:crypto';

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3001';
const CACHE_TTL_MS = 60 * 1000;
const portalCache = new Map();
const dirSessions = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of dirSessions) {
        if (v.expires < now) dirSessions.delete(k);
    }
}, 60 * 60 * 1000);

function readCookie(req, name) {
    const raw = req.headers.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) continue;
        const k = part.slice(0, eqIdx).trim();
        const v = part.slice(eqIdx + 1).trim();
        if (k === name) return decodeURIComponent(v);
    }
    return null;
}

async function fetchPortalMe(sid) {
    const cached = portalCache.get(sid);
    if (cached && cached.expires > Date.now()) return cached.data;
    try {
        const res = await fetch(`${PORTAL_URL}/api/me`, { headers: { cookie: `portal_sid=${sid}` } });
        if (!res.ok) {
            portalCache.set(sid, { expires: Date.now() + CACHE_TTL_MS, data: null });
            return null;
        }
        const data = await res.json();
        portalCache.set(sid, { expires: Date.now() + CACHE_TTL_MS, data });
        return data;
    } catch (err) {
        console.error('Portal /api/me fetch failed:', err.message);
        return null;
    }
}

export async function requirePortalAuth(req, res, next) {
    const dirSid = readCookie(req, 'dir_sid');
    if (dirSid) {
        const session = dirSessions.get(dirSid);
        if (session && session.expires > Date.now()) {
            req.portalUser = session.user;
            return next();
        }
        dirSessions.delete(dirSid);
    }

    // Fallback: portal_sid works in local dev where both apps share localhost domain
    const portalSid = readCookie(req, 'portal_sid');
    if (!portalSid) return unauthenticated(req, res);
    const portal = await fetchPortalMe(portalSid);
    if (!portal) return unauthenticated(req, res);
    req.portalUser = portal;
    next();
}

export function createDirSession(res, user) {
    const token = randomBytes(32).toString('hex');
    const isProd = process.env.NODE_ENV === 'production';
    dirSessions.set(token, { user, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    res.cookie('dir_sid', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}

function unauthenticated(req, res) {
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ error: 'unauthenticated' });
    }
    return res.redirect(PORTAL_URL);
}

export { PORTAL_URL };
