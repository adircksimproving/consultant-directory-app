import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { requirePortalAuth, startHandoff, handleCallback, handleLogout } from './middleware/portalAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/auth/portal', startHandoff);
app.get('/auth/callback', handleCallback);
app.get('/auth/logout', handleLogout);

app.get('/api/me', requirePortalAuth, (req, res) => {
    res.json({
        portal_user_id: req.portalUser.id,
        username: req.portalUser.username,
        is_admin: req.portalUser.is_admin,
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
