import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || join(__dirname, '../data.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT    UNIQUE NOT NULL,
        name  TEXT    NOT NULL,
        role  TEXT    NOT NULL DEFAULT 'admin'
    );
`);

db.prepare('INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)').run(
    'austin.dircks@improving.com', 'Austin Dircks', 'admin'
);

export const USER_ID = db.prepare('SELECT id FROM users WHERE email = ?')
    .get('austin.dircks@improving.com').id;

db.exec(`
    CREATE TABLE IF NOT EXISTS consultants (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT    NOT NULL,
        city      TEXT    NOT NULL,
        role_type TEXT    NOT NULL
    );
`);

const existingCount = db.prepare('SELECT COUNT(*) as count FROM consultants').get().count;
if (existingCount === 0) {
    const seedConsultants = [
        ['Jamie Rivera',    'Austin',      'Frontend Engineer'],
        ['Morgan Lee',      'Dallas',      'Backend Engineer'],
        ['Taylor Brooks',   'Chicago',     'Data Engineer'],
        ['Jordan Patel',    'Houston',     'Delivery Manager'],
        ['Casey Nguyen',    'Denver',      'Frontend Engineer'],
        ['Alex Morales',    'Atlanta',     'Backend Engineer'],
        ['Sam Okafor',      'Columbus',    'Data Engineer'],
        ['Drew Hoffman',    'Minneapolis', 'Delivery Manager'],
        ['Quinn Adeyemi',   'Detroit',     'Frontend Engineer'],
        ['Riley Castillo',  'Phoenix',     'Backend Engineer'],
    ];

    const insertConsultant = db.prepare(
        'INSERT INTO consultants (name, city, role_type) VALUES (?, ?, ?)'
    );
    const seedAll = db.transaction((rows) => {
        for (const row of rows) insertConsultant.run(...row);
    });
    seedAll(seedConsultants);
}

export default db;
