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

// Migrations
const cols = db.prepare('PRAGMA table_info(consultants)').all().map(c => c.name);
if (!cols.includes('title')) db.exec(`ALTER TABLE consultants ADD COLUMN title TEXT NOT NULL DEFAULT ''`);
if (!cols.includes('phone')) db.exec(`ALTER TABLE consultants ADD COLUMN phone TEXT NOT NULL DEFAULT ''`);
if (!cols.includes('state')) db.exec(`ALTER TABLE consultants ADD COLUMN state TEXT NOT NULL DEFAULT ''`);

const existingCount = db.prepare('SELECT COUNT(*) as count FROM consultants').get().count;
if (existingCount === 0) {
    const seedConsultants = [
        ['Jamie Rivera',   'Austin',      'TX', 'Frontend Engineer',  'Senior Consultant',              '(512) 555-0142'],
        ['Morgan Lee',     'Dallas',      'TX', 'Backend Engineer',   'Principal Consultant',           '(214) 555-0187'],
        ['Taylor Brooks',  'Chicago',     'IL', 'Data Engineer',      'Senior Consultant',              '(312) 555-0163'],
        ['Jordan Patel',   'Houston',     'TX', 'Delivery Manager',   'Vice President of Consulting',   '(713) 555-0129'],
        ['Casey Nguyen',   'Denver',      'CO', 'Frontend Engineer',  'Consultant',                     '(720) 555-0174'],
        ['Alex Morales',   'Atlanta',     'GA', 'Backend Engineer',   'Principal Consultant',           '(404) 555-0156'],
        ['Sam Okafor',     'Columbus',    'OH', 'Data Engineer',      'Senior Consultant',              '(614) 555-0198'],
        ['Drew Hoffman',   'Minneapolis', 'MN', 'Delivery Manager',   'Vice President of Consulting',   '(612) 555-0111'],
        ['Quinn Adeyemi',  'Detroit',     'MI', 'Frontend Engineer',  'Consultant',                     '(313) 555-0145'],
        ['Riley Castillo', 'Phoenix',     'AZ', 'Backend Engineer',   'Senior Consultant',              '(602) 555-0133'],
    ];

    const insertConsultant = db.prepare(
        'INSERT INTO consultants (name, city, state, role_type, title, phone) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const seedAll = db.transaction((rows) => {
        for (const row of rows) insertConsultant.run(...row);
    });
    seedAll(seedConsultants);
} else {
    // Backfill new columns for existing seed rows that have empty values
    const needsBackfill = db.prepare(`SELECT COUNT(*) as count FROM consultants WHERE title = ''`).get().count;
    if (needsBackfill > 0) {
        const backfill = [
            ['Senior Consultant',            '(512) 555-0142', 'TX', 'Jamie Rivera'],
            ['Principal Consultant',         '(214) 555-0187', 'TX', 'Morgan Lee'],
            ['Senior Consultant',            '(312) 555-0163', 'IL', 'Taylor Brooks'],
            ['Vice President of Consulting', '(713) 555-0129', 'TX', 'Jordan Patel'],
            ['Consultant',                   '(720) 555-0174', 'CO', 'Casey Nguyen'],
            ['Principal Consultant',         '(404) 555-0156', 'GA', 'Alex Morales'],
            ['Senior Consultant',            '(614) 555-0198', 'OH', 'Sam Okafor'],
            ['Vice President of Consulting', '(612) 555-0111', 'MN', 'Drew Hoffman'],
            ['Consultant',                   '(313) 555-0145', 'MI', 'Quinn Adeyemi'],
            ['Senior Consultant',            '(602) 555-0133', 'AZ', 'Riley Castillo'],
        ];
        const update = db.prepare(`UPDATE consultants SET title = ?, phone = ?, state = ? WHERE name = ?`);
        const updateAll = db.transaction((rows) => {
            for (const row of rows) update.run(...row);
        });
        updateAll(backfill);
    }
}

export default db;
