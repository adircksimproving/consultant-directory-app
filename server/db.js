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

export default db;
