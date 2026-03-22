ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student';

-- Initialize existing users with username
UPDATE users SET username = name WHERE username IS NULL;

-- Ensure usernames are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
