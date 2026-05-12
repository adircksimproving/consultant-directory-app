import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { requirePortalAuth, createDirSession, PORTAL_URL } from './middleware/portalAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/auth/portal', (req, res) => {
    const callbackUrl = `${req.protocol}://${req.get('host')}/auth/callback`;
    res.redirect(`${PORTAL_URL}?return_url=${encodeURIComponent(callbackUrl)}`);
});

app.get('/auth/callback', async (req, res) => {
    const { auth_token } = req.query;
    if (!auth_token) return res.redirect('/');

    try {
        const response = await fetch(`${PORTAL_URL}/api/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: auth_token }),
        });
        if (!response.ok) return res.redirect('/');
        const user = await response.json();
        createDirSession(res, user);
        res.redirect('/home.html');
    } catch (err) {
        console.error('Auth callback failed:', err.message);
        res.redirect('/');
    }
});

app.get('/api/me', requirePortalAuth, (req, res) => {
    res.json({
        portal_user_id: req.portalUser.id,
        username: req.portalUser.username,
        is_admin: req.portalUser.is_admin,
        impersonating: req.portalUser.impersonating,
        impersonator: req.portalUser.impersonator,
    });
});

app.get('/api/consultants', requirePortalAuth, (req, res) => {
    const consultants = db.prepare(`
        SELECT id, name, city, state, role_type, title, phone
        FROM consultants
        ORDER BY substr(name, instr(name, ' ') + 1)
    `).all();
    res.json(consultants);
});

app.use(express.static(join(__dirname, '..')));

app.get('/', (req, res) => {
    res.redirect('/home.html');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Directory running at http://localhost:${PORT}`);
});
