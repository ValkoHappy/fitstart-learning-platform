PRAGMA foreign_keys = ON;
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE applications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), course_name TEXT NOT NULL DEFAULT 'Как стать тренером', status TEXT NOT NULL DEFAULT 'pending', comment TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX one_pending_application ON applications(user_id) WHERE status = 'pending';
