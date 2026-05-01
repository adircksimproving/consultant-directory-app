import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(join(__dirname, '..')));

app.get('/', (req, res) => {
    res.redirect('/home.html');
});

app.get('/api/consultants', (req, res) => {
    const consultants = db.prepare(`
        SELECT id, name, city, state, role_type, title, phone
        FROM consultants
        ORDER BY substr(name, instr(name, ' ') + 1)
    `).all();
    res.json(consultants);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Directory running at http://localhost:${PORT}`);
});


