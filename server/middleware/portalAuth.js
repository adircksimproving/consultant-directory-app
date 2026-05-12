import { randomBytes } from 'node:crypto';

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3001';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const sessions = new Map();

function readCookie(req, name) {
    const raw = req.headers.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const [k, v] = part.trim().split('=');
        if (k === name) return v;
    }
    return null;
}

function appBaseUrl(req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return `${proto}://${req.headers.host}`;
}

function createLocalSession(user) {
    const sid = randomBytes(32).toString('hex');
    sessions.set(sid, { user, expires: Date.now() + SESSION_TTL_MS });
    return sid;
}

function getLocalSession(sid) {
    if (!sid) return null;
    const s = sessions.get(sid);
    if (!s) return null;
    if (s.expires < Date.now()) { sessions.delete(sid); return null; }
    return s;
}

function destroyLocalSession(sid) {
    if (sid) sessions.delete(sid);
}

const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS,
});

function unauthenticated(req, res) {
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ error: 'unauthenticated' });
    }
    return res.redirect('/auth/portal');
}

export function requirePortalAuth(req, res, next) {
    const sid = readCookie(req, 'dir_sid');
    const session = getLocalSession(sid);
    if (!session) return unauthenticated(req, res);
    req.portalUser = session.user;
    next();
}

export function startHandoff(req, res) {
    const next = typeof req.query.next === 'string' ? req.query.next : '/home.html';
    const callback = `${appBaseUrl(req)}/auth/callback?next=${encodeURIComponent(next)}`;
    res.redirect(`${PORTAL_URL}/auth/handoff?return=${encodeURIComponent(callback)}`);
}

export async function handleCallback(req, res) {
    const token = typeof req.query.portal_token === 'string' ? req.query.portal_token : null;
    if (!token) return res.status(400).send('Missing portal_token');

    let portalUser;
    try {
        const exchange = await fetch(`${PORTAL_URL}/api/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        if (!exchange.ok) return res.redirect('/auth/portal');
        portalUser = await exchange.json();
    } catch (err) {
        console.error('Token exchange failed:', err.message);
        return res.status(502).send('Auth exchange failed');
    }

    const sid = createLocalSession({
        id: portalUser.id,
        username: portalUser.username,
        is_admin: !!portalUser.is_admin,
    });
    res.cookie('dir_sid', sid, cookieOptions());

    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/')
        ? req.query.next
        : '/home.html';
    res.redirect(next);
}

export function handleLogout(req, res) {
    const sid = readCookie(req, 'dir_sid');
    destroyLocalSession(sid);
    res.clearCookie('dir_sid', { path: '/' });
    res.redirect(`${PORTAL_URL}/auth/logout`);
}

export { PORTAL_URL };
